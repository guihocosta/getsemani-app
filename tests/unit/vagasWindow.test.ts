import { describe, it, expect } from "vitest";
import { addDays } from "date-fns";

// Regra de recorte da tela de Vagas: so mostra o que esta dentro da janela
// de WINDOW_DAYS dias a frente de "now" (panorama completo fica em Escalas).
const WINDOW_DAYS = 14;

function inWindow(date: Date, now: Date): boolean {
  return date >= now && date <= addDays(now, WINDOW_DAYS);
}

describe("janela de Vagas", () => {
  const now = new Date("2026-07-24T12:00:00Z");

  it("inclui data de amanha", () => {
    expect(inWindow(new Date("2026-07-25T12:00:00Z"), now)).toBe(true);
  });
  it("inclui o limite exato de 14 dias", () => {
    expect(inWindow(addDays(now, 14), now)).toBe(true);
  });
  it("exclui data alem de 14 dias", () => {
    expect(inWindow(new Date("2026-08-10T12:00:00Z"), now)).toBe(false);
  });
  it("exclui data no passado", () => {
    expect(inWindow(new Date("2026-07-23T12:00:00Z"), now)).toBe(false);
  });
});
