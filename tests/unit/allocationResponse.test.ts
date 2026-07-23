import { describe, it, expect } from "vitest";

// Teste de logica pura das regras de resposta/check-in de uma alocacao (sem DB).
// Espelha as checagens de src/modules/scheduling/services/respondAllocation.ts.
function canRespond(ownerId: string, requesterId: string): "OK" | "NOT_OWNER" {
  return ownerId === requesterId ? "OK" : "NOT_OWNER";
}

function canCheckIn(occurrenceDayKey: string, todayKey: string): "OK" | "CHECK_IN_NOT_TODAY" {
  return occurrenceDayKey === todayKey ? "OK" : "CHECK_IN_NOT_TODAY";
}

describe("respondAllocation regras puras", () => {
  it("dono confirma/recusa/faz check-in na propria alocacao", () => {
    expect(canRespond("u1", "u1")).toBe("OK");
  });
  it("bloqueia quem nao e dono", () => {
    expect(canRespond("u1", "u2")).toBe("NOT_OWNER");
  });
  it("permite check-in no dia da ocorrencia", () => {
    expect(canCheckIn("2026-07-23", "2026-07-23")).toBe("OK");
  });
  it("bloqueia check-in fora do dia da ocorrencia", () => {
    expect(canCheckIn("2026-07-24", "2026-07-23")).toBe("CHECK_IN_NOT_TODAY");
    expect(canCheckIn("2026-07-22", "2026-07-23")).toBe("CHECK_IN_NOT_TODAY");
  });
});
