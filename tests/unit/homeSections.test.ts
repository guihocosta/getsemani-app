import { describe, it, expect } from "vitest";
import { homeSections } from "@/modules/scheduling/domain/homeSections";

const TODAY = "2026-10-15";
// 18:00 e 23:30 em Sao Paulo: o segundo ja e dia 16 em UTC.
const hoje = { status: "CONFIRMED" as const, date: new Date("2026-10-15T21:00:00Z") };
const hojeTarde = { status: "CONFIRMED" as const, date: new Date("2026-10-16T02:30:00Z") };
const pendente = { status: "PENDING" as const, date: new Date("2026-10-18T21:00:00Z") };
const pendenteHoje = { status: "PENDING" as const, date: new Date("2026-10-15T21:00:00Z") };
const futura = { status: "CONFIRMED" as const, date: new Date("2026-10-22T21:00:00Z") };
const futuraMeiaNoite = { status: "CONFIRMED" as const, date: new Date("2026-10-16T03:00:00Z") };

describe("homeSections", () => {
  it.each([
    ["nada", [], true],
    ["so hoje", [hoje], false],
    ["so pendente", [pendente], false],
    ["so futura", [futura], false],
    ["hoje e pendente", [hoje, pendente], false],
  ])("vazio da home: %s", (_nome, items, vazio) => {
    expect(homeSections(items, TODAY).showEmpty).toBe(vazio);
  });

  it("grupos da home: status e dia local decidem o grupo", () => {
    const s = homeSections([hoje, hojeTarde, pendente, pendenteHoje, futura, futuraMeiaNoite], TODAY);
    expect(s.pending).toEqual([pendente, pendenteHoje]);
    expect(s.today).toEqual([hoje, hojeTarde]);
    expect(s.future).toEqual([futura, futuraMeiaNoite]);
  });
});
