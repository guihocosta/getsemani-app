import { describe, it, expect } from "vitest";
import { fmtTime, fmtDate, fmtDateTime } from "@/lib/time";

// America/Sao_Paulo = UTC-3 (sem horario de verao desde 2019).
// Regra da constituicao: armazenar UTC, exibir America/Sao_Paulo.
describe("time — exibicao em America/Sao_Paulo", () => {
  it("converte UTC -> horario local (UTC-3)", () => {
    // 22:00 UTC == 19:00 em Sao Paulo
    expect(fmtTime(new Date(Date.UTC(2026, 6, 14, 22, 0)))).toBe("19:00");
  });

  it("volta o dia ao cruzar a meia-noite UTC", () => {
    // 01:00 UTC do dia 15 == 22:00 do dia 14 em Sao Paulo
    const d = new Date(Date.UTC(2026, 6, 15, 1, 0));
    expect(fmtTime(d)).toBe("22:00");
    expect(fmtDate(d)).toMatch(/14/); // dia 14 local, nao 15
  });

  it("fmtDateTime junta data e hora locais", () => {
    const d = new Date(Date.UTC(2026, 6, 14, 22, 0));
    expect(fmtDateTime(d)).toBe(`${fmtDate(d)} · 19:00`);
  });
});
