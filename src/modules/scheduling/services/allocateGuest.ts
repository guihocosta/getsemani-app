import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { SlotTaken } from "./allocateVolunteer";

export function decideAllocateGuest(params: { hasAllocation: boolean }): "OK" | "SLOT_TAKEN" {
  if (params.hasAllocation) return "SLOT_TAKEN";
  return "OK";
}

// Lider escala alguem sem conta (guestName + CPF opcional). Sem checagem de
// indisponibilidade (nao ha usuario) e sem notifyUser (guest nao tem push) —
// vira notificacao real so quando linkGuestAllocation vincular a um usuario.
export async function allocateGuest(params: { slotId: string; guestName: string; guestCpf?: string }) {
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
        guestCpf: params.guestCpf ?? null,
        source: "LEADER",
        status: "PENDING",
      },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") throw new SlotTaken();
    throw e;
  }
}
