import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { hasUnavailabilityConflict } from "@/modules/availability/services/checkConflict";
import { notifyUser } from "@/modules/notifications/services/notify";
import { fmtDateTime } from "@/lib/time";

export class UnavailabilityBlocked extends Error {
  constructor() {
    super("UNAVAILABILITY_BLOCKED");
  }
}
export class SlotTaken extends Error {
  constructor() {
    super("SLOT_TAKEN");
  }
}

// Lider aloca voluntario num slot. Bloqueia se indisponivel, salvo override explicito (FR-012).
export async function allocateVolunteer(params: {
  slotId: string;
  userId: string;
  override?: boolean;
}) {
  const slot = await prisma.slot.findUniqueOrThrow({
    where: { id: params.slotId },
    include: { occurrence: { include: { schedule: true } }, allocation: true, role: true },
  });
  await requireLeaderOf(slot.occurrence.schedule.ministryId);

  if (slot.allocation) throw new SlotTaken();

  const conflict = await hasUnavailabilityConflict(params.userId, slot.occurrence.date);
  if (conflict && !params.override) throw new UnavailabilityBlocked();

  try {
    const alloc = await prisma.allocation.create({
      data: {
        slotId: params.slotId,
        userId: params.userId,
        source: "LEADER",
        overrideUnavailability: conflict && !!params.override,
        status: "PENDING",
      },
    });

    await notifyUser({
      userId: params.userId,
      type: "ASSIGNMENT",
      dedupeKey: `assign:${alloc.id}`,
      title: "Você foi escalado",
      body: `${slot.role.name} · ${fmtDateTime(slot.occurrence.date)}`,
      url: "/",
      occurrenceId: slot.occurrenceId,
    });
    return alloc;
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") throw new SlotTaken();
    throw e;
  }
}

// Lider troca quem esta alocado numa vaga ja preenchida (diferente de
// allocateVolunteer, que so preenche vaga vazia e trava com SlotTaken).
// Remove a allocation antiga (cascade tira SwapRequest aberto, se houver) e
// cria uma nova PENDING sem herdar check-in — mesma regra de claimSwap.
export async function reassignAllocation(params: {
  slotId: string;
  userId: string;
  override?: boolean;
}) {
  const slot = await prisma.slot.findUniqueOrThrow({
    where: { id: params.slotId },
    include: { occurrence: { include: { schedule: true } }, allocation: true, role: true },
  });
  await requireLeaderOf(slot.occurrence.schedule.ministryId);

  if (!slot.allocation) throw new Error("NO_ALLOCATION");
  if (slot.allocation.userId === params.userId) return slot.allocation;

  const conflict = await hasUnavailabilityConflict(params.userId, slot.occurrence.date);
  if (conflict && !params.override) throw new UnavailabilityBlocked();

  const previousUserId = slot.allocation.userId;

  const alloc = await prisma.$transaction(async (tx) => {
    await tx.allocation.delete({ where: { id: slot.allocation!.id } });
    return tx.allocation.create({
      data: {
        slotId: params.slotId,
        userId: params.userId,
        source: "LEADER",
        overrideUnavailability: conflict && !!params.override,
        status: "PENDING",
      },
    });
  });

  await notifyUser({
    userId: previousUserId,
    type: "ASSIGNMENT",
    dedupeKey: `unassign:${slot.allocation.id}`,
    title: "Você foi removido de uma escala",
    body: `${slot.role.name} · ${fmtDateTime(slot.occurrence.date)}`,
    url: "/",
    occurrenceId: slot.occurrenceId,
  });
  await notifyUser({
    userId: params.userId,
    type: "ASSIGNMENT",
    dedupeKey: `assign:${alloc.id}`,
    title: "Você foi escalado",
    body: `${slot.role.name} · ${fmtDateTime(slot.occurrence.date)}`,
    url: "/",
    occurrenceId: slot.occurrenceId,
  });

  return alloc;
}
