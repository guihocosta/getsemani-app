# Repetir escalação por rodízio — Design

**Spec**: `.specs/features/repetir-escalacao/spec.md`
**Depende de**: `.specs/features/capacitacoes` (para o filtro de capacitação da REPT-04.4)

## Decisões de arquitetura

| Decisão | Escolha | Motivo |
| ------- | ------- | ------ |
| Onde mora o ciclo | `Schedule.rotationCycle Int?` | Decisão do usuário: fixo na escala. Nulo em toda escala existente, então nada muda para elas. |
| Unidade do ciclo | Ocorrências ACTIVE da própria escala, ordenadas por `date` e desempatadas por `id` | Imune a mês de 5 domingos e a ocorrência cancelada; o desempate garante correspondência estável entre execuções (edge case da spec). |
| Emparelhamento | `alvo[i] ← origem[i - N]` sobre a lista ordenada completa | Uma regra só cobre "próximo ciclo" e mantém a repetição idempotente. |
| Lógica pura extraída | `planRotationPairs` e `decideCopyAllocation` | Convenção do repo: a regra de risco vira função pura testável (igual `decideAllocate`, `expandOccurrences`); o serviço com Prisma fica fino. |
| Escrita das alocações | `create` uma a uma, capturando `P2002` como "pulada" | Espelha `allocateVolunteer`; uma corrida numa vaga não pode abortar a repetição inteira (edge case da spec). |
| Notificação | `notifyUser` com `dedupeKey: assign:<allocationId>` | Mesmo contrato de `allocateVolunteer`; `notifyUser` nunca lança, então falha de push não desfaz a alocação. |
| Gatilho na UI | Item "Repetir escalação" no `OccurrenceMenu` | Decisão do usuário (uma escala por vez); o menu já recebe `scheduleId` e já é o lugar das ações de série. |

## Modelo de dados

Um único campo novo:

```prisma
model Schedule {
  // …
  rotationCycle Int? // ciclo de rodizio em ocorrencias (1..12); null = sem rodizio
}
```

## Componentes

### `src/modules/scheduling/domain/rotation.ts` (puro)

```ts
export type RotationPair = { targetIndex: number; sourceIndex: number | null };

// occurrences ja ordenadas por (date asc, id asc); firstFutureIndex = primeira com date > now.
export function planRotationPairs(params: {
  total: number;
  cycle: number;
  firstFutureIndex: number;
}): RotationPair[];

export type CopyDecision =
  | "OK"
  | "SKIP_SLOT_INACTIVE"
  | "SKIP_SLOT_TAKEN"
  | "SKIP_UNAVAILABLE"
  | "SKIP_NOT_MEMBER"
  | "SKIP_NOT_CAPABLE";

export function decideCopyAllocation(params: {
  targetSlotActive: boolean;
  targetHasAllocation: boolean;
  sourceUserId: string | null; // null = pessoa sem conta
  isActiveMember: boolean;
  isCapable: boolean;
  hasConflict: boolean;
}): CopyDecision;
```

`planRotationPairs` devolve no máximo `cycle` pares, um por ocorrência futura, com `sourceIndex = targetIndex - cycle` ou `null` quando a escala é mais nova que o ciclo (REPT-02.2 e o edge case correspondente).

`decideCopyAllocation` avalia na ordem: slot inativo → slot ocupado → pessoa sem conta (segue direto para `"OK"`, sem checar membership, capacitação ou indisponibilidade) → membership → capacitação → indisponibilidade. Cobre REPT-04.1 a .6.

### `src/modules/scheduling/services/repeatSchedule.ts`

```ts
export type RepeatResult = { filled: number; skipped: number };
export async function repeatSchedule(scheduleId: string): Promise<RepeatResult>;
```

Fluxo: `requireLeaderOf(schedule.ministryId)` → valida `rotationCycle` não nulo → carrega ocorrências ACTIVE com slots, funções e alocações → `planRotationPairs` → para cada par, para cada alocação de origem, resolve membership, capacitação (`capableUserIdsForRole` do módulo `ministries`) e indisponibilidade (`hasUnavailabilityConflict`) → `decideCopyAllocation` → `create` + `notifyUser`.

Consultas de membership, capacitação e indisponibilidade são resolvidas em lote antes do laço, não por alocação.

### Alterações em código existente

- `src/modules/scheduling/services/createSchedule.ts` e `updateSchedule.ts` — aceitam e validam `rotationCycle` (nulo ou 1..12; fora disso lança `INVALID_ROTATION_CYCLE`).
- `app/(app)/escalas/ScheduleForm.tsx` — campo "Ciclo de rodízio" (Sem rodízio, 1..12), disponível também na edição.
- `app/(app)/escalas/actions.ts` — `repeatScheduleAction(scheduleId)` no formato `{ ok, error?, filled?, skipped? }`, com `revalidatePath("/escalas")`.
- `app/(app)/escalas/OccurrenceMenu.tsx` — item "Repetir escalação", desabilitado com dica quando `rotationCycle` é nulo.
- `app/(app)/escalas/OccurrenceRow.tsx` — dispara a action e mostra "N vagas preenchidas, M puladas".

## Fluxo

```
OccurrenceMenu → repeatScheduleAction(scheduleId) → repeatSchedule
  → planRotationPairs (puro)
  → por alocação: decideCopyAllocation (puro) → create + notifyUser
  → { filled, skipped } → OccurrenceRow exibe o resultado
```

## Riscos

- Uma repetição pode disparar dezenas de notificações de uma vez. `notifyUser` já deduplica por `dedupeKey` e nunca lança, então o pior caso é ruído — aceitável para o volume de uma igreja.
- Se o líder editar a série (excluir ocorrências) entre dois cliques, os índices mudam e o emparelhamento muda junto. É o comportamento correto: o rodízio segue a lista ACTIVE atual.
