import { prisma } from "@/lib/prisma";
import { usersUnavailableAt } from "@/modules/availability/services/checkConflict";

export class NoGuestsFoundError extends Error {
  constructor() {
    super("NO_GUESTS_FOUND");
  }
}

export class UnavailabilityBlockedError extends Error {
  constructor() {
    super("UNAVAILABILITY_BLOCKED");
  }
}

export function decideLinkAllGuests(params: {
  matchingCount: number;
  hasConflict: boolean;
  override: boolean;
}): "OK" | "NO_GUESTS_FOUND" | "UNAVAILABILITY_BLOCKED" {
  if (params.matchingCount === 0) return "NO_GUESTS_FOUND";
  if (params.hasConflict && !params.override) return "UNAVAILABILITY_BLOCKED";
  return "OK";
}

export async function linkAllGuestAllocations(params: {
  guestName: string;
  userId: string;
  ministryIds: string[];
  override?: boolean;
}): Promise<{ count: number }> {
  if (!params.ministryIds || params.ministryIds.length === 0) {
    throw new NoGuestsFoundError();
  }

  const allocations = await prisma.allocation.findMany({
    where: {
      userId: null,
      guestName: { not: null },
      slot: {
        occurrence: {
          status: "ACTIVE",
          schedule: { ministryId: { in: params.ministryIds } },
        },
      },
    },
    include: {
      slot: {
        include: {
          occurrence: true,
        },
      },
    },
  });

  const targetName = params.guestName.trim().toLowerCase();
  const matchingAllocations = allocations.filter(
    (a) => (a.guestName ?? "").trim().toLowerCase() === targetName,
  );

  const matchingCount = matchingAllocations.length;

  let hasConflict = false;
  if (matchingCount > 0) {
    for (const alloc of matchingAllocations) {
      const occDate = alloc.slot.occurrence.date;
      const unavailables = await usersUnavailableAt([params.userId], occDate);
      if (unavailables.has(params.userId)) {
        hasConflict = true;
        break;
      }
    }
  }

  const decision = decideLinkAllGuests({
    matchingCount,
    hasConflict,
    override: !!params.override,
  });

  if (decision === "NO_GUESTS_FOUND") {
    throw new NoGuestsFoundError();
  }

  if (decision === "UNAVAILABILITY_BLOCKED") {
    throw new UnavailabilityBlockedError();
  }

  const matchingIds = matchingAllocations.map((a) => a.id);

  await prisma.allocation.updateMany({
    where: { id: { in: matchingIds } },
    data: {
      userId: params.userId,
      guestName: null,
      overrideUnavailability: hasConflict && !!params.override,
    },
  });

  return { count: matchingCount };
}
