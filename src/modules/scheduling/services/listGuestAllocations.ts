import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/time";

export type GuestOccurrenceDetail = {
  allocationId: string;
  slotId: string;
  occurrenceId: string;
  guestName?: string;
  role: string;
  ministryName: string;
  when: string;
  date: Date;
};

export type GroupedGuestItem = {
  guestName: string;
  totalAllocations: number;
  allocations: GuestOccurrenceDetail[];
};

export function groupGuestAllocations(
  rawAllocations: GuestOccurrenceDetail[]
): GroupedGuestItem[] {
  const groupsMap = new Map<string, { guestName: string; allocations: GuestOccurrenceDetail[] }>();

  for (const item of rawAllocations) {
    const key = (item.guestName ?? "").trim().toLowerCase();
    if (!groupsMap.has(key)) {
      groupsMap.set(key, { guestName: (item.guestName ?? "").trim(), allocations: [] });
    }
    groupsMap.get(key)!.allocations.push(item);
  }

  const result: GroupedGuestItem[] = [];
  for (const group of groupsMap.values()) {
    group.allocations.sort((a, b) => a.date.getTime() - b.date.getTime());
    result.push({
      guestName: group.guestName,
      totalAllocations: group.allocations.length,
      allocations: group.allocations,
    });
  }

  // Ordenar grupos em ordem alfabética pelo nome do convidado
  return result.sort((a, b) => a.guestName.localeCompare(b.guestName, "pt-BR"));
}

export async function listGuestAllocations(ministryIds: string[]): Promise<GroupedGuestItem[]> {
  if (ministryIds.length === 0) return [];

  const allocations = await prisma.allocation.findMany({
    where: {
      userId: null,
      guestName: { not: null },
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

  const rawDetails: GuestOccurrenceDetail[] = allocations.map((a) => ({
    allocationId: a.id,
    slotId: a.slotId,
    occurrenceId: a.slot.occurrenceId,
    guestName: a.guestName ?? "",
    role: a.slot.role.name,
    ministryName: a.slot.occurrence.schedule.ministry.name,
    when: fmtDateTime(a.slot.occurrence.date),
    date: a.slot.occurrence.date,
  }));

  return groupGuestAllocations(rawDetails);
}
