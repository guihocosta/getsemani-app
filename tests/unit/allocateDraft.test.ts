import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    slot: { findUniqueOrThrow: vi.fn() },
    allocation: { create: vi.fn() },
    membership: { findFirst: vi.fn() },
  },
}));
vi.mock("@/modules/identity/services/authz", () => ({ requireLeaderOf: vi.fn(), requireUser: vi.fn() }));
vi.mock("@/modules/availability/services/checkConflict", () => ({
  hasUnavailabilityConflict: vi.fn(async () => false),
}));
vi.mock("@/modules/notifications/services/notify", () => ({ notifyUser: vi.fn(async () => "sent") }));

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { notifyUser } from "@/modules/notifications/services/notify";
import { allocateVolunteer } from "@/modules/scheduling/services/allocateVolunteer";
import { selfAllocate } from "@/modules/scheduling/services/selfAllocate";

function slot(published: boolean) {
  return {
    id: "s1",
    occurrenceId: "o1",
    allocation: null,
    role: { name: "Som" },
    occurrence: { date: new Date("2026-10-11T22:00:00Z"), published, schedule: { ministryId: "m1" } },
  };
}

beforeEach(() => {
  vi.mocked(notifyUser).mockClear();
  vi.mocked(prisma.allocation.create).mockReset();
  vi.mocked(prisma.allocation.create).mockResolvedValue({ id: "al1", status: "PENDING" } as never);
});

describe("allocateVolunteer", () => {
  it("allocateVolunteer em rascunho grava PENDING sem notificar", async () => {
    vi.mocked(prisma.slot.findUniqueOrThrow).mockResolvedValue(slot(false) as never);
    await allocateVolunteer({ slotId: "s1", userId: "u1" });

    expect(prisma.allocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slotId: "s1", userId: "u1", status: "PENDING" }),
    });
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("allocateVolunteer em publicada notifica com assign:<id>", async () => {
    vi.mocked(prisma.slot.findUniqueOrThrow).mockResolvedValue(slot(true) as never);
    await allocateVolunteer({ slotId: "s1", userId: "u1" });

    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", type: "ASSIGNMENT", dedupeKey: "assign:al1" }),
    );
  });
});

describe("selfAllocate", () => {
  it("selfAllocate em rascunho rejeita com NOT_PUBLISHED sem gravar", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: "u1", isAdmin: false } as never);
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: "ms1" } as never);
    vi.mocked(prisma.slot.findUniqueOrThrow).mockResolvedValue(slot(false) as never);

    await expect(selfAllocate({ slotId: "s1" })).rejects.toThrow("NOT_PUBLISHED");
    expect(prisma.allocation.create).not.toHaveBeenCalled();
  });
});
