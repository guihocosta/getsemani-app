# Capacitações por pessoa — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/capacitacoes/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Gerada a partir da amostragem de `tests/unit/` (31 arquivos), de `vitest.config.ts` e de `CLAUDE.md`. Guidelines encontradas: `CLAUDE.md` ("Testes unitários cobrem regra de negócio de risco… Bug corrigido ganha teste que o reproduz"), `vitest.config.ts`, `package.json`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio puro (`src/modules/*/domain/*.ts`, funções `decide*`/`build*`/`group*` em `services/`) | unit | Todos os ramos; 1:1 com as ACs da spec; todo edge case listado tem teste | `tests/unit/*.test.ts` | `npm run test` |
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
T1 → T2
```

### Phase 2: Serviços de capacitação

```
T3 → T4 → T5
```

### Phase 3: UI da pessoa e do líder

```
T6 → T7 → T8 → T9
```

### Phase 4: Vagas e candidatos

```
T10 → T11 → T12 → T13
```

---

## Task Breakdown

### T1: Criar o modelo `UserSkill` e a migration

**What**: Adicionar o modelo `UserSkill` (unique `[userId, roleId]`, cascade em `user` e `role`, índice em `roleId`) e as contra-relações em `User` e `Role`, gerando a migration.
**Where**: `prisma/schema.prisma`
**Depends on**: None
**Reuses**: Padrão de `Membership` (cascade + unique composto) em `prisma/schema.prisma:88`
**Requirement**: CAPA-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `model UserSkill` com `@@unique([userId, roleId])` e `@@index([roleId])`
- [x] `User.skills` e `Role.userSkills` declarados
- [x] `npx prisma migrate dev --name user_skill` gera a migration sem erro
- [x] Gate check passa: `npm run typecheck && npm run lint && npm run test && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(capacitacoes): adicionar modelo UserSkill`

---

### T2: Escrever `decideSetSkill`

**What**: Função pura que decide se uma alteração de capacitação é permitida, retornando `"OK" | "FORBIDDEN" | "ROLE_INACTIVE"`, mais os testes unitários dos três ramos.
**Where**: `src/modules/ministries/domain/capabilities.ts`
**Depends on**: T1
**Reuses**: Padrão de `decideAllocate` em `src/modules/scheduling/services/allocateVolunteer.ts:23`
**Requirement**: CAPA-01, CAPA-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sem membership ACTIVE retorna `"FORBIDDEN"` (CAPA-01.4, CAPA-03.3)
- [ ] Função inativa retorna `"ROLE_INACTIVE"`
- [ ] Membership ACTIVE + função ativa retorna `"OK"`
- [ ] Testes em `tests/unit/capabilities.test.ts`, 3 testes passam
- [ ] Gate check passa: `npm run test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(capacitacoes): adicionar regra pura decideSetSkill`

---

### T3: Serviço de escrita da própria capacitação

**What**: `setOwnSkill({ roleId, enabled })` — `requireUser`, busca a função com o ministério, resolve membership ACTIVE, aplica `decideSetSkill` e faz `upsert`/`deleteMany` idempotente.
**Where**: `src/modules/ministries/services/userSkills.ts`
**Depends on**: None
**Reuses**: `requireUser` (`src/modules/identity/services/authz.ts:39`); padrão de `upsert` de `addExtraSlot.ts:4`
**Requirement**: CAPA-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `enabled: true` faz `upsert` (marcar duas vezes não duplica — CAPA-01.5)
- [ ] `enabled: false` faz `deleteMany` (desmarcar duas vezes não estoura)
- [ ] Decisão diferente de `"OK"` lança `new Error("FORBIDDEN")`
- [ ] Nenhuma `Allocation` é tocada (CAPA-01.3)
- [ ] Gate check passa: `npm run test && npm run typecheck`

**Tests**: none
**Gate**: full

**Commit**: `feat(capacitacoes): adicionar servico setOwnSkill`

---

### T4: Serviço de escrita da capacitação de um membro

**What**: `setMemberSkill({ userId, roleId, enabled })` no mesmo arquivo — `requireLeaderOf(role.ministryId)`, confirma membership ACTIVE do alvo e reaproveita `decideSetSkill`.
**Where**: `src/modules/ministries/services/userSkills.ts` (modify)
**Depends on**: T3
**Reuses**: `requireLeaderOf` (`src/modules/identity/services/authz.ts:63`), que já libera admin via `isLeaderOf`
**Requirement**: CAPA-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Líder de outro ministério recebe `FORBIDDEN` e nada é gravado (CAPA-03.3)
- [ ] Admin consegue editar em qualquer ministério (CAPA-03.4)
- [ ] Alvo sem membership ACTIVE recebe `FORBIDDEN`
- [ ] Gate check passa: `npm run test && npm run typecheck`

**Tests**: none
**Gate**: full

**Commit**: `feat(capacitacoes): adicionar servico setMemberSkill`

---

### T5: Serviços de leitura de capacitação

**What**: `listOwnSkillOptions`, `listMinistrySkillMatrix`, `capableRoleIds` e `capableUserIdsForRole` no mesmo arquivo, todos filtrando por `Membership.status = ACTIVE` e `Role.active = true`.
**Where**: `src/modules/ministries/services/userSkills.ts` (modify)
**Depends on**: T4
**Reuses**: Consulta de memberships de `app/(app)/vagas/page.tsx:22`
**Requirement**: CAPA-01, CAPA-03, CAPA-04, CAPA-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `listOwnSkillOptions` retorna só funções ativas de ministérios com membership ACTIVE, com flag de capacitado
- [ ] `listMinistrySkillMatrix` deduplica membros com duas memberships no mesmo ministério
- [ ] Capacitação de quem perdeu a membership não aparece em nenhuma das quatro leituras
- [ ] `capableRoleIds` e `capableUserIdsForRole` retornam `Set<string>`
- [ ] Gate check passa: `npm run test && npm run typecheck`

**Tests**: none
**Gate**: full

**Commit**: `feat(capacitacoes): adicionar leituras de capacitacao`

---

### T6: Server Action da capacitação própria

**What**: `setOwnSkillAction(roleId, enabled)` retornando `{ ok, error? }`, com tradução de `FORBIDDEN` para pt-BR e `revalidatePath("/perfil")`.
**Where**: `app/(app)/perfil/actions.ts` (modify)
**Depends on**: None
**Reuses**: `handleActionError` e o formato `{ ok, error? }` de `app/(app)/escalas/actions.ts:156`
**Requirement**: CAPA-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Retorna `{ ok: true }` no caminho feliz
- [ ] `FORBIDDEN` vira mensagem pt-BR, sem vazar o código
- [ ] `revalidatePath("/perfil")` chamado no sucesso
- [ ] Gate check passa: `npm run test && npm run typecheck`

**Tests**: none
**Gate**: full

**Commit**: `feat(capacitacoes): adicionar action de capacitacao propria`

---

### T7: Componente "Minhas funções"

**What**: Componente client com chips marcáveis por função, estado otimista e mensagem de lista vazia "Entre em um ministério para escolher suas funções."
**Where**: `app/(app)/perfil/SkillsSection.tsx`
**Depends on**: T6
**Reuses**: Padrão de chip de `app/(app)/escalas/ScheduleForm.tsx:143`; tokens de tema de `app/globals.css`
**Requirement**: CAPA-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Chips agrupados por ministério, marcados conforme o estado atual (CAPA-01.1)
- [ ] Clique reflete na tela sem recarregar (CAPA-01.2)
- [ ] Sem membership ACTIVE exibe o texto da AC CAPA-01.6
- [ ] Só tokens de tema, nenhuma cor crua do Tailwind
- [ ] Gate check passa: `npm run typecheck && npm run lint && npm run test && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(capacitacoes): adicionar secao Minhas funcoes no perfil`

---

### T8: Montar a seção no `/perfil`

**What**: Carregar `listOwnSkillOptions` e renderizar `SkillsSection` sob o cabeçalho "Minhas funções", entre "Seus dados" e "Meus ministérios".
**Where**: `app/(app)/perfil/page.tsx` (modify)
**Depends on**: T7
**Reuses**: Estrutura de `Card` + `eyebrow` já usada na própria página
**Requirement**: CAPA-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Seção renderiza com os dados reais do usuário logado
- [ ] Nenhuma seção existente da página muda de posição ou comportamento
- [ ] Gate check passa: `npm run typecheck && npm run lint && npm run test && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(capacitacoes): exibir Minhas funcoes na pagina de perfil`

---

### T9: Capacitação da equipe em `/admin/ministerios`

**What**: Action `setMemberSkillAction` mais o componente `MemberSkillsRow` (membro + chips das funções do ministério), plugados no card do ministério.
**Where**: `app/(app)/admin/ministerios/MemberSkillsRow.tsx`
**Depends on**: T8
**Reuses**: `RoleRow.tsx` e `AddRoleForm.tsx` do mesmo diretório; action `setMemberSkill` de T4
**Requirement**: CAPA-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cada ministério liderado lista membros ACTIVE com as funções ativas marcáveis (CAPA-03.1)
- [ ] Marcar e desmarcar persiste (CAPA-03.2)
- [ ] Ministério que o usuário não lidera não aparece editável
- [ ] Gate check passa: `npm run typecheck && npm run lint && npm run test && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(capacitacoes): permitir lider editar capacitacao da equipe`

---

### T10: Escrever `groupVagasByCapability`

**What**: Função pura que separa itens em `{ praVoce, outras }` por `roleId`, preservando a ordem de entrada, mais os testes unitários.
**Where**: `src/modules/scheduling/domain/groupVagas.ts`
**Depends on**: None
**Reuses**: Padrão de função pura + teste de `patchOccurrenceSlot` (`app/(app)/escalas/occurrenceCache.ts` + `tests/unit/patchOccurrenceSlot.test.ts`)
**Requirement**: CAPA-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Separa corretamente com capacitação parcial (CAPA-04.1)
- [ ] `Set` vazio devolve tudo em `outras` (CAPA-04.3)
- [ ] Todos capacitados devolve `outras` vazio (CAPA-04.4)
- [ ] Ordem de entrada preservada dentro de cada grupo (CAPA-04.5)
- [ ] Lista vazia devolve os dois grupos vazios (CAPA-04.6)
- [ ] Testes em `tests/unit/groupVagas.test.ts`, 5 testes passam
- [ ] Gate check passa: `npm run test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(capacitacoes): adicionar agrupamento de vagas por capacitacao`

---

### T11: Agrupar a tela de Vagas

**What**: Carregar `capableRoleIds`, incluir `roleId` no tipo `Item`, agrupar com `groupVagasByCapability` e renderizar os cabeçalhos "Pra você" e "Outras vagas" condicionalmente.
**Where**: `app/(app)/vagas/page.tsx` (modify)
**Depends on**: T10
**Reuses**: `groupVagasByCapability` (T10); `EmptyState` já usado na página
**Requirement**: CAPA-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Vagas livres e pedidos de troca são classificados pela mesma regra (CAPA-04.2)
- [ ] Cabeçalho de grupo vazio não é renderizado (CAPA-04.3, CAPA-04.4)
- [ ] Sem itens, o `EmptyState` atual aparece sem cabeçalho (CAPA-04.6)
- [ ] Gate check passa: `npm run typecheck && npm run lint && npm run test && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(capacitacoes): separar Vagas em Pra voce e Outras vagas`

---

### T12: Capacitação na ordenação de candidatos

**What**: `buildCandidateList` passa a receber `capableUserIds: Set<string>`, expor `capable: boolean` em `AllocationCandidate` e ordenar capacitados primeiro, carga 30d como desempate; testes atualizados.
**Where**: `src/modules/scheduling/services/candidateList.ts` (modify)
**Depends on**: T11
**Reuses**: A própria função e `tests/unit/candidateList.test.ts` existentes
**Requirement**: CAPA-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Capacitado com carga alta vem antes de não capacitado com carga baixa (CAPA-05.1)
- [ ] Dentro de cada grupo a ordem por carga 30d é mantida (CAPA-05.4)
- [ ] `Set` vazio preserva exatamente o comportamento atual
- [ ] Os 4 testes existentes continuam passando e 3 novos cobrem a capacitação (7 no total)
- [ ] Gate check passa: `npm run test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(capacitacoes): ordenar candidatos por capacitacao`

---

### T13: Selo "não capacitado" no detalhe da vaga

**What**: Exibir o `Badge` "não capacitado" ao lado dos candidatos sem capacitação, mantendo o botão clicável, e alimentar `capableUserIds` a partir da action que carrega os candidatos.
**Where**: `app/(app)/escalas/SlotDetailSheet.tsx` (modify)
**Depends on**: T12
**Reuses**: Padrão do `Badge tone="danger"` de "Indisponível" em `SlotDetailSheet.tsx:124`
**Requirement**: CAPA-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Selo aparece só para quem não é capacitado na função da vaga (CAPA-05.2)
- [ ] Candidato não capacitado continua clicável e alocável (CAPA-05.3)
- [ ] Selo "Indisponível" continua funcionando junto do novo
- [ ] Gate check passa: `npm run typecheck && npm run lint && npm run test && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(capacitacoes): marcar candidato nao capacitado no detalhe da vaga`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ------→ T2
Phase 2:  T3 ------→ T4 ------→ T5
Phase 3:  T6 ------→ T7 ------→ T8 ------→ T9
Phase 4:  T10 -----→ T11 -----→ T12 -----→ T13
```

