import { describe, it, expect } from "vitest";
import { conflictsWith } from "@/modules/availability/services/checkConflict";

// Ocorrencia: domingo 12/07/2026 as 19:00 (fuso America/Sao_Paulo == UTC-3 nesta data)
const occurrence = new Date("2026-07-12T22:00:00Z");

describe("conflictsWith", () => {
  it("sem linhas de indisponibilidade -> sem conflito", () => {
    expect(conflictsWith([], occurrence)).toBe(false);
  });

  it("mes inteiro (date null) -> conflito", () => {
    expect(conflictsWith([{ date: null, startTime: null, endTime: null }], occurrence)).toBe(true);
  });

  it("dia diferente -> sem conflito", () => {
    const row = { date: new Date("2026-07-13T00:00:00Z"), startTime: null, endTime: null };
    expect(conflictsWith([row], occurrence)).toBe(false);
  });

  it("dia certo, dia inteiro -> conflito", () => {
    const row = { date: new Date("2026-07-12T00:00:00Z"), startTime: null, endTime: null };
    expect(conflictsWith([row], occurrence)).toBe(true);
  });

  it("dia certo, faixa horaria cobre o horario -> conflito", () => {
    const row = { date: new Date("2026-07-12T00:00:00Z"), startTime: "18:00", endTime: "21:00" };
    expect(conflictsWith([row], occurrence)).toBe(true);
  });

  it("dia certo, faixa horaria nao cobre o horario -> sem conflito", () => {
    const row = { date: new Date("2026-07-12T00:00:00Z"), startTime: "08:00", endTime: "12:00" };
    expect(conflictsWith([row], occurrence)).toBe(false);
  });
});
