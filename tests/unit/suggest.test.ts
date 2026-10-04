import { describe, it, expect } from "vitest";
import {
  planSuggestions,
  suggestOutcome,
  suggestConfirmText,
  type SuggestCandidate,
} from "@/modules/scheduling/domain/suggest";

const cand = (userId: string, load = 0, over: Partial<SuggestCandidate> = {}): SuggestCandidate => ({
  userId,
  load,
  faltas: 0,
  unavailable: false,
  ...over,
});

const semCapacitacao = new Map<string, Set<string> | null>();
const ninguem = new Set<string>();

function plan(params: Partial<Parameters<typeof planSuggestions>[0]>) {
  return planSuggestions({
    slots: [{ slotId: "s1", roleId: "r1" }],
    candidates: [],
    capableByRole: semCapacitacao,
    alreadyAllocated: ninguem,
    ...params,
  });
}

describe("planSuggestions", () => {
  it("ordem de escolha: carga, depois faltas, depois userId", () => {
    expect(plan({ candidates: [cand("u1", 3), cand("u2", 1), cand("u3", 2)] }).picks).toEqual([
      { slotId: "s1", userId: "u2" },
    ]);
    expect(
      plan({ candidates: [cand("u1", 1, { faltas: 2 }), cand("u2", 1, { faltas: 0 })] }).picks[0].userId,
    ).toBe("u2");
    expect(plan({ candidates: [cand("u9", 1), cand("u4", 1)] }).picks[0].userId).toBe("u4");
  });

  it("indisponivel nao e escolhido mesmo com a menor carga", () => {
    const p = plan({ candidates: [cand("u1", 0, { unavailable: true }), cand("u2", 5)] });
    expect(p.picks).toEqual([{ slotId: "s1", userId: "u2" }]);
  });

  it("capacitacao declarada restringe; nao declarada libera todos", () => {
    const candidates = [cand("u1", 0), cand("u2", 5)];

    const declarada = plan({ candidates, capableByRole: new Map([["r1", new Set(["u2"])]]) });
    expect(declarada.picks[0].userId).toBe("u2");

    const naoDeclarada = plan({ candidates, capableByRole: new Map([["r1", null]]) });
    expect(naoDeclarada.picks[0].userId).toBe("u1");
  });

  it("uma vez por data: nao repete a pessoa nem usa quem ja estava alocado", () => {
    const duasVagas = [
      { slotId: "s1", roleId: "r1" },
      { slotId: "s2", roleId: "r2" },
    ];
    const p = plan({ slots: duasVagas, candidates: [cand("u1", 0), cand("u2", 1)] });
    expect(p.picks).toEqual([
      { slotId: "s1", userId: "u1" },
      { slotId: "s2", userId: "u2" },
    ]);

    const comAlocado = plan({ candidates: [cand("u1", 0), cand("u2", 1)], alreadyAllocated: new Set(["u1"]) });
    expect(comAlocado.picks).toEqual([{ slotId: "s1", userId: "u2" }]);
  });

  it("vaga mais restrita primeiro; empate mantem a ordem recebida", () => {
    const p = plan({
      slots: [
        { slotId: "vocal", roleId: "rVocal" },
        { slotId: "bateria", roleId: "rBateria" },
      ],
      candidates: [cand("u1", 0), cand("u2", 1), cand("u3", 2)],
      capableByRole: new Map<string, Set<string> | null>([
        ["rVocal", null],
        ["rBateria", new Set(["u1"])],
      ]),
    });
    expect(p.picks).toEqual([
      { slotId: "bateria", userId: "u1" },
      { slotId: "vocal", userId: "u2" },
    ]);
  });

  it("vaga mais restrita primeiro: empate de elegiveis mantem a ordem recebida", () => {
    const p = plan({
      slots: [
        { slotId: "s2", roleId: "r2" },
        { slotId: "s1", roleId: "r1" },
      ],
      candidates: [cand("u1", 0), cand("u2", 1)],
    });
    expect(p.picks).toEqual([
      { slotId: "s2", userId: "u1" },
      { slotId: "s1", userId: "u2" },
    ]);
  });

  it("reconta elegiveis a cada escolha: preenche as tres quando existe solucao", () => {
    // Vocal {a,b}, Violao {b,c}, Teclado {a,c}. Contando so uma vez, Teclado
    // ficava vazio; recontando, depois de a->Vocal sobra so c para Teclado.
    const p = plan({
      slots: [
        { slotId: "vocal", roleId: "rVocal" },
        { slotId: "violao", roleId: "rViolao" },
        { slotId: "teclado", roleId: "rTeclado" },
      ],
      candidates: [cand("a", 0), cand("b", 2), cand("c", 1)],
      capableByRole: new Map<string, Set<string> | null>([
        ["rVocal", new Set(["a", "b"])],
        ["rViolao", new Set(["b", "c"])],
        ["rTeclado", new Set(["a", "c"])],
      ]),
    });
    expect(p.unfilled).toEqual([]);
    expect(p.picks).toEqual([
      { slotId: "vocal", userId: "a" },
      { slotId: "teclado", userId: "c" },
      { slotId: "violao", userId: "b" },
    ]);
  });

  it("sem candidato: vaga vai para unfilled e nao para picks", () => {
    const p = plan({
      slots: [
        { slotId: "s1", roleId: "r1" },
        { slotId: "s2", roleId: "r2" },
      ],
      candidates: [cand("u1", 0)],
    });
    expect(p.picks).toEqual([{ slotId: "s1", userId: "u1" }]);
    expect(p.unfilled).toEqual(["s2"]);
  });
});

describe("suggestOutcome", () => {
  it("suggestOutcome escreve a contagem e decide o refresh", () => {
    expect(suggestOutcome({ ok: true, filled: 2, unfilled: 1 })).toEqual({
      message: "2 vagas preenchidas, 1 sem candidato",
      isError: false,
      refresh: true,
    });
    expect(suggestOutcome({ ok: true, filled: 1, unfilled: 0 }).message).toBe("1 vaga preenchida, 0 sem candidato");
    expect(suggestOutcome({ ok: true, filled: 0, unfilled: 3 }).refresh).toBe(false);
    expect(suggestOutcome({ ok: true, filled: 0, unfilled: 0 })).toEqual({
      message: "Nenhuma vaga aberta nesta data.",
      isError: false,
      refresh: false,
    });
    expect(suggestOutcome({ ok: false, error: "Essa data já passou." })).toEqual({
      message: "Essa data já passou.",
      isError: true,
      refresh: true,
    });
  });
});

describe("suggestConfirmText", () => {
  it("suggestConfirmText diz quando os escalados sao avisados", () => {
    expect(suggestConfirmText(true)).toContain("serão avisados agora");
    expect(suggestConfirmText(false)).toContain("só ao publicar");
  });
});
