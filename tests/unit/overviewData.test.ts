import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    occurrence: { count: vi.fn(async () => 2) },
    slot: { count: vi.fn(async () => 1) },
    allocation: { findMany: vi.fn() },
    membership: { findMany: vi.fn(async () => [{ userId: "u1" }, { userId: "u2" }]) },
  },
}));

import { prisma } from "@/lib/prisma";
import { overviewData } from "@/modules/reports/services/reports";

const from = new Date("2026-09-03T03:00:00Z");
const to = new Date("2026-10-03T03:00:00Z");
const hoje = new Date("2026-10-02T03:00:00Z");

describe("overviewData", () => {
  it("overviewData filtra ativa, publicada, janela e ministerios, e marca dia encerrado", async () => {
    vi.mocked(prisma.allocation.findMany).mockResolvedValue([
      {
        userId: "u1",
        status: "CONFIRMED",
        checkedInAt: new Date("2026-09-27T22:00:00Z"),
        slot: { occurrence: { date: new Date("2026-09-27T22:00:00Z") } },
      },
      {
        userId: null,
        status: "PENDING",
        checkedInAt: null,
        slot: { occurrence: { date: new Date("2026-10-02T22:00:00Z") } },
      },
    ] as never);

    const data = await overviewData(from, to, hoje, ["m1"]);

    const occurrence = {
      status: "ACTIVE",
      published: true,
      date: { gte: from, lt: to },
      schedule: { ministryId: { in: ["m1"] } },
    };
    expect(prisma.occurrence.count).toHaveBeenCalledWith({ where: occurrence });
    expect(prisma.slot.count).toHaveBeenCalledWith({ where: { active: true, allocation: null, occurrence } });
    expect(prisma.allocation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slot: { occurrence } } }),
    );
    expect(prisma.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE", ministryId: { in: ["m1"] } },
        distinct: ["userId"],
      }),
    );

    expect(data).toEqual({
      occurrences: 2,
      openSlots: 1,
      activeMembers: 2,
      allocations: [
        { userId: "u1", status: "CONFIRMED", checkedIn: true, ended: true },
        { userId: null, status: "PENDING", checkedIn: false, ended: false },
      ],
    });
  });

  it("overviewData sem ministryIds nao escopa por ministerio", async () => {
    vi.mocked(prisma.allocation.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.occurrence.count).mockClear();
    vi.mocked(prisma.membership.findMany).mockClear();

    await overviewData(from, to, hoje);

    expect(prisma.occurrence.count).toHaveBeenCalledWith({
      where: { status: "ACTIVE", published: true, date: { gte: from, lt: to } },
    });
    expect(prisma.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "ACTIVE" }, distinct: ["userId"] }),
    );
  });
});
