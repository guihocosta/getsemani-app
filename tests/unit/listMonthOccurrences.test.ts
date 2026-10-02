import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { occurrence: { findMany: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { listMonthOccurrences } from "@/modules/scheduling/services/listMonthOccurrences";

function row(id: string, published: boolean, repertoireEnabled = false) {
  return {
    id,
    scheduleId: "sc1",
    date: new Date("2026-10-11T22:00:00Z"),
    published,
    schedule: { ministryId: "m1", rotationCycle: null, title: "Culto", ministry: { name: "Louvor", repertoireEnabled } },
    slots: [],
  };
}

describe("listMonthOccurrences", () => {
  it("rascunho so para gerenciaveis e item carrega published", async () => {
    vi.mocked(prisma.occurrence.findMany).mockResolvedValue([row("o1", true), row("o2", false)] as never);

    const items = await listMonthOccurrences(["m1", "m2"], 2026, 10, ["m1"]);

    expect(prisma.occurrence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schedule: { ministryId: { in: ["m1", "m2"] } },
          OR: [{ published: true }, { schedule: { ministryId: { in: ["m1"] } } }],
        }),
      }),
    );
    expect(items.map((i) => [i.occurrenceId, i.published])).toEqual([
      ["o1", true],
      ["o2", false],
    ]);
  });

  it("repertoireEnabled acompanha o flag do ministerio da data", async () => {
    vi.mocked(prisma.occurrence.findMany).mockResolvedValue([
      row("o1", true, true),
      row("o2", true, false),
    ] as never);

    const items = await listMonthOccurrences(["m1"], 2026, 10, []);

    expect(items.map((i) => [i.occurrenceId, i.repertoireEnabled])).toEqual([
      ["o1", true],
      ["o2", false],
    ]);
  });

  it("time vem em HH:mm no fuso do app", async () => {
    // 22:00 UTC = 19:00 em America/Sao_Paulo
    vi.mocked(prisma.occurrence.findMany).mockResolvedValue([row("o1", true)] as never);

    const [item] = await listMonthOccurrences(["m1"], 2026, 10, []);

    expect(item.time).toBe("19:00");
    expect(item.dayKey).toBe("2026-10-11");
  });
});
