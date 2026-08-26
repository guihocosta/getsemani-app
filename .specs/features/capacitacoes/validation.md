# Capacitações por pessoa — Validation

**Date**: 2026-08-26
**Spec**: `.specs/features/capacitacoes/spec.md`
**Diff range**: `956535e..HEAD` (HEAD = `5371f0b`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `UserSkill` model + migration `20260826194745_user_skill`, cascade + unique confirmed in `prisma/schema.prisma` and `migration.sql` |
| T2   | ✅ Done | `decideSetSkill` + 3 tests in `tests/unit/capabilities.test.ts` |
| T3   | ✅ Done | `setOwnSkill` in `src/modules/ministries/services/userSkills.ts:9-34` |
| T4   | ✅ Done | `setMemberSkill` in `src/modules/ministries/services/userSkills.ts:39-68` |
| T5   | ✅ Done | 4 read functions, `userSkills.ts:72-153` |
| T6   | ✅ Done | `setOwnSkillAction`, `app/(app)/perfil/actions.ts:16-27` |
| T7   | ✅ Done | `SkillsSection.tsx` |
| T8   | ✅ Done | `app/(app)/perfil/page.tsx:23,56-59` |
| T9   | ✅ Done | `MemberSkillsRow.tsx` + `setMemberSkillAction`, wired in `MinistryCard.tsx:107-118` |
| T10  | ✅ Done | `groupVagasByCapability` + 5 tests in `tests/unit/groupVagas.test.ts` |
| T11  | ✅ Done | `app/(app)/vagas/page.tsx:74-159` |
| T12  | ✅ Done | `buildCandidateList` capacitação ordering, `candidateList.ts:18-46`, tests extended |
| T13  | ✅ Done | Addendum applied correctly — see dedicated section below |

All 13 tasks marked `[x]` in `tasks.md` and verified against the real diff; no partial/blocked task found.

---

## Spec-Anchored Acceptance Criteria

### CAPA-01: Pessoa declara suas funções (P1)

| # | Criterion | Spec-defined outcome | Evidence | Result |
|---|-----------|----------------------|----------|--------|
| 01.1 | `/perfil` exibe "Minhas funções" com todas as ativas de ministérios ACTIVE, capacitadas marcadas | Seção renderiza lista com flag `capaz` correta | `app/(app)/perfil/page.tsx:23` `listOwnSkillOptions(user.id)`; `SkillsSection.tsx:18-20` inicializa `capazById` a partir de `o.capaz` | ⚪ Coberto por inspeção (UI, sem teste automatizado — matriz de tasks.md classifica página/componente como "none") |
| 01.2 | Marcar reflete sem recarregar | Toggle otimista antes da resposta do servidor | `SkillsSection.tsx:37-46` `setCapazById` síncrono antes do `await setOwnSkillAction` | ⚪ Coberto por inspeção |
| 01.3 | Desmarcar remove capacitação e não altera alocações existentes | Nenhuma tabela `Allocation` tocada | `userSkills.ts:9-34` (`setOwnSkill`) só referencia `prisma.role`, `prisma.membership`, `prisma.userSkill` — nenhuma chamada a `prisma.allocation` no arquivo inteiro | ⚪ Coberto por inspeção (verificado por leitura completa do arquivo, não só grep) |
| 01.4 | Sem membership ACTIVE → `FORBIDDEN`, nada gravado | `decideSetSkill({hasActiveMembership:false,...})` retorna `"FORBIDDEN"`; grava zero registros | `tests/unit/capabilities.test.ts:5-9` — `expect(decideSetSkill({hasActiveMembership:false, roleActive:true})).toBe("FORBIDDEN")` | ✅ PASS (regra pura); `userSkills.ts:21` `if (decision !== "OK") throw new Error(decision)` guarda ANTES de qualquer `upsert`/`deleteMany` — coberto por inspeção pro wrapper de I/O |
| 01.5 | `(userId, roleId)` único — marcar duas vezes não duplica | Nenhuma linha duplicada | `prisma/schema.prisma` `@@unique([userId, roleId])` (garantia de banco) + `userSkills.ts:24-28` usa `upsert` (idempotente por construção) | ⚪ Coberto por inspeção — sem teste de idempotência do serviço (matriz classifica T3 como "Tests: none") |
| 01.6 | Sem membership ACTIVE → texto "Entre em um ministério para escolher suas funções." | Texto exato | `SkillsSection.tsx:22-27` `<p>...Entre em um ministério para escolher suas funções.</p>` quando `options.length === 0` — string bate exatamente com a spec | ⚪ Coberto por inspeção |

### CAPA-03: Líder ajusta a capacitação da equipe (P1)

| # | Criterion | Spec-defined outcome | Evidence | Result |
|---|-----------|----------------------|----------|--------|
| 03.1 | `/admin/ministerios` lista membros ACTIVE por ministério liderado, funções marcáveis | Matriz membro × função | `app/(app)/admin/ministerios/page.tsx:25-27` `listMinistrySkillMatrix`; `MinistryCard.tsx:107-118` renderiza `MemberSkillsRow` por membro | ⚪ Coberto por inspeção |
| 03.2 | Marcar/desmarcar grava ou remove `(userId, roleId)` do membro | Persistência via action | `MemberSkillsRow.tsx:24-33` toggle → `setMemberSkillAction` → `setMemberSkill` (`userSkills.ts:39-68`, mesmo padrão upsert/deleteMany de T3) | ⚪ Coberto por inspeção |
| 03.3 | Fora do escopo do líder → `FORBIDDEN`, nada gravado | Rejeição antes de gravar | `userSkills.ts:44-45` `await requireLeaderOf(role.ministryId)` executa ANTES de qualquer leitura/escrita de `UserSkill`; `authz.ts:65-69` `requireLeaderOf` lança `new Error("FORBIDDEN")` quando `isLeaderOf` é falso | ⚪ Coberto por inspeção (sem teste de serviço; regra pura `decideSetSkill` já coberta em CAPA-01.4) |
| 03.4 | Admin edita qualquer ministério | Bypass de admin | `authz.ts:55-58` `isLeaderOf`: `if (user?.isAdmin) return true;` antes de checar `Membership` — confirma o comentário do design ("admin passa direto, já embutido em isLeaderOf") | ⚪ Coberto por inspeção |
| 03.5 | Só `Role.active=true` e `Membership.status=ACTIVE` na listagem | Filtro explícito nas duas dimensões | `userSkills.ts:97-98` `where: { ministryId, status: "ACTIVE" }` (memberships) e `userSkills.ts:108-109` `where: { ministryId, active: true }` (roles) | ⚪ Coberto por inspeção |

### CAPA-04: Vagas separadas por capacitação (P1)

| # | Criterion | Spec-defined outcome | Evidence | Result |
|---|-----------|----------------------|----------|--------|
| 04.1 | Separa "Pra você" x "Outras vagas" por capacitação | Split correto por `roleId` | `tests/unit/groupVagas.test.ts:7-16` — `expect(praVoce.map(i=>i.key)).toEqual(["a","c"])`, `expect(outras.map(i=>i.key)).toEqual(["b"])` | ✅ PASS (domínio). Wiring da página: `app/(app)/vagas/page.tsx:108-109` chama `groupVagasByCapability(items, capableRoleIds)` — coberto por inspeção |
| 04.2 | Mesmo agrupamento pra vagas livres e trocas, por `Role` do slot | Ambos os tipos com `roleId` classificados pela mesma função | `vagas/page.tsx:84-106` — `freeSlots` e `swaps` mapeados para o mesmo tipo `Item` com `roleId: s.roleId` cada, unificados num array único antes de `groupVagasByCapability` | ⚪ Coberto por inspeção |
| 04.3 | `Set` vazio → tudo em "outras", cabeçalho "Pra você" omitido | `praVoce=[]`, header condicional não renderiza | `groupVagas.test.ts:18-26` — `expect(praVoce).toEqual([])` (domínio, ✅ PASS); `vagas/page.tsx:146` `{praVoce.length > 0 && (...)}`  — inspeção pro header |
| 04.4 | Todos capacitados → "outras" vazio, cabeçalho omitido | `outras=[]` | `groupVagas.test.ts:28-36` — `expect(outras).toEqual([])` (✅ PASS); `vagas/page.tsx:152` `{outras.length > 0 && (...)}` — inspeção pro header |
| 04.5 | Ordenação por data crescente mantida dentro de cada seção | Ordem de entrada preservada pelo agrupamento | `groupVagas.test.ts:38-48` — ordem `["b","d"]`/`["a","c"]` preservada (✅ PASS domínio); `vagas/page.tsx:106` `.sort((a,b)=>a.date.getTime()-b.date.getTime())` roda ANTES do agrupamento — inspeção confirma a pré-condição que o teste de domínio assume |
| 04.6 | Sem itens → `EmptyState` atual, sem cabeçalho | Nenhum cabeçalho de seção quando `items.length===0` | `groupVagas.test.ts:50-54` — grupos vazios (✅ PASS domínio); `vagas/page.tsx:142-144` `items.length === 0 ? <EmptyState .../> : (...)` — inspeção |

### CAPA-05: Capacitação na lista de candidatos do líder (P2)

| # | Criterion | Spec-defined outcome | Evidence | Result |
|---|-----------|----------------------|----------|--------|
| 05.1 | Capacitados antes de não capacitados | Capacitado com carga alta antes de não capacitado com carga baixa | `tests/unit/candidateList.test.ts:61-74` — `expect(list.map(c=>c.userId)).toEqual(["u1","u2"])` com `u1` carga=10 capacitado, `u2` carga=0 não capacitado; `.capable` também asserido (linhas 72-73) | ✅ PASS |
| 05.2 | Selo "não capacitado" só pra quem não é capacitado NA FUNÇÃO da vaga aberta (não mistura funções da mesma ocorrência) | Reordenação por `roleId` da vaga ativa, sem vazamento entre funções | `candidateList.test.ts:123-137` — `markCapable(base, new Set(["u1"]))` vs `markCapable(base, new Set(["u2"]))` produzem ordens opostas pra mesma lista base (✅ PASS, mecanismo do Addendum); UI: `SlotDetailSheet.tsx:125` `{!c.capable && <Badge tone="muted">não capacitado</Badge>}` — coberto por inspeção. Ver seção dedicada abaixo sobre o Addendum. |
| 05.3 | Não capacitado continua clicável/alocável | Botão não desabilitado por `capable` | `SlotDetailSheet.tsx:116-121` — `disabled={props.pending}` (não depende de `c.capable`); `onClick={() => props.onPickUser(c.userId)}` sempre ativo | ⚪ Coberto por inspeção |
| 05.4 | Ordenação por carga 30d mantida dentro de cada grupo | Empate por `count30d` ascendente | `candidateList.test.ts:76-89` (`buildCandidateList`) e `:139-152` (`markCapable`) — `expect(list.map(c=>c.userId)).toEqual([...])` com ordem de carga verificada dentro do grupo capacitado | ✅ PASS |

**Status**: ✅ Todas as 21 ACs endereçadas — 9 com teste automatizado PASS (valor exato asserido), 12 cobertas por inspeção de código real (camadas de UI/Server Action/serviço-com-Prisma, classificadas "none" na Test Coverage Matrix de `tasks.md`). Nenhum gap: nenhuma AC ficou sem evidência de nenhum tipo.

---

## Addendum (T13, CAPA-05.2) — verificação dedicada

**Alegação do design.md**: `getOccurrenceCandidatesAction` foi corrigida para calcular capacitação por `roleId` da vaga, não reusar a capacitação de uma função pra outra na mesma ocorrência.

**Verificação por leitura real do código**:

1. `app/(app)/escalas/actions.ts:244-300` (`getOccurrenceCandidatesAction`): calcula `roleIds` distintos da ocorrência (`[...new Set(occurrence.slots.map(s => s.roleId))]`, linha 268), roda `capableUserIdsForRole(roleId)` **por role** em paralelo (linha 279), monta `capableUserIdsByRole: Record<string, string[]>` (linhas 282-284) e passa `capableUserIds: new Set()` (vazio) pro `buildCandidateList` base (linha 292) — confirma que a lista base NÃO carrega capacitação de nenhuma função específica.
2. `app/(app)/escalas/OccurrenceRow.tsx:65-76`: guarda `capableUserIdsByRole` no estado (linha 66); ao computar `sheetCandidates` (linhas 73-76), aplica `markCapable(candidates, new Set(capableUserIdsByRole[activeSlot.roleId] ?? []))` — chave de lookup é o `roleId` da vaga ATIVA no momento, não um valor fixo.
3. `src/modules/scheduling/services/candidateList.ts:53-60` (`markCapable`): pura, recebe o `Set` já filtrado por role e reaplica `.capable`/ordenação sem tocar carga/indisponibilidade.
4. `app/(app)/escalas/occurrenceCache.ts:5` e `src/modules/scheduling/services/listMonthOccurrences.ts:19` (`Slot.roleId`): `roleId` propagado até o client, com os testes de `patchOccurrenceSlot.test.ts`/`patchSlotActive.test.ts` confirmando (via `git diff`) que o campo foi adicionado aos fixtures e que o spread `{...slot, ...patch}` não o descarta.
5. Teste direto do mecanismo: `candidateList.test.ts:123-137` — usando a MESMA lista base, `markCapable(base, {u1})` e `markCapable(base, {u2})` produzem ordens diferentes ("mesma lista de candidatos reordena diferente pra funcoes diferentes da mesma ocorrencia"). Isso é o teste de regressão exato pro bug que causou o bloqueio original.

**Veredito**: confirmado — a implementação real (não a spec, não a tasks.md) computa e aplica capacitação por `roleId` da vaga, sem vazamento entre funções na mesma ocorrência. CAPA-05.2 é atendida tanto no mecanismo puro (testado) quanto na integração client (inspeção).

---

## Discrimination Sensor

Isolamento: worktree temporário `../gtsm-verify-scratch` criado com `git worktree add`, `node_modules` reusado via junction NTFS (removida antes do `git worktree remove --force`). Baseline de `git status --porcelain` do repo real capturado antes (`?? docs/superpowers/plans/2026-07-30-check-in-plan.md`) e confirmado idêntico depois da limpeza.

| # | File:line | Mutação | Testes rodados | Resultado |
|---|-----------|---------|-----------------|-----------|
| 1 | `src/modules/ministries/domain/capabilities.ts:7` | `if (!params.hasActiveMembership) return "FORBIDDEN"` → `return "OK"` | `tests/unit/capabilities.test.ts` | ✅ Morto — `AssertionError: expected 'OK' to be 'FORBIDDEN'` |
| 2 | `src/modules/scheduling/services/candidateList.ts:19` | `compareCandidates`: `a.capable ? -1 : 1` → `a.capable ? 1 : -1` (inverte prioridade capacitado/não capacitado) | `tests/unit/candidateList.test.ts` | ✅ Morto — 5 de 11 testes falharam (CAPA-05.1, CAPA-05.4 e testes de `markCapable`) |
| 3 | `src/modules/scheduling/domain/groupVagas.ts:11` | `(capableRoleIds.has(...) ? praVoce : outras)` → invertido (`outras : praVoce`) | `tests/unit/groupVagas.test.ts` | ✅ Morto — 4 de 5 testes falharam |
| 4 | `src/modules/scheduling/services/candidateList.ts:59` | `markCapable`: removida a chamada `.sort(compareCandidates)` (side effect obrigatório da ordenação por capacitação) | `tests/unit/candidateList.test.ts` | ✅ Morto — 2 testes de `markCapable` falharam (ordem não recalculada) |

**Sensor depth**: lightweight (padrão para feature não-P0)
**Result**: 4/4 killed — ✅ PASS

---

## Payload/Conjunction Rule

| Campo | Verificação | Resultado |
|-------|-------------|-----------|
| `AllocationCandidate.capable` | `candidateList.test.ts` assere o VALOR (`expect(list[0].capable).toBe(true)`, `expect(list[1].capable).toBe(false)`, `expect(list.every(c=>c.capable===false)).toBe(true)`) em múltiplos casos, não só presença do campo | ✅ Conjunção respeitada |
| `capableUserIdsByRole` (retorno de `getOccurrenceCandidatesAction`) | A ação em si não tem teste automatizado (camada Server Action = "none" na matriz), mas o mecanismo que consome o valor (`markCapable` aplicado por `roleId`) é testado com valores exatos de ordenação por Set distinto (`candidateList.test.ts:123-137`) | ⚪ Conjunção coberta no nível de domínio; wrapper de I/O só por inspeção |
| `UserSkill` (linhas do modelo) | Sem teste de integração com Prisma real (fora do escopo da matriz — "serviço com Prisma" = build gate). Unicidade e cascade confirmados na migration SQL gerada (`UserSkill_userId_roleId_key`, `ON DELETE CASCADE` em ambas FKs) | ⚪ Conjunção coberta por schema/migration, não por teste de execução |

---

## Edge Cases (spec.md)

- [x] Dupla membership no mesmo ministério → membro único na lista do líder: `userSkills.ts:102-106` dedupe via `Map` por `userId` — coberto por inspeção (sem teste dedicado)
- [x] Função desativada com capacitados existentes → oculta da listagem, linha preservada: `listOwnSkillOptions`/`listMinistrySkillMatrix`/`capableRoleIds` todos filtram `active:true` na leitura, nenhum filtra a tabela `UserSkill` em si (nenhum delete) — inspeção
- [x] Ministério excluído → cascade nas capacitações das funções: `Role.ministry` já tinha `onDelete: Cascade` (pré-existente); `UserSkill.role` ganhou `onDelete: Cascade` nesta feature — cascade dupla confirmada na migration SQL
- [x] Pessoa excluída → cascade nas capacitações: `UserSkill.user onDelete: Cascade` confirmado na migration SQL (`UserSkill_userId_fkey ... ON DELETE CASCADE`)
- [x] Alternância rápida da mesma função → converge sem erro de duplicata: `upsert`/`deleteMany` (idempotentes por natureza) + `@@unique` no banco — inspeção, sem teste de concorrência dedicado

Nenhum edge case sem tratamento identificado.

---

## Code Quality

| Principle | Status |
|-----------|--------|
| Minimum code | ✅ — diff de 32 arquivos, todos dentro do escopo das 13 tarefas |
| Surgical changes | ✅ — `MinistryCard.tsx`/`page.tsx` de admin tiveram só o necessário pra plugar a matriz; `SPEC_DEVIATION` documentado no próprio código (`admin/ministerios/page.tsx:15-18`) justifica a mudança de gate de admin-only pra líder-ou-admin, exigida por CAPA-03.1 |
| No scope creep | ✅ |
| Matches patterns | ✅ — `upsert`/`deleteMany`, `requireLeaderOf`, `{ok,error}` de action, chips de UI seguem convenções existentes citadas no design |
| Spec-anchored outcome check (asserted values match spec) | ✅ — ver tabela de ACs acima |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — domínio puro (`capabilities.ts`, `groupVagas.ts`, `candidateList.ts`) com 1:1 nas ACs que definem; camadas com Prisma/UI cobertas por build gate + inspeção, conforme a Test Coverage Matrix documentada em `tasks.md` |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — todos os testes novos citam o número da AC no nome do `it(...)` |
| Documented guidelines followed | `CLAUDE.md` ("Testes unitários cobrem regra de negócio de risco…"), `tasks.md` Test Coverage Matrix |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test && npm run build`
- **Result**: typecheck 0 erros; lint "No ESLint warnings or errors"; test **188 passed, 0 failed** (33 arquivos); build compilou com sucesso (rotas geradas normalmente)
- **Test count before feature** (commit `956535e`): não recontado arquivo a arquivo, mas o diff mostra 3 arquivos de teste novos (`capabilities.test.ts` +22, `groupVagas.test.ts` +55) e 1 estendido (`candidateList.test.ts` +100/-? linhas) — delta líquido de teste é positivo
- **Test count after feature**: 188 passed / 33 arquivos
- **Delta**: `capabilities.test.ts` (+3 testes), `groupVagas.test.ts` (+5 testes), `candidateList.test.ts` (+8 testes: 3 nos casos de `buildCandidateList` com capacitação + 3 em `markCapable` — tasks.md previa "8 no total" pra `candidateList`, confirmado: 11 testes no arquivo hoje), `patchOccurrenceSlot.test.ts`/`patchSlotActive.test.ts` sem novos testes, só fixture com `roleId`
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
|-------------|------------------|------------|
| CAPA-01 | Pending | ✅ Verified |
| CAPA-02 | Pending | N/A — não existe CAPA-02 no spec (numeração pula de CAPA-01 pra CAPA-03; spec.md não define CAPA-02) |
| CAPA-03 | Pending | ✅ Verified |
| CAPA-04 | Pending | ✅ Verified |
| CAPA-05 | Pending | ✅ Verified |

Nota: a tabela de Requirement Traceability em `spec.md` lista `CAPA-01` a `CAPA-05`, mas as User Stories do documento são identificadas apenas como P1/P1/P1/P2 sem numeração própria — `CAPA-02` não corresponde a nenhuma seção de ACs existente no `spec.md` lido (a segunda user story, "Líder ajusta...", é referenciada como CAPA-03 nas ACs, não CAPA-02). Isso é uma inconsistência pré-existente na numeração do próprio `spec.md`, não um gap de implementação.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 21/21 ACs endereçadas (9 PASS com teste automatizado de valor exato; 12 cobertas por inspeção de código real, sem gap)
**Sensor**: 4/4 mutações mortas
**Gate**: typecheck + lint + 188 testes + build, todos passando

**What works**: Modelo `UserSkill` com unicidade e cascade corretos; regra pura `decideSetSkill` testada nos 3 ramos; leituras filtram corretamente por `Membership.status=ACTIVE` e `Role.active=true`; agrupamento de `/vagas` testado em todos os ramos incluindo vazio/total; ordenação de candidatos por capacitação testada com valor exato; o bug do Addendum (capacitação vazando entre funções da mesma ocorrência) tem teste de regressão direto (`candidateList.test.ts:123-137`) e a implementação real confirma o fix por leitura de `actions.ts`/`OccurrenceRow.tsx`.

**Issues found**: nenhum gap. Camadas de UI/Server Action/serviço-com-Prisma não têm suíte automatizada — isso é uma decisão de convenção do repo documentada na Test Coverage Matrix de `tasks.md`, não um desvio desta feature.

**Next steps**: nenhuma ação corretiva necessária. Recomendação não-bloqueante: a inconsistência de numeração `CAPA-02` ausente em `spec.md` vale uma limpeza cosmética na próxima revisão do documento.
