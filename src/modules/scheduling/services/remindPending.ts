import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { notifyUser, hasPushDevice, lastNotificationAt } from "@/modules/notifications/services/notify";
import { reminderCopy } from "@/modules/notifications/domain/reminders";
import { fmtDateTime } from "@/lib/time";
import {
  canRemindOccurrence,
  remindableAllocations,
  isRecentReminder,
  manualReminderKey,
  manualReminderPrefix,
  type RemindCounts,
} from "../domain/remind";

export class NotRemindable extends Error {
  constructor() {
    super("NOT_REMINDABLE");
  }
}

// Lider lembra, por push, quem ainda nao confirmou numa data: todos os
// pendentes ou so a alocacao pedida. Nao muda nada de dominio.
export async function remindPending(
  params: { occurrenceId: string; allocationId?: string },
  now: Date = new Date(),
): Promise<RemindCounts> {
  const occ = await prisma.occurrence.findUnique({
    where: { id: params.occurrenceId },
    include: {
      schedule: { include: { ministry: true } },
      slots: { include: { role: true, allocation: true } },
    },
  });
  if (!occ) throw new NotRemindable();
  await requireLeaderOf(occ.schedule.ministryId);
  if (!canRemindOccurrence(occ, now)) throw new NotRemindable();

  const roleByAllocation = new Map(
    occ.slots.flatMap((s) => (s.allocation ? [[s.allocation.id, s.role.name] as const] : [])),
  );
  let alvos = remindableAllocations(occ.slots);
  if (params.allocationId) {
    alvos = alvos.filter((a) => a.id === params.allocationId);
    if (alvos.length === 0) throw new NotRemindable();
  }

  const counts: RemindCounts = { enviados: 0, recentes: 0, semDispositivo: 0 };
  for (const a of alvos) {
    if (!(await hasPushDevice(a.userId))) {
      counts.semDispositivo++;
      continue;
    }
    if (isRecentReminder(await lastNotificationAt(manualReminderPrefix(a.id)), now)) {
      counts.recentes++;
      continue;
    }
    const { title, body } = reminderCopy({
      stage: "vespera",
      hasSwapOpen: false,
      isPending: true,
      ministry: occ.schedule.ministry.name,
      role: roleByAllocation.get(a.id) ?? "",
      date: fmtDateTime(occ.date),
    });
    const result = await notifyUser({
      userId: a.userId,
      type: "REMINDER",
      dedupeKey: manualReminderKey(a.id, now),
      title,
      body,
      url: "/",
      occurrenceId: occ.id,
    });
    // "duplicate"/"failed" aqui e o pedido que perdeu a corrida pela chave da hora.
    if (result === "sent") counts.enviados++;
    else counts.recentes++;
  }
  return counts;
}
