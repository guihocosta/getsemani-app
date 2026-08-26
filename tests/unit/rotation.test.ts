import { describe, it, expect } from "vitest";
import { planRotationPairs } from "@/modules/scheduling/domain/rotation";

describe("planRotationPairs", () => {
  it("devolve no maximo cycle pares, um por ocorrencia futura (REPT-02.1)", () => {
    const pairs = planRotationPairs({ total: 10, cycle: 2, firstFutureIndex: 4 });
    expect(pairs.length).toBe(2);
    expect(pairs.map((p) => p.targetIndex)).toEqual([4, 5]);
  });

  it("sourceIndex = targetIndex - cycle (REPT-02.2)", () => {
    const pairs = planRotationPairs({ total: 10, cycle: 3, firstFutureIndex: 5 });
    expect(pairs).toEqual([
      { targetIndex: 5, sourceIndex: 2 },
      { targetIndex: 6, sourceIndex: 3 },
      { targetIndex: 7, sourceIndex: 4 },
    ]);
  });

  it("escala mais nova que o ciclo devolve sourceIndex null no par correspondente", () => {
    const pairs = planRotationPairs({ total: 3, cycle: 4, firstFutureIndex: 1 });
    // targetIndex 1, 2 -> sourceIndex 1-4=-3 e 2-4=-2, ambos < 0
    expect(pairs).toEqual([
      { targetIndex: 1, sourceIndex: null },
      { targetIndex: 2, sourceIndex: null },
    ]);
  });

  it("menos de cycle ocorrencias futuras devolve so os pares existentes, sem erro", () => {
    const pairs = planRotationPairs({ total: 6, cycle: 4, firstFutureIndex: 5 });
    expect(pairs).toEqual([{ targetIndex: 5, sourceIndex: 1 }]);
  });

  it("sem ocorrencia futura devolve lista vazia", () => {
    const pairs = planRotationPairs({ total: 5, cycle: 2, firstFutureIndex: 5 });
    expect(pairs).toEqual([]);
  });
});
