export type RotationPair = { targetIndex: number; sourceIndex: number | null };

// occurrences ja ordenadas por (date asc, id asc); firstFutureIndex = primeira com date > now.
// Devolve no maximo `cycle` pares, um por ocorrencia futura, ate o fim da lista.
// sourceIndex = targetIndex - cycle, ou null quando a escala e mais nova que o ciclo.
export function planRotationPairs(params: {
  total: number;
  cycle: number;
  firstFutureIndex: number;
}): RotationPair[] {
  const { total, cycle, firstFutureIndex } = params;
  const lastTargetIndex = Math.min(total, firstFutureIndex + cycle);

  const pairs: RotationPair[] = [];
  for (let targetIndex = firstFutureIndex; targetIndex < lastTargetIndex; targetIndex++) {
    const sourceIndex = targetIndex - cycle;
    pairs.push({ targetIndex, sourceIndex: sourceIndex >= 0 ? sourceIndex : null });
  }
  return pairs;
}
