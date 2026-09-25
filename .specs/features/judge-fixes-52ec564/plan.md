# Correções do julgamento do merge 52ec564

## Problem

A revisão (the-judge) do merge `52ec564` (capacitações, vaga vazia, rodízio) encontrou dois defeitos
e quatro pontos de estrutura. Hoje:

- O líder com sessão expirada que toca em "Repetir escalação" recebe "Não deu para repetir a
  escalação agora." em vez de ir para o `/login`: `repeatScheduleAction` captura o `NEXT_REDIRECT`
  lançado por `requireUser` (`src/modules/identity/services/authz.ts:42`). Erro inesperado nessa
  action não é logado e não gera `ref`, ao contrário de toda outra action (`src/lib/actionError.ts:52`).
- Se a repetição falha no meio, as vagas já copiadas ficam gravadas, mas a tela diz que nada foi
  feito e não recarrega a ocorrência.
- Numa função em que ninguém declarou capacitação, a lista de candidatos mostra o selo "não
  capacitado" em todo mundo, enquanto o rodízio trata a mesma situação como "todos capazes"
  (`src/modules/scheduling/services/repeatSchedule.ts:99`). No dia do deploy, toda vaga de todo
  ministério mostra o selo em todos os candidatos.
- A validação 1..12 do ciclo está copiada à mão em `createSchedule.ts:19` e `updateSchedule.ts:20`;
  `setOwnSkill` e `setMemberSkill` repetem o mesmo bloco `upsert`/`deleteMany`; um componente client
  (`OccurrenceRow.tsx:23`) importa código puro de `services/`, a camada que usa Prisma.

Quando isto sair: sessão expirada leva ao login, falha é logada com `ref`, falha parcial diz quantas
vagas foram preenchidas, e o selo só aparece depois que alguém declarou capacitação na função.

## Flow

Reusa `handleActionError`/`logError` para log e redirect, e `capableUserIdsForRole` como fonte única
da regra "capacitação só vale depois de declarada".

1. líder toca "Repetir escalação" -> `repeatScheduleAction` (exists) -> `repeatSchedule` (exists)
2. `repeatSchedule` (exists) - falha não-P2002 depois de N cópias vira erro de falha parcial com `filled`
3. `repeatScheduleAction` (exists) - relança redirect, loga erro inesperado, traduz para pt-BR, devolve `filled`
4. `OccurrenceRow` (exists) - mostra a mensagem e recarrega a ocorrência quando `filled > 0`
5. líder abre vaga -> `getOccurrenceCandidatesAction` (exists) -> `capableUserIdsForRole` (exists) devolve `null` quando nenhum membro ativo declarou a função
6. `markCapable` (exists, move para `scheduling/domain`) - `null` marca todos como capazes; `SlotDetailSheet` (exists) não mostra selo

## Impact

| Front | What changes |
| --- | --- |
| domain | termo existente: "capacitado" significava "tem `UserSkill` na função"; passa a significar "tem `UserSkill` na função, ou ninguém ativo do ministério declarou a função". Quem ramifica hoje: `repeatSchedule` (já nessa regra, passa a lê-la do serviço), `markCapable`/`SlotDetailSheet` (muda) |
| domain | `/vagas` "Pra você" continua lendo `capableRoleIds` (declaração do próprio usuário) - sem mudança |
| code | `candidateList.ts` sai de `scheduling/services` para `scheduling/domain`; imports em `actions.ts`, `OccurrenceRow.tsx` e `tests/unit/candidateList.test.ts` mudam |
| stored data | nada a migrar |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside; as Server Actions alteradas só são chamadas por componentes deste repo

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| None | - | - |

- Nothing else in this change is hard to reverse: sem schema, sem dependência, sem contrato externo

## Criteria

### S1: Repetir escalação trata sessão, erro e falha parcial (P1)

A action de repetir se comporta como as demais actions do repo diante de redirect e erro.

**Acceptance Criteria**

