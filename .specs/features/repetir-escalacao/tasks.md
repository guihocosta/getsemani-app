# Repetir escalação por rodízio — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/repetir-escalacao/design.md`
**Status**: Approved
**Pré-requisito**: a feature `capacitacoes` precisa estar concluída — T5 consome `capableUserIdsForRole`.

---

## Test Coverage Matrix

> Gerada a partir da amostragem de `tests/unit/` (31 arquivos), de `vitest.config.ts` e de `CLAUDE.md`. Guidelines encontradas: `CLAUDE.md` ("Testes unitários cobrem regra de negócio de risco… Bug corrigido ganha teste que o reproduz"), `vitest.config.ts`, `package.json`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio puro (`src/modules/*/domain/*.ts`, funções `decide*`/`plan*` em `services/`) | unit | Todos os ramos; 1:1 com as ACs da spec; todo edge case listado tem teste | `tests/unit/*.test.ts` | `npm run test` |
| Serviço com Prisma (`src/modules/*/services/*.ts` que chama `prisma`) | none | Convenção do repo: a regra sai como função pura testada; o wrapper de I/O é coberto pelo build gate | - | build gate |
| Página / Server Component (`app/**/page.tsx`) | none | Sem suíte de render no repo; verificado por build gate + UAT manual | - | build gate |
| Server Action (`app/**/actions.ts`) | none | Wrapper fino sobre serviço; tradução de erro coberta por `tests/unit/actionError.test.ts` já existente | - | build gate |
| Componente client (`app/**/*.tsx`) | none | Sem suíte de render; helpers puros extraídos ganham unit test | - | build gate |
| Schema Prisma / migration | none | build gate (`prisma generate` roda dentro de `npm run build`) | - | build gate |

Não há suíte e2e no repositório (`tests/` contém só `unit/`); `npm run test:e2e` existe mas sem specs. E2E fica fora do escopo destas tarefas.

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Depois de tarefa só com teste unitário | `npm run test` |
| Full | Depois de tarefa que altera contrato consumido por outro arquivo | `npm run test && npm run typecheck` |
| Build | Depois de fechar fase, ou em tarefa de schema/página/componente | `npm run typecheck && npm run lint && npm run test && npm run build` |

---

## Execution Plan

### Phase 1: Modelo e domínio

```
T1 → T2 → T3
```

### Phase 2: Serviços

```
T4 → T5
```

### Phase 3: UI

```
T6 → T7 → T8 → T9
```

---

## Task Breakdown

### T1: Adicionar `rotationCycle` à `Schedule`

**What**: Campo `rotationCycle Int?` em `Schedule`, com comentário de domínio, e a migration correspondente.
**Where**: `prisma/schema.prisma`
**Depends on**: None
**Reuses**: Padrão de campo opcional `recurrenceUntil` em `prisma/schema.prisma:124`
**Requirement**: REPT-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `rotationCycle Int?` declarado com comentário em pt-BR
- [x] `npx prisma migrate dev --name schedule_rotation_cycle` gera a migration sem erro
- [x] Escalas existentes ficam com `rotationCycle` nulo (REPT-01.5)
- [x] Gate check passa: `npm run typecheck && npm run lint && npm run test && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(rodizio): adicionar campo rotationCycle na escala`

---

### T2: Escrever `planRotationPairs`

**What**: Função pura que, dado o total de ocorrências ACTIVE, o ciclo e o índice da primeira ocorrência futura, devolve os pares alvo→origem do próximo ciclo; mais os testes unitários.
**Where**: `src/modules/scheduling/domain/rotation.ts`
**Depends on**: T1
**Reuses**: Padrão de domínio puro + teste de `expandOccurrences` (`src/modules/scheduling/domain/recurrence.ts` + `tests/unit/recurrence.test.ts`)
**Requirement**: REPT-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Devolve no máximo `cycle` pares, um por ocorrência futura (REPT-02.1)
- [x] `sourceIndex = targetIndex - cycle` (REPT-02.2)
- [x] Escala mais nova que o ciclo devolve `sourceIndex: null` no par correspondente
- [x] Menos de `cycle` ocorrências futuras devolve só os pares existentes, sem erro
- [x] Sem ocorrência futura devolve lista vazia
- [x] Testes em `tests/unit/rotation.test.ts`, 5 testes passam
- [x] Gate check passa: `npm run test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(rodizio): adicionar planRotationPairs`

---

### T3: Escrever `decideCopyAllocation`

