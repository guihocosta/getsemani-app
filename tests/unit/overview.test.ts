import { describe, it, expect } from "vitest";
import { overviewPeriod, summarizeOverview, fmtPct, type OverviewAllocation } from "@/modules/reports/domain/overview";

const NOW = new Date("2026-10-02T15:00:00Z");
const iso = (d: Date) => d.toISOString();

describe("overviewPeriod", () => {
  it("janelas de 7, 30 e 90 dias terminam no fim de hoje; mes e o mes corrente", () => {
    const d7 = overviewPeriod("7d", NOW);
    expect([iso(d7.from), iso(d7.to)]).toEqual(["2026-09-26T03:00:00.000Z", "2026-10-03T03:00:00.000Z"]);

    const d30 = overviewPeriod("30d", NOW);
    expect([iso(d30.from), iso(d30.to)]).toEqual(["2026-09-03T03:00:00.000Z", "2026-10-03T03:00:00.000Z"]);

    const d90 = overviewPeriod("90d", NOW);
    expect([iso(d90.from), iso(d90.to)]).toEqual(["2026-07-05T03:00:00.000Z", "2026-10-03T03:00:00.000Z"]);

    const mes = overviewPeriod("mes", NOW);
    expect([iso(mes.from), iso(mes.to)]).toEqual(["2026-10-01T03:00:00.000Z", "2026-11-01T03:00:00.000Z"]);
  });

  it("periodo padrao e 30d para chave ausente ou desconhecida", () => {
    expect(overviewPeriod(undefined, NOW).key).toBe("30d");
    expect(overviewPeriod("xyz", NOW).key).toBe("30d");
    expect(iso(overviewPeriod("xyz", NOW).from)).toBe("2026-09-03T03:00:00.000Z");
  });
});

const aloc = (over: Partial<OverviewAllocation>): OverviewAllocation => ({
  userId: "u1",
  status: "PENDING",
  checkedIn: false,
  ended: false,
  ...over,
});

describe("summarizeOverview", () => {
  it("summarizeOverview calcula totais e percentuais", () => {
    const s = summarizeOverview({
      occurrences: 2,
      openSlots: 1,
      activeMembers: 5,
      allocations: [
        aloc({ userId: "u1", status: "CONFIRMED", ended: true, checkedIn: true }),
        aloc({ userId: "u2", status: "CONFIRMED", ended: true, checkedIn: false }),
        aloc({ userId: "u3", status: "PENDING" }),
        aloc({ userId: null, status: "PENDING", ended: true }),
      ],
    });

    expect(s).toEqual({
      escalas: 2,
      escalacoes: 4,
      vagasAbertas: 1,
      membrosEscalados: 3,
      membrosAtivos: 5,
      pctMembros: 60,
      pctConfirmadas: 67,
      pctFaltas: 50,
    });
  });

  it("denominador zero vira percentual nulo e travessao na tela", () => {
    const s = summarizeOverview({ occurrences: 0, openSlots: 0, activeMembers: 0, allocations: [] });
    expect(s.pctMembros).toBeNull();
    expect(s.pctConfirmadas).toBeNull();
    expect(s.pctFaltas).toBeNull();

    expect(fmtPct(null)).toBe("—");
    expect(fmtPct(67)).toBe("67%");
  });
});
