import { describe, it, expect } from "vitest";
import { buildPanorama, shortName, pickMinistry, type PanoramaItem } from "@/modules/scheduling/domain/panorama";

type SlotOver = Partial<PanoramaItem["slots"][number]>;

function slot(roleId: string, role: string, over: SlotOver = {}): PanoramaItem["slots"][number] {
  return { roleId, role, active: true, allocatedName: null, allocatedStatus: null, isGuest: false, ...over };
}

function item(dayKey: string, slots: PanoramaItem["slots"], over: Partial<PanoramaItem> = {}): PanoramaItem {
  return { occurrenceId: `o-${dayKey}`, dayKey, time: "19:00", published: true, slots, ...over };
}

const HOJE = "2026-10-05";

describe("buildPanorama", () => {
  it("colunas seguem a ordem recebida com dia, hora e published", () => {
    const p = buildPanorama(
      [
        item("2026-10-04", [slot("r1", "Som")]),
        item("2026-10-11", [slot("r1", "Som")], { time: "09:00", published: false }),
      ],
      HOJE,
    );
    expect(p.columns).toEqual([
      { occurrenceId: "o-2026-10-04", dayLabel: "04/10", time: "19:00", published: true },
      { occurrenceId: "o-2026-10-11", dayLabel: "11/10", time: "09:00", published: false },
    ]);
  });

  it("linhas em ordem alfabetica pt-BR, sem funcao que so tem vaga inativa", () => {
    const p = buildPanorama(
      [
        item("2026-10-04", [
          slot("r1", "Violão"),
          slot("r2", "Bateria"),
          slot("r3", "Áudio"),
          slot("r4", "Teclado", { active: false }),
        ]),
      ],
      HOJE,
    );
    expect(p.rows.map((r) => r.role)).toEqual(["Áudio", "Bateria", "Violão"]);
  });

  it("celulas: sem vaga, aberta, preenchida, pendente e convidado", () => {
    const p = buildPanorama(
      [
        item("2026-10-04", [
          slot("r1", "Som", { allocatedName: "Maria Silva Souza", allocatedStatus: "CONFIRMED" }),
          slot("r2", "Voz", { allocatedName: "Ana", allocatedStatus: "PENDING" }),
        ]),
        item("2026-10-11", [
          slot("r1", "Som"),
          slot("r3", "Baixo", { allocatedName: "Zé Convidado", allocatedStatus: "PENDING", isGuest: true }),
        ]),
      ],
      HOJE,
    );
    const linha = (role: string) => p.rows.find((r) => r.role === role)!.cells;

    expect(linha("Som")).toEqual([
      { state: "filled", name: "Maria S.", isGuest: false, pending: false },
      { state: "open" },
    ]);
    expect(linha("Voz")).toEqual([{ state: "filled", name: "Ana", isGuest: false, pending: true }, null]);
    expect(linha("Baixo")).toEqual([null, { state: "filled", name: "Zé C.", isGuest: true, pending: false }]);
  });

  it("openCount conta so vagas abertas de hoje em diante", () => {
    const p = buildPanorama(
      [
        item("2026-10-04", [slot("r1", "Som")]),
        item("2026-10-11", [slot("r1", "Som"), slot("r2", "Voz")]),
      ],
      HOJE,
    );
    expect(p.openCount).toBe(2);

    expect(buildPanorama([item(HOJE, [slot("r1", "Som")])], HOJE).openCount).toBe(1);
  });

  it("mes vazio devolve grade vazia", () => {
    expect(buildPanorama([], HOJE)).toEqual({ columns: [], rows: [], openCount: 0 });
  });
});

describe("shortName", () => {
  it("shortName usa primeiro nome e inicial do ultimo sobrenome", () => {
    expect(shortName("Maria Silva Souza")).toBe("Maria S.");
    expect(shortName("Ana")).toBe("Ana");
    expect(shortName("  joão   pedro ")).toBe("joão p.");
  });
});

describe("pickMinistry", () => {
  const visiveis = [
    { id: "m1", name: "Louvor" },
    { id: "m2", name: "Mídia" },
  ];

  it("pickMinistry respeita o pedido so quando e visivel", () => {
    expect(pickMinistry(visiveis, "m2")?.id).toBe("m2");
    expect(pickMinistry(visiveis, undefined)?.id).toBe("m1");
    expect(pickMinistry(visiveis, "m9")?.id).toBe("m1");
    expect(pickMinistry([], "m1")).toBeNull();
  });
});
