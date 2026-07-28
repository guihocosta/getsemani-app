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
export class NoAllocation extends Error {
  constructor() {
    super("NO_ALLOCATION");
  }
}

export function decideAllocate(params: {
  hasAllocation: boolean;
  hasConflict: boolean;
  override: boolean;
}): "OK" | "SLOT_TAKEN" | "UNAVAILABILITY_BLOCKED" {
  if (params.hasAllocation) return "SLOT_TAKEN";
  if (params.hasConflict && !params.override) return "UNAVAILABILITY_BLOCKED";
  return "OK";
}

export function decideReassign(params: {
  hasAllocation: boolean;
  currentUserId: string | null;
  targetUserId: string;
  hasConflict: boolean;
  override: boolean;
}): "OK" | "NO_ALLOCATION" | "SAME_USER" | "UNAVAILABILITY_BLOCKED" {
  if (!params.hasAllocation) return "NO_ALLOCATION";
  if (params.currentUserId === params.targetUserId) return "SAME_USER";
  if (params.hasConflict && !params.override) return "UNAVAILABILITY_BLOCKED";
  return "OK";
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

  const conflict = await hasUnavailabilityConflict(params.userId, slot.occurrence.date);
  const decision = decideAllocate({
    hasAllocation: !!slot.allocation,
    hasConflict: conflict,
    override: !!params.override,
  });
  if (decision === "SLOT_TAKEN") throw new SlotTaken();
  if (decision === "UNAVAILABILITY_BLOCKED") throw new UnavailabilityBlocked();

  let alloc;
  try {
    alloc = await prisma.allocation.create({
      data: {
        slotId: params.slotId,
        userId: params.userId,
        source: "LEADER",
        overrideUnavailability: conflict && !!params.override,
        status: "PENDING",
      },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") throw new SlotTaken();
    throw e;
  }

  // notifyUser nunca lanca — uma falha de notificacao nao pode reverter uma
  // alocacao ja gravada com sucesso.
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

  const conflict = await hasUnavailabilityConflict(params.userId, slot.occurrence.date);
  const decision = decideReassign({
    hasAllocation: !!slot.allocation,
    currentUserId: slot.allocation?.userId ?? null,
    targetUserId: params.userId,
    hasConflict: conflict,
    override: !!params.override,
  });
  if (decision === "NO_ALLOCATION") throw new NoAllocation();
  if (decision === "SAME_USER") return slot.allocation!;
  if (decision === "UNAVAILABILITY_BLOCKED") throw new UnavailabilityBlocked();

  const previousUserId = slot.allocation!.userId;
  const previousAllocationId = slot.allocation!.id;

  let alloc;
  try {
    alloc = await prisma.$transaction(async (tx) => {
      await tx.allocation.delete({ where: { id: previousAllocationId } });
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
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") throw new SlotTaken();
    throw e;
  }

  if (previousUserId) {
    await notifyUser({
      userId: previousUserId,
      type: "ASSIGNMENT",
      dedupeKey: `unassign:${previousAllocationId}`,
      title: "Você foi removido de uma escala",
      body: `${slot.role.name} · ${fmtDateTime(slot.occurrence.date)}`,
      url: "/",
      occurrenceId: slot.occurrenceId,
    });
  }
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
