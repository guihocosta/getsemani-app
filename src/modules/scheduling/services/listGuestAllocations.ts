import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/time";

export type GuestAllocationItem = {
  allocationId: string;
  slotId: string;
  occurrenceId: string;
  guestName: string;
  role: string;
  ministryName: string;
  when: string;
};

// Alocacoes de pessoas sem conta (guest) nos ministerios informados, em
// ocorrencias ativas — usado na tela de gestao pra vincular manualmente a um
// usuario real depois que a pessoa se cadastra.
export async function listGuestAllocations(ministryIds: string[]): Promise<GuestAllocationItem[]> {
  if (ministryIds.length === 0) return [];

  const allocations = await prisma.allocation.findMany({
    where: {
      userId: null,
      slot: {
        occurrence: {
          status: "ACTIVE",
          schedule: { ministryId: { in: ministryIds } },
        },
      },
    },
    include: {
      slot: {
        include: {
          role: true,
          occurrence: { include: { schedule: { include: { ministry: true } } } },
        },
      },
    },
  });

  return allocations
    .sort((a, b) => a.slot.occurrence.date.getTime() - b.slot.occurrence.date.getTime())
    .map((a) => ({
      allocationId: a.id,
      slotId: a.slotId,
      occurrenceId: a.slot.occurrenceId,
      guestName: a.guestName ?? "",
      role: a.slot.role.name,
      ministryName: a.slot.occurrence.schedule.ministry.name,
      when: fmtDateTime(a.slot.occurrence.date),
    }));
}
