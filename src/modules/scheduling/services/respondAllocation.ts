import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { notifyUser } from "@/modules/notifications/services/notify";
import { fmtDateTime, dateKey } from "@/lib/time";
import { NotOwner } from "./swap";

export class CheckInNotToday extends Error {
  constructor() {
    super("CHECK_IN_NOT_TODAY");
  }
}

async function ownedAllocation(allocationId: string, userId: string) {
  const alloc = await prisma.allocation.findUniqueOrThrow({
    where: { id: allocationId },
    include: {
      slot: { include: { role: true, occurrence: { include: { schedule: { include: { ministry: true } } } } } },
    },
  });
  if (alloc.userId !== userId) throw new NotOwner();
  return alloc;
}

// Voluntario confirma uma escala que o lider criou como pendente.
export async function confirmAllocation(params: { allocationId: string }) {
  const user = await requireUser();
  await ownedAllocation(params.allocationId, user.id);

  return prisma.allocation.update({
    where: { id: params.allocationId },
    data: { status: "CONFIRMED", respondedAt: new Date() },
  });
}

// Voluntario recusa: a alocacao e removida (nao guardamos DECLINED) pra vaga
// livre continuar sendo so "allocation == null" em todo o resto do app
// (Vagas, relatorios, calendario) sem precisar tratar um terceiro estado.
export async function declineAllocation(params: { allocationId: string }) {
  const user = await requireUser();
  const alloc = await ownedAllocation(params.allocationId, user.id);

  await prisma.allocation.delete({ where: { id: params.allocationId } });

  const ministryId = alloc.slot.occurrence.schedule.ministryId;
  const leaders = await prisma.membership.findMany({
    where: { ministryId, role: "LEADER", status: "ACTIVE" },
    select: { userId: true },
  });

  await Promise.all(
    leaders.map((l) =>
      notifyUser({
        userId: l.userId,
        type: "SWAP",
        dedupeKey: `decline:${params.allocationId}:${l.userId}`,
        title: "Voluntário recusou uma escala",
        body: `${alloc.slot.occurrence.schedule.ministry.name} · ${alloc.slot.role.name} · ${fmtDateTime(alloc.slot.occurrence.date)}`,
        url: "/escalas",
        occurrenceId: alloc.slot.occurrenceId,
      }),
    ),
  );

  return { ok: true as const };
}

// Voluntario confirma presenca no proprio dia da escala.
export async function checkInAllocation(params: { allocationId: string }) {
  const user = await requireUser();
  const alloc = await ownedAllocation(params.allocationId, user.id);

  if (dateKey(alloc.slot.occurrence.date) !== dateKey(new Date())) {
    throw new CheckInNotToday();
  }

  return prisma.allocation.update({
    where: { id: params.allocationId },
    data: { checkedInAt: new Date() },
  });
}
