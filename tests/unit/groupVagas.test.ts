import { describe, it, expect } from "vitest";
import { groupVagasByCapability } from "@/modules/scheduling/domain/groupVagas";

type Item = { key: string; roleId: string };

describe("groupVagasByCapability", () => {
  it("separa capacitado em praVoce e o resto em outras (CAPA-04.1)", () => {
    const items: Item[] = [
      { key: "a", roleId: "projecao" },
      { key: "b", roleId: "som" },
      { key: "c", roleId: "projecao" },
    ];
    const { praVoce, outras } = groupVagasByCapability(items, new Set(["projecao"]));
    expect(praVoce.map((i) => i.key)).toEqual(["a", "c"]);
    expect(outras.map((i) => i.key)).toEqual(["b"]);
  });

  it("Set vazio devolve tudo em outras (CAPA-04.3)", () => {
    const items: Item[] = [
      { key: "a", roleId: "projecao" },
      { key: "b", roleId: "som" },
    ];
    const { praVoce, outras } = groupVagasByCapability(items, new Set());
    expect(praVoce).toEqual([]);
    expect(outras.map((i) => i.key)).toEqual(["a", "b"]);
  });

  it("todos capacitados devolve outras vazio (CAPA-04.4)", () => {
    const items: Item[] = [
      { key: "a", roleId: "projecao" },
      { key: "b", roleId: "som" },
    ];
    const { praVoce, outras } = groupVagasByCapability(items, new Set(["projecao", "som"]));
    expect(praVoce.map((i) => i.key)).toEqual(["a", "b"]);
    expect(outras).toEqual([]);
  });

  it("preserva a ordem de entrada dentro de cada grupo (CAPA-04.5)", () => {
    const items: Item[] = [
      { key: "a", roleId: "som" },
      { key: "b", roleId: "projecao" },
      { key: "c", roleId: "som" },
      { key: "d", roleId: "projecao" },
    ];
    const { praVoce, outras } = groupVagasByCapability(items, new Set(["projecao"]));
    expect(praVoce.map((i) => i.key)).toEqual(["b", "d"]);
    expect(outras.map((i) => i.key)).toEqual(["a", "c"]);
  });

  it("lista vazia devolve os dois grupos vazios (CAPA-04.6)", () => {
    const { praVoce, outras } = groupVagasByCapability([], new Set(["projecao"]));
    expect(praVoce).toEqual([]);
    expect(outras).toEqual([]);
  });
});
