import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    schedule: { findMany: vi.fn() },
    occurrence: { findMany: vi.fn(), create: vi.fn((args: unknown) => args) },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));

import { prisma } from "@/lib/prisma";
import { materializeOccurrences } from "@/modules/scheduling/services/materializeOccurrences";

const NOW = new Date("2026-10-15T18:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.schedule.findMany).mockResolvedValue([
    {
      id: "s1",
      recurrenceRule: "FREQ=WEEKLY;BYDAY=SU",
      startDate: new Date("2026-10-04"),
      startTime: "18:00",
      recurrenceUntil: null,
      defaultRoles: [{ roleId: "r1" }],
    },
  ] as never);
});

describe("materializeOccurrences", () => {
  it("materializa por dia local", async () => {
    // 13 domingos na janela; 25/10 teve o horario mudado para 18:30
    const de = new Date("2026-10-18T21:00:00Z").getTime();
    const existentes = Array.from({ length: 13 }, (_, i) => ({ date: new Date(de + i * 7 * 86_400_000) }));
    existentes[1] = { date: new Date("2026-10-25T21:30:00Z") };
    vi.mocked(prisma.occurrence.findMany).mockResolvedValue(existentes as never);

    expect(await materializeOccurrences(NOW, "s1")).toBe(0);
    expect(prisma.occurrence.create).not.toHaveBeenCalled();

    // sem 01/11 no banco: so ela e criada, no horario do modelo
    vi.mocked(prisma.occurrence.findMany).mockResolvedValue(existentes.filter((_, i) => i !== 2) as never);
    expect(await materializeOccurrences(NOW, "s1")).toBe(1);
    expect(prisma.occurrence.create).toHaveBeenCalledTimes(1);
    expect(prisma.occurrence.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ date: new Date("2026-11-01T21:00:00Z") }) }),
    );
  });
});
