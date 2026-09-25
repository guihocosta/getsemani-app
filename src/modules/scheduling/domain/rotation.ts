import { z } from "zod";

// Ciclo de rodizio em ocorrencias (1..12); null = sem rodizio. Unica fonte da
// regra para criar e editar escala; a mensagem vira o codigo traduzido na action.
export const rotationCycleSchema = z
  .number()
  .int("INVALID_ROTATION_CYCLE")
  .min(1, "INVALID_ROTATION_CYCLE")
  .max(12, "INVALID_ROTATION_CYCLE")
  .nullish();

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

export type CopyDecision =
  | "OK"
  | "SKIP_SLOT_INACTIVE"
  | "SKIP_SLOT_TAKEN"
  | "SKIP_UNAVAILABLE"
  | "SKIP_NOT_MEMBER"
  | "SKIP_NOT_CAPABLE";

// Decide se a alocacao de origem pode ser copiada pra vaga de destino.
// Pessoa sem conta (sourceUserId nulo) segue direto pra OK: nao tem membership,
// capacitacao nem indisponibilidade pra checar (espelha allocateGuest).
export function decideCopyAllocation(params: {
  targetSlotActive: boolean;
  targetHasAllocation: boolean;
  sourceUserId: string | null;
  isActiveMember: boolean;
  isCapable: boolean;
  hasConflict: boolean;
}): CopyDecision {
  if (!params.targetSlotActive) return "SKIP_SLOT_INACTIVE";
  if (params.targetHasAllocation) return "SKIP_SLOT_TAKEN";
  if (params.sourceUserId === null) return "OK";
  if (!params.isActiveMember) return "SKIP_NOT_MEMBER";
  if (!params.isCapable) return "SKIP_NOT_CAPABLE";
  if (params.hasConflict) return "SKIP_UNAVAILABLE";
  return "OK";
}
