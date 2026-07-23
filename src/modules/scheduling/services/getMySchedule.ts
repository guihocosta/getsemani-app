import { prisma } from "@/lib/prisma";
import type { AllocationStatus } from "@prisma/client";

export type UpcomingItem = {
  allocationId: string;
  date: Date;
  ministry: string;
  role: string;
  hasSwapOpen: boolean;
  status: AllocationStatus;
  checkedInAt: Date | null;
};

// Proximas escalas do usuario (ocorrencias ativas, futuras), ordem cronologica.
export async function getMySchedule(userId: string, from = new Date()): Promise<UpcomingItem[]> {
  const allocs = await prisma.allocation.findMany({
    where: {
      userId,
      slot: { occurrence: { status: "ACTIVE", date: { gte: from } } },
    },
    include: {
      swapRequest: true,
      slot: {
        include: {
          role: true,
          occurrence: { include: { schedule: { include: { ministry: true } } } },
        },
      },
    },
  });

  return allocs
    .map((a) => ({
      allocationId: a.id,
      date: a.slot.occurrence.date,
      ministry: a.slot.occurrence.schedule.ministry.name,
      role: a.slot.role.name,
      hasSwapOpen: a.swapRequest?.status === "OPEN",
      status: a.status,
      checkedInAt: a.checkedInAt,
    }))
    .sort((x, y) => x.date.getTime() - y.date.getTime());
}
