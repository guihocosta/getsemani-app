import { describe, it, expect } from "vitest";
import { buildRRule } from "@/modules/scheduling/domain/buildRRule";
import { expandOccurrences } from "@/modules/scheduling/domain/recurrence";

describe("buildRRule", () => {
  it("semanal no dia da semana informado", () => {
    expect(buildRRule({ freq: "WEEKLY", weekday: 0 })).toBe("FREQ=WEEKLY;BYDAY=SU");
  });

  it("quinzenal usa INTERVAL=2", () => {
    expect(buildRRule({ freq: "BIWEEKLY", weekday: 3 })).toBe("FREQ=WEEKLY;BYDAY=WE;INTERVAL=2");
  });

  it("mensal ignora o dia da semana", () => {
    expect(buildRRule({ freq: "MONTHLY", weekday: 2 })).toBe("FREQ=MONTHLY");
  });

  it("com count anexa COUNT e limita ocorrencias geradas", () => {
    const rule = buildRRule({ freq: "WEEKLY", weekday: 0, count: 3 });
    expect(rule).toBe("FREQ=WEEKLY;BYDAY=SU;COUNT=3");

    const dates = expandOccurrences(
      { recurrenceRule: rule, startDate: new Date(Date.UTC(2026, 0, 4)), startTime: "10:00" },
      new Date(Date.UTC(2026, 0, 1)),
      new Date(Date.UTC(2026, 2, 1)),
    );
    expect(dates.length).toBe(3);
  });
});
