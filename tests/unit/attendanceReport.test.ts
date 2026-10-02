import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { allocation: { findMany: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { attendanceRows } from "@/modules/reports/services/reports";

const from = new Date("2026-09-02T03:00:00Z");
const to = new Date("2026-10-02T03:00:00Z");

beforeEach(() => {
  vi.mocked(prisma.allocation.findMany).mockReset();
  vi.mocked(prisma.allocation.findMany).mockResolvedValue([
    { userId: "u1", checkedInAt: new Date("2026-09-20T22:00:00Z"), user: { name: "Ana" } },
    { userId: "u2", checkedInAt: null, user: { name: "Bia" } },
  ] as never);
});

describe("attendanceRows", () => {
  it("attendanceRows filtra pessoa, ocorrencia ativa, janela e ministerios", async () => {
    const rows = await attendanceRows(from, to, ["m1"]);

    expect(prisma.allocation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: { not: null },
          slot: {
            occurrence: {
              status: "ACTIVE",
              date: { gte: from, lt: to },
              schedule: { ministryId: { in: ["m1"] } },
            },
          },
        },
      }),
    );
    expect(rows).toEqual([
      { userId: "u1", name: "Ana", checkedIn: true },
      { userId: "u2", name: "Bia", checkedIn: false },
    ]);
  });

  it("attendanceRows sem ministryIds nao filtra por ministerio", async () => {
    await attendanceRows(from, to);

    expect(prisma.allocation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: { not: null },
          slot: { occurrence: { status: "ACTIVE", date: { gte: from, lt: to } } },
        },
      }),
    );
  });
});