**What**: Função pura que decide se uma alocação de origem pode ser copiada para a vaga de destino, com os motivos de pulo; mais os testes unitários de todos os ramos.
**Where**: `src/modules/scheduling/domain/rotation.ts` (modify)
**Depends on**: T2
**Reuses**: Padrão de `decideAllocate` em `src/modules/scheduling/services/allocateVolunteer.ts:23`
**Requirement**: REPT-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Slot inativo devolve `"SKIP_SLOT_INACTIVE"` (REPT-04.5)
- [x] Slot já ocupado devolve `"SKIP_SLOT_TAKEN"` (REPT-04.2)
- [x] Sem membership ACTIVE devolve `"SKIP_NOT_MEMBER"` (REPT-04.3)
- [x] Sem capacitação devolve `"SKIP_NOT_CAPABLE"` (REPT-04.4)
- [x] Indisponibilidade devolve `"SKIP_UNAVAILABLE"` (REPT-04.1)
- [x] Pessoa sem conta (`sourceUserId: null`) devolve `"OK"` sem checar membership, capacitação nem indisponibilidade
- [x] Slot ocupado tem precedência sobre indisponibilidade
- [x] Testes em `tests/unit/rotation.test.ts`, 7 testes novos passam (12 no arquivo)
- [x] Gate check passa: `npm run test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(rodizio): adicionar decideCopyAllocation`

---

### T4: Validar `rotationCycle` na criação e edição da escala

**What**: `createSchedule` e `updateSchedule` passam a aceitar `rotationCycle` (nulo ou 1..12), lançando `INVALID_ROTATION_CYCLE` fora do intervalo.
**Where**: `src/modules/scheduling/services/updateSchedule.ts` (modify)
**Depends on**: None
**Reuses**: Validação existente de `createSchedule.ts` e o padrão de erro-código em maiúsculas do repo
**Requirement**: REPT-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Valor 1..12 é persistido (REPT-01.2)
- [x] Nulo é persistido como "sem rodízio" (REPT-01.3)
- [x] 0, 13 ou negativo lança `INVALID_ROTATION_CYCLE` sem gravar (REPT-01.4)
- [x] `createSchedule` recebe a mesma validação
- [x] Gate check passa: `npm run test && npm run typecheck`

**Tests**: none
**Gate**: full

**Commit**: `feat(rodizio): validar ciclo de rodizio ao salvar escala`

---

### T5: Serviço `repeatSchedule`

**What**: Serviço que autoriza o líder, carrega as ocorrências ACTIVE ordenadas, aplica `planRotationPairs` e `decideCopyAllocation`, cria as alocações PENDING, notifica e devolve `{ filled, skipped }`.
**Where**: `src/modules/scheduling/services/repeatSchedule.ts`
**Depends on**: T4
**Reuses**: `requireLeaderOf` (`authz.ts:63`), `hasUnavailabilityConflict` (`src/modules/availability/services/checkConflict.ts`), `notifyUser` e o `dedupeKey` `assign:<id>` de `allocateVolunteer.ts:80`, `capableUserIdsForRole` do módulo `ministries`
**Requirement**: REPT-02, REPT-03, REPT-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Alocações criadas com `status: "PENDING"` e `source: "LEADER"` (REPT-02.3)
- [x] Pessoa com conta recebe notificação ASSIGNMENT (REPT-02.4)
- [x] Pessoa sem conta é copiada sem notificação
- [x] `rotationCycle` nulo lança `NO_ROTATION_CYCLE` sem criar nada
- [x] Não líder recebe `FORBIDDEN` sem criar nada (REPT-02.7)
- [x] `P2002` numa vaga conta como pulada e não aborta o restante
- [x] Rodar duas vezes seguidas devolve `filled: 0` na segunda (REPT-02.8)
- [x] Membership, capacitação e indisponibilidade resolvidas em lote, não por alocação
- [x] Gate check passa: `npm run test && npm run typecheck`

**Tests**: none
**Gate**: full

**Commit**: `feat(rodizio): adicionar servico repeatSchedule`

---

### T6: Campo "Ciclo de rodízio" no formulário de escala

**What**: Select "Ciclo de rodízio" com "Sem rodízio" e 1..12, presente na criação e na edição, enviado como campo do formulário.
**Where**: `app/(app)/escalas/ScheduleForm.tsx` (modify)
**Depends on**: None
**Reuses**: Padrão de `select` + `field` já usado para Frequência e Terminar em, no mesmo arquivo
**Requirement**: REPT-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Opções "Sem rodízio" e 1 a 12 (REPT-01.1)
- [x] Campo aparece tanto na criação quanto na edição
- [x] Valor atual da escala vem pré-selecionado na edição
- [x] Só tokens de tema, nenhuma cor crua do Tailwind
- [x] Gate check passa: `npm run typecheck && npm run lint && npm run test && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(rodizio): adicionar campo de ciclo no formulario de escala`

