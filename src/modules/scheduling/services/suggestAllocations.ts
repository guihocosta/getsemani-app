import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { activeMemberIds } from "@/modules/identity/services/memberships";
import { usersUnavailableAt } from "@/modules/availability/services/checkConflict";
import { capableUserIdsForRole } from "@/modules/ministries/services/userSkills";
import { loadByPerson, attendanceRows } from "@/modules/reports/services/reports";
import { attendanceWindow } from "@/modules/reports/domain/attendance";
import { fmtDateTime } from "@/lib/time";
import { planSuggestions } from "@/modules/scheduling/domain/suggest";
import { notifyIfPublished } from "./notifyIfPublished";

export class OccurrencePast extends Error {
  constructor() {
    super("OCCURRENCE_PAST");
  }
}

const LOAD_WINDOW_MS = 30 * 864e5;

// Lider preenche as vagas abertas de uma data pela regra de planSuggestions.
// Comando explicito, uma data por vez (AD-004). Alocacoes entram PENDING, como
// na alocacao manual; corrida de vaga (P2002) conta como nao preenchida.
export async function suggestAllocations(occurrenceId: string, now = new Date()) {
  const occurrence = await prisma.occurrence.findUniqueOrThrow({
    where: { id: occurrenceId },
    include: { schedule: true, slots: { include: { role: true, allocation: true } } },
  });
  const ministryId = occurrence.schedule.ministryId;
  await requireLeaderOf(ministryId);
  if (occurrence.date <= now) throw new OccurrencePast();

  const openSlots = occurrence.slots.filter((s) => s.active && !s.allocation);
  if (openSlots.length === 0) return { filled: 0, unfilled: 0 };

  const memberIds = await activeMemberIds(ministryId);
  const roleIds = [...new Set(openSlots.map((s) => s.roleId))];
  const { from: faltasFrom, to: faltasTo } = attendanceWindow(now);

  // Carga numa janela em torno da data: conta escalas futuras ja marcadas, entao
  // sugerir datas seguidas nao escolhe sempre a mesma pessoa.
  const [load, attendance, unavailable, capableSets] = await Promise.all([
    loadByPerson(
      new Date(occurrence.date.getTime() - LOAD_WINDOW_MS),
      new Date(occurrence.date.getTime() + LOAD_WINDOW_MS),
      [ministryId],
    ),
    attendanceRows(faltasFrom, faltasTo, [ministryId]),
    usersUnavailableAt(memberIds, occurrence.date),
    Promise.all(roleIds.map((roleId) => capableUserIdsForRole(roleId))),
  ]);

  const loadOf = new Map(load.map((l) => [l.userId, l.count]));
  const faltasOf = new Map<string, number>();
  for (const row of attendance) {
    if (!row.checkedIn) faltasOf.set(row.userId, (faltasOf.get(row.userId) ?? 0) + 1);
  }

  const plan = planSuggestions({
    slots: openSlots.map((s) => ({ slotId: s.id, roleId: s.roleId })),
    candidates: memberIds.map((userId) => ({
      userId,
      load: loadOf.get(userId) ?? 0,
      faltas: faltasOf.get(userId) ?? 0,
      unavailable: unavailable.has(userId),
    })),
    capableByRole: new Map(roleIds.map((roleId, i) => [roleId, capableSets[i]])),
    alreadyAllocated: new Set(
      occurrence.slots.map((s) => s.allocation?.userId).filter((id): id is string => !!id),
    ),
  });

  const roleNameOf = new Map(openSlots.map((s) => [s.id, s.role.name]));
  let filled = 0;
  let unfilled = plan.unfilled.length;

  for (const pick of plan.picks) {
    try {
      const alloc = await prisma.allocation.create({
        data: { slotId: pick.slotId, userId: pick.userId, source: "LEADER", status: "PENDING" },
      });
      filled++;
      // notificacao nunca lanca - falha de push nao desfaz a alocacao ja gravada.
      await notifyIfPublished(occurrence.published, {
        userId: pick.userId,
        type: "ASSIGNMENT",
        dedupeKey: `assign:${alloc.id}`,
        title: "Você foi escalado",
        body: `${roleNameOf.get(pick.slotId)} · ${fmtDateTime(occurrence.date)}`,
        url: "/",
        occurrenceId: occurrence.id,
      });
    } catch (e: unknown) {
      if ((e as { code?: string }).code === "P2002") {
        unfilled++;
        continue;
      }
      throw e;
    }
  }

  return { filled, unfilled };
}
