import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { notifyUser } from "@/modules/notifications/services/notify";
import { fmtDateTime } from "@/lib/time";
import { SlotTaken, NoAllocation } from "./allocateVolunteer";

export function decideAllocateGuest(params: { hasAllocation: boolean }): "OK" | "SLOT_TAKEN" {
  if (params.hasAllocation) return "SLOT_TAKEN";
  return "OK";
}

// Lider escala alguem sem conta (so o nome). Sem checagem de indisponibilidade
// (nao ha usuario) e sem notifyUser (guest nao tem push) — vira notificacao
// real so quando linkGuestAllocation vincular a um usuario.
export async function allocateGuest(params: { slotId: string; guestName: string }) {
  const slot = await prisma.slot.findUniqueOrThrow({
    where: { id: params.slotId },
    include: { occurrence: { include: { schedule: true } }, allocation: true },
  });
  await requireLeaderOf(slot.occurrence.schedule.ministryId);

  if (decideAllocateGuest({ hasAllocation: !!slot.allocation }) === "SLOT_TAKEN") {
    throw new SlotTaken();
  }

  try {
    return await prisma.allocation.create({
      data: {
        slotId: params.slotId,
        guestName: params.guestName,
        source: "LEADER",
        status: "PENDING",
      },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") throw new SlotTaken();
    throw e;
  }
}

// Lider troca quem esta numa vaga ja preenchida por alguem sem conta (espelha
// reassignAllocation). Sem checagem de indisponibilidade nem notificacao pro
// novo ocupante (guest nao tem push); notifica quem saiu, se tinha conta.
export async function reassignToGuest(params: { slotId: string; guestName: string }) {
  const slot = await prisma.slot.findUniqueOrThrow({
    where: { id: params.slotId },
    include: {
      occurrence: { include: { schedule: true } },
      allocation: { include: { swapRequest: true } },
      role: true,
    },
  });
  await requireLeaderOf(slot.occurrence.schedule.ministryId);

  if (!slot.allocation) throw new NoAllocation();

  const previousUserId = slot.allocation.userId;
  const previousAllocationId = slot.allocation.id;
  const previousSwapRequest = slot.allocation.swapRequest;

  let alloc;
  try {
    alloc = await prisma.$transaction(async (tx) => {
      await tx.allocation.delete({ where: { id: previousAllocationId } });
      return tx.allocation.create({
        data: {
          slotId: params.slotId,
          guestName: params.guestName,
          source: "LEADER",
          status: "PENDING",
        },
      });
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") throw new SlotTaken();
    throw e;
  }

  if (previousUserId && previousSwapRequest?.status === "OPEN") {
    await notifyUser({
      userId: previousUserId,
      type: "SWAP",
      dedupeKey: `swap-ended:${previousSwapRequest.id}`,
      title: "Seu pedido de troca foi encerrado",
      body: `O líder alterou a escala · ${slot.role.name} · ${fmtDateTime(slot.occurrence.date)}`,
      url: "/",
      occurrenceId: slot.occurrenceId,
    });
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

  return alloc;
}