---

### T7: Server Action `repeatScheduleAction`

**What**: Action que chama `repeatSchedule`, devolve `{ ok, error?, filled?, skipped? }`, traduz `FORBIDDEN` e `NO_ROTATION_CYCLE` para pt-BR e faz `revalidatePath("/escalas")`.
**Where**: `app/(app)/escalas/actions.ts` (modify)
**Depends on**: T6
**Reuses**: `handleActionError` e o formato `{ ok, error? }` do mesmo arquivo (`actions.ts:156`)
**Requirement**: REPT-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sucesso devolve `filled` e `skipped`
- [x] `FORBIDDEN` e `NO_ROTATION_CYCLE` viram mensagem pt-BR, sem vazar o código
- [x] `revalidatePath("/escalas")` chamado no sucesso
- [x] Gate check passa: `npm run test && npm run typecheck`

**Tests**: none
**Gate**: full

**Commit**: `feat(rodizio): adicionar action de repetir escalacao`

---

### T8: Item "Repetir escalação" no menu da ocorrência

**What**: Novo item de menu que dispara a repetição, desabilitado com a dica "Defina o ciclo de rodízio ao editar a escala" quando a escala não tem ciclo.
**Where**: `app/(app)/escalas/OccurrenceMenu.tsx` (modify)
**Depends on**: T7
**Reuses**: Estrutura dos itens existentes do mesmo menu ("Adicionar vaga extra", "Excluir esta")
**Requirement**: REPT-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Item aparece no menu e fecha o menu ao ser acionado
- [x] Sem ciclo, item fica desabilitado com a dica da AC REPT-02.6
- [x] Só tokens de tema, nenhuma cor crua do Tailwind
- [x] Gate check passa: `npm run typecheck && npm run lint && npm run test && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(rodizio): adicionar acao de repetir escalacao no menu`

---

### T9: Ligar a repetição e exibir o resultado

**What**: `OccurrenceRow` passa `rotationCycle` ao menu, chama `repeatScheduleAction` e exibe "N vagas preenchidas, M puladas" ou o erro, recarregando o mês.
**Where**: `app/(app)/escalas/OccurrenceRow.tsx` (modify)
**Depends on**: T8
**Reuses**: Tratamento de resultado das ações já existentes no mesmo arquivo (`OccurrenceRow.tsx:213`)
**Requirement**: REPT-02, REPT-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Resultado exibido com as duas contagens (REPT-02.5)
- [x] Erro exibido no mesmo padrão das demais ações da tela
- [x] Ocorrências afetadas aparecem preenchidas após a ação
- [x] Vagas puladas continuam livres e visíveis em `/vagas` (REPT-05.7)
- [x] Gate check passa: `npm run typecheck && npm run lint && npm run test && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(rodizio): exibir resultado da repeticao de escalacao`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4 ------→ T5
Phase 3:  T6 ------→ T7 ------→ T8 ------→ T9
```

Execução estritamente sequencial: um agente por vez, uma tarefa por vez, na ordem.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: campo `rotationCycle` | 1 arquivo (schema) | ✅ Granular |
| T2: `planRotationPairs` | 1 função pura | ✅ Granular |
| T3: `decideCopyAllocation` | 1 função pura, mesmo arquivo | ✅ Granular |
| T4: validação do ciclo | 1 regra em 2 serviços irmãos | ⚠️ OK — coeso |
| T5: `repeatSchedule` | 1 serviço | ✅ Granular |
| T6: campo no formulário | 1 componente | ✅ Granular |
| T7: `repeatScheduleAction` | 1 action | ✅ Granular |
| T8: item de menu | 1 componente | ✅ Granular |
| T9: wiring e resultado | 1 componente | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | primeiro da Phase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | None | primeiro da Phase 2 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | None | primeiro da Phase 3 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |

As dependências entre fases (T5 precisa do domínio de T2 e T3, T7 precisa do serviço de T5) são garantidas pela execução sequencial das fases, não por arestas dentro de uma fase.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Schema Prisma | none | none | ✅ OK |
| T2 | Domínio puro | unit | unit | ✅ OK |
| T3 | Domínio puro | unit | unit | ✅ OK |
| T4 | Serviço com Prisma | none | none | ✅ OK |
| T5 | Serviço com Prisma | none | none | ✅ OK |
| T6 | Componente client | none | none | ✅ OK |
| T7 | Server Action | none | none | ✅ OK |
| T8 | Componente client | none | none | ✅ OK |
| T9 | Componente client | none | none | ✅ OK |