1. IF `repeatSchedule` lança um erro de redirect do Next (digest começando com `NEXT_REDIRECT`) THEN `repeatScheduleAction` SHALL relançar esse mesmo erro
2. IF `repeatSchedule` lança um erro que não é `FORBIDDEN`, `NO_ROTATION_CYCLE`, redirect nem falha parcial THEN `repeatScheduleAction` SHALL chamar `logError` com escopo `escalas.repeatSchedule` e devolver `{ ok: false }` com a mensagem "Não deu para repetir a escalação agora." e o `ref` retornado por `logError`
3. IF `allocation.create` falha com erro diferente de `P2002` depois de N ≥ 1 cópias gravadas THEN `repeatSchedule` SHALL lançar um erro de falha parcial que carrega `filled = N`
4. WHEN `repeatScheduleAction` recebe falha parcial com `filled = N` THEN ela SHALL logar o erro e devolver `{ ok: false, filled: N }` com a mensagem "N vaga(s) preenchida(s) antes da falha. Tente de novo para completar."
5. WHEN `repeatScheduleAction` devolve `filled > 0`, com ou sem erro, THEN `OccurrenceRow` SHALL chamar `onChanged`

**Independent test:** mockar `repeatSchedule` lançando `NEXT_REDIRECT` e ver o erro propagar; mockar `allocation.create` falhando na 2ª cópia e ver `filled = 1`.

### S2: Selo "não capacitado" só depois de declaração (P1)

Lista de candidatos e rodízio usam a mesma regra, vinda de uma única função.

**Acceptance Criteria**

6. WHILE nenhum membro ACTIVE do ministério tem `UserSkill` na função, `capableUserIdsForRole` SHALL devolver `null`
7. WHEN `markCapable` recebe `null` THEN ela SHALL marcar todo candidato com `capable: true` e ordenar só por `count30d` crescente
8. WHILE a função tem ao menos uma declaração de membro ACTIVE, `markCapable` SHALL manter a regra atual: capacitados primeiro, `capable: false` nos demais
9. WHILE `capableUserIdsForRole` devolve `null` para a função, `repeatSchedule` SHALL tratar a pessoa de origem como capacitada (comportamento atual, regra agora vinda do serviço)

**Independent test:** abrir uma vaga de função sem nenhuma declaração e ver candidatos sem selo, ordenados por carga.

### S3: Estrutura sem mudar comportamento (P2)

**Acceptance Criteria**

10. IF `rotationCycle` é inteiro fora de 1..12 THEN `createSchedule` e `updateSchedule` SHALL rejeitar, e a action SHALL mostrar "Ciclo de rodízio deve ser entre 1 e 12.", validado por um único schema compartilhado
11. WHEN `setOwnSkill` ou `setMemberSkill` recebe `enabled: true` THEN o serviço SHALL fazer `upsert` em `UserSkill (userId, roleId)`; com `enabled: false`, `deleteMany`, pelo mesmo helper interno
12. The system SHALL manter `buildCandidateList` e `markCapable` em `src/modules/scheduling/domain/candidateList.ts`, sem import de `@/lib/prisma`

**Independent test:** suíte existente verde + testes novos de schema e helper.

## Out of scope

| Excluded | Why |
| --- | --- |
| Transação atômica em `repeatSchedule` | notificações já disparadas não voltam atrás; repetir é idempotente (vaga preenchida é pulada) |
| Acesso cruzado a `prisma.membership` pelo módulo `scheduling` | problema anterior ao merge (🟣), padrão espalhado em 5 arquivos; pede feature própria |
| `eslint-disable` em `EscalaCalendar.tsx:95` | anterior ao merge (🟣) |
| Regra de lint para `catch` sem `handleActionError` | sugestão do julgamento, não defeito; pede decisão de tooling |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Selo quando ninguém declarou a função | sem selo, ordem só por carga | decisão do usuário, alinha com AD-002 e com o fix d47c978 | y |
| Falha parcial: atomicidade ou mensagem | mensagem com contagem, sem transação | ver Out of scope; releitura é segura | n |
| Contagem "declarou" considera só membros ACTIVE | sim | é o filtro que `capableUserIdsForRole` já aplica | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `OccurrenceRow` (repetir) | error state | AC 2, AC 4 |
| screen `OccurrenceRow` (repetir) | unauthorised / sessão expirada | AC 1 |
| screen `OccurrenceRow` (repetir) | loading | existing - botão desabilitado via `pending` |
| screen `OccurrenceRow` (repetir) | empty state | existing - "0 vagas preenchidas, 0 puladas" |
| screen `SlotDetailSheet` (candidatos) | ordering | AC 7, AC 8 |
| screen `SlotDetailSheet` (candidatos) | empty state | existing - lista vazia já tratada |
| screen `ScheduleForm` | error state | AC 10 |
| screen `ScheduleForm` | destructive action confirms | n/a - salvar escala não é destrutivo |

## Sources

- Julgamento the-judge do merge `52ec564` nesta sessão - achados F1..F6
- `.specs/STATE.md` AD-002 - capacitação orienta, não trava