Execução estritamente sequencial: um agente por vez, uma tarefa por vez, na ordem.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: modelo `UserSkill` | 1 arquivo (schema) | ✅ Granular |
| T2: `decideSetSkill` | 1 função pura | ✅ Granular |
| T3: `setOwnSkill` | 1 função de serviço | ✅ Granular |
| T4: `setMemberSkill` | 1 função, mesmo arquivo | ✅ Granular |
| T5: 4 leituras | 1 arquivo, leituras coesas do mesmo modelo | ⚠️ OK — coeso |
| T6: action própria | 1 action | ✅ Granular |
| T7: `SkillsSection` | 1 componente | ✅ Granular |
| T8: montagem no `/perfil` | 1 arquivo | ✅ Granular |
| T9: `MemberSkillsRow` + action | 1 componente + wiring | ⚠️ OK — coeso |
| T10: `groupVagasByCapability` | 1 função pura | ✅ Granular |
| T11: agrupamento em `/vagas` | 1 arquivo | ✅ Granular |
| T12: `buildCandidateList` | 1 função | ✅ Granular |
| T13: selo no detalhe | 1 componente | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | primeiro da Phase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None | primeiro da Phase 2 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | None | primeiro da Phase 3 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | None | primeiro da Phase 4 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |

As dependências entre fases (T3 precisa do schema de T1, T11 precisa das leituras de T5) são garantidas pela execução sequencial das fases, não por arestas dentro de uma fase.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Schema Prisma | none | none | ✅ OK |
| T2 | Domínio puro | unit | unit | ✅ OK |
| T3 | Serviço com Prisma | none | none | ✅ OK |
| T4 | Serviço com Prisma | none | none | ✅ OK |
| T5 | Serviço com Prisma | none | none | ✅ OK |
| T6 | Server Action | none | none | ✅ OK |
| T7 | Componente client | none | none | ✅ OK |
| T8 | Página | none | none | ✅ OK |
| T9 | Componente client + action | none | none | ✅ OK |
| T10 | Domínio puro | unit | unit | ✅ OK |
| T11 | Página | none | none | ✅ OK |
| T12 | Domínio puro (`buildCandidateList`) | unit | unit | ✅ OK |
| T13 | Componente client | none | none | ✅ OK |
