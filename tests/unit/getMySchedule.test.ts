import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { allocation: { findMany: vi.fn(async () => []) } },
}));

import { prisma } from "@/lib/prisma";
import { getMySchedule } from "@/modules/scheduling/services/getMySchedule";

describe("getMySchedule", () => {
  it("so ocorrencia publicada entra na agenda do voluntario", async () => {
    const from = new Date("2026-10-02T03:00:00Z");
    await getMySchedule("u1", from);

    expect(prisma.allocation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "u1",
          slot: { occurrence: { status: "ACTIVE", published: true, date: { gte: from } } },
        },
      }),
    );
  });

  it("repertoireEnabled e occurrenceId acompanham a data", async () => {
    vi.mocked(prisma.allocation.findMany).mockResolvedValue([
      {
        id: "al1",
        status: "CONFIRMED",
        checkedInAt: null,
        swapRequest: null,
        slot: {
          occurrenceId: "o1",
          role: { name: "Som" },
          occurrence: {
            date: new Date("2026-10-11T22:00:00Z"),
            schedule: { ministry: { name: "Louvor", repertoireEnabled: true } },
          },
        },
      },
    ] as never);

    const [item] = await getMySchedule("u1", new Date("2026-10-02T03:00:00Z"));

    expect(item.occurrenceId).toBe("o1");
    expect(item.repertoireEnabled).toBe(true);
  });
});
