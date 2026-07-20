import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { hasUnavailabilityConflict } from "@/modules/availability/services/checkConflict";
import { SlotTaken } from "./allocateVolunteer";

export class NotEligible extends Error {
  constructor() {
    super("NOT_ELIGIBLE");
  }
}

// Voluntario se auto-aloca numa vaga livre. Unique slotId resolve corrida (FR-008).
// Retorna { warnedUnavailability } quando conflita com a propria indisponibilidade (FR-013).
export async function selfAllocate(params: { slotId: string; acknowledge?: boolean }) {
  const user = await requireUser();
  const slot = await prisma.slot.findUniqueOrThrow({
    where: { id: params.slotId },
    include: {
      occurrence: { include: { schedule: true } },
      allocation: true,
      role: true,
    },
  });

  // elegibilidade: membro do ministerio
  const member = await prisma.membership.findFirst({
    where: { userId: user.id, ministryId: slot.occurrence.schedule.ministryId },
  });
  if (!member) throw new NotEligible();

  if (slot.allocation) throw new SlotTaken();

  const conflict = await hasUnavailabilityConflict(user.id, slot.occurrence.date);
  if (conflict && !params.acknowledge) {
    return { warnedUnavailability: true as const };
  }

  try {
    const alloc = await prisma.allocation.create({
      data: { slotId: params.slotId, userId: user.id, source: "SELF" },
    });
    return { allocation: alloc };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") throw new SlotTaken();
    throw e;
  }
}
