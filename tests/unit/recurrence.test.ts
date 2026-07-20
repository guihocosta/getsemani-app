import { describe, it, expect } from "vitest";
import { expandOccurrences } from "@/modules/scheduling/domain/recurrence";

describe("expandOccurrences", () => {
  const base = {
    recurrenceRule: "FREQ=WEEKLY;BYDAY=SU",
    startDate: new Date(Date.UTC(2026, 0, 4)), // domingo 04/01/2026
    startTime: "10:00",
  };

  it("gera domingos dentro da janela", () => {
    const from = new Date(Date.UTC(2026, 0, 1));
    const to = new Date(Date.UTC(2026, 0, 31, 23, 59));
    const dates = expandOccurrences(base, from, to);
    // 04, 11, 18, 25 de janeiro
    expect(dates.length).toBe(4);
  });

  it("respeita recurrenceUntil (corta futuras)", () => {
    const from = new Date(Date.UTC(2026, 0, 1));
    const to = new Date(Date.UTC(2026, 1, 28));
    const dates = expandOccurrences(
      { ...base, recurrenceUntil: new Date(Date.UTC(2026, 0, 18)) },
      from,
      to,
    );
    // 04, 11, 18 apenas
    expect(dates.length).toBe(3);
  });

  it("retorna vazio quando until < from", () => {
    const from = new Date(Date.UTC(2026, 5, 1));
    const to = new Date(Date.UTC(2026, 5, 30));
    const dates = expandOccurrences(
      { ...base, recurrenceUntil: new Date(Date.UTC(2026, 0, 18)) },
      from,
      to,
    );
    expect(dates.length).toBe(0);
  });
});
