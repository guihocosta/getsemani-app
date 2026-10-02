import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { occurrence: { findUniqueOrThrow: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/modules/identity/services/authz", () => ({ requireLeaderOf: vi.fn() }));
vi.mock("@/modules/notifications/services/notify", () => ({ notifyUser: vi.fn(async () => "sent") }));

import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { notifyUser } from "@/modules/notifications/services/notify";
import { setOccurrencePublished } from "@/modules/scheduling/services/publishOccurrence";

function occurrence(allocations: { id: string; userId: string | null }[]) {
  return {
    id: "o1",
    date: new Date("2026-10-11T22:00:00Z"),
    schedule: { ministryId: "m1" },
    slots: allocations.map((a, i) => ({ id: `s${i}`, role: { name: "Som" }, allocation: a })),
  };
}

beforeEach(() => {
  vi.mocked(prisma.occurrence.update).mockReset();
  vi.mocked(notifyUser).mockClear();
  vi.mocked(requireLeaderOf).mockReset();
});

describe("setOccurrencePublished", () => {
  it("tornar rascunho nao notifica", async () => {
    vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue(
      occurrence([{ id: "al1", userId: "u1" }]) as never,
    );
    await setOccurrencePublished({ occurrenceId: "o1", published: false });

    expect(prisma.occurrence.update).toHaveBeenCalledWith({ where: { id: "o1" }, data: { published: false } });
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("publicar notifica cada alocado com conta", async () => {
    vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue(
      occurrence([
        { id: "al1", userId: "u1" },
        { id: "al2", userId: "u2" },
      ]) as never,
    );
    await setOccurrencePublished({ occurrenceId: "o1", published: true });

    expect(prisma.occurrence.update).toHaveBeenCalledWith({ where: { id: "o1" }, data: { published: true } });
    expect(notifyUser).toHaveBeenCalledTimes(2);
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", type: "ASSIGNMENT", dedupeKey: "assign:al1" }),
    );
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u2", type: "ASSIGNMENT", dedupeKey: "assign:al2" }),
    );
  });

  it("convidado nao e notificado ao publicar", async () => {
    vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue(
      occurrence([{ id: "al1", userId: null }]) as never,
    );
    await setOccurrencePublished({ occurrenceId: "o1", published: true });

    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("FORBIDDEN nao grava", async () => {
    vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue(
      occurrence([{ id: "al1", userId: "u1" }]) as never,
    );
    vi.mocked(requireLeaderOf).mockRejectedValue(new Error("FORBIDDEN"));

    await expect(setOccurrencePublished({ occurrenceId: "o1", published: true })).rejects.toThrow("FORBIDDEN");
    expect(prisma.occurrence.update).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });
});
