# Repetir escalação por rodízio — Validation

## Validation: repetir-escalacao - PASS ✅

**Date**: 2026-08-26
**Spec**: `.specs/features/repetir-escalacao/spec.md`
**Diff range**: `c0d7018..HEAD` (HEAD = `d47c978`)
**Verifier**: independent sub-agent (author ≠ verifier) — re-verification, iteration 1 of 3, after fix→re-verify round on the 3 gaps from the previous FAIL report

**Fix commits reviewed since the previous FAIL report** (`586715e..d47c978`):
- `cef1d77` test(rodizio): cobrir precedencia membership sobre capacitacao
- `d47c978` fix(rodizio): nao bloquear copia sem capacitacao declarada

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `rotationCycle Int?` in `prisma/schema.prisma:141`; migration `20260826203304_schedule_rotation_cycle/migration.sql` adds nullable column, no default |
| T2   | ✅ Done | `planRotationPairs`, `src/modules/scheduling/domain/rotation.ts:6-19` |
| T3   | ✅ Done | `decideCopyAllocation`, `rotation.ts:33-47`; 8 branches tested in `tests/unit/rotation.test.ts`, incl. the new precedence test |
| T4   | ✅ Done | `createSchedule.ts:19-21`, `updateSchedule.ts:20-22` both validate 1..12/null, throw `INVALID_ROTATION_CYCLE` before any Prisma write |
| T5   | ✅ Done | `repeatSchedule.ts` — full service, now with `capableByRole: Map<string, Set<string> \| null>` fix |
| T6   | ✅ Done | `ScheduleForm.tsx:141-156` select "Sem rodízio" + 1..12 |
| T7   | ✅ Done | `repeatScheduleAction`, `actions.ts:348-363` |
| T8   | ✅ Done | `OccurrenceMenu.tsx:59-74` item + disabled hint |
| T9   | ✅ Done | `OccurrenceRow.tsx:242-258`, `339-340` wiring + result display |

All 9 tasks marked `[x]` in `tasks.md`. Re-read against the real diff — matches, no partial/blocked task.

---

## Re-Verification of the 3 Previously Reported Gaps

### Gap 1 — Surviving mutant (order of membership/capacitação checks)

**Re-read** `src/modules/scheduling/domain/rotation.ts:44-45`:

```ts
if (!params.isActiveMember) return "SKIP_NOT_MEMBER";
if (!params.isCapable) return "SKIP_NOT_CAPABLE";
```

Order is unchanged — membership is still checked before capacitação, as design.md specifies.

**New test confirmed** in `tests/unit/rotation.test.ts:88-92`:

```ts
it("membership tem precedencia sobre capacitacao quando as duas faltam", () => {
  expect(
    decideCopyAllocation({ ...base, isActiveMember: false, isCapable: false }),
  ).toBe("SKIP_NOT_MEMBER");
});
```

**Sensor re-run** (this session, independently): created an isolated git worktree (`git worktree add ../gtsm-verify-scratch2 HEAD`), reused `node_modules` via an NTFS junction, re-applied the exact same mutation (swapped the two `if` lines so capacitação is checked before membership), and ran `npx vitest run tests/unit/rotation.test.ts` inside the scratch.

Result: **mutant killed** — `decideCopyAllocation > membership tem precedencia sobre capacitacao quando as duas faltam` failed with `expected 'SKIP_NOT_CAPABLE' to be 'SKIP_NOT_MEMBER'` (12/13 tests still passed, 1 failed — the discriminating one). Scratch worktree removed with `git worktree remove --force`; junction deleted first. `git status --porcelain` on the real repo before and after the sensor run is identical:
```
?? .specs/features/repetir-escalacao/validation.md
?? docs/superpowers/plans/2026-07-30-check-in-plan.md
```
(the validation.md entry is this report being (re)written in the real tree, not a sensor artifact — pre-existing from the prior FAIL round).

**Verdict: Gap 1 CLOSED.**

### Gap 2 — REPT-04.4 functional gap (empty `capableUserIdsForRole` blocking 100% of copies)

**Re-read** `src/modules/scheduling/services/repeatSchedule.ts:92-100`:

```ts
// null = ninguem jamais declarou capacitacao nessa funcao (feature nao "existe"
// pra ela ainda, REPT-04.4 "WHERE a capacitacao... existe") -> nao bloqueia,
// igual a filosofia de capacitacoes (AD-002: orienta, nao trava). So bloqueia
// quando ha gente marcada capaz e a pessoa da origem nao esta nesse grupo.
const capableByRole = new Map<string, Set<string> | null>();
for (const roleId of new Set(copies.map((c) => c.roleId))) {
  const set = await capableUserIdsForRole(roleId);
  capableByRole.set(roleId, set.size > 0 ? set : null);
}
```

and the consumption at `repeatSchedule.ts:112-114`:

```ts
const capableSet = capableByRole.get(copy.roleId) ?? null;
const isCapable =
  copy.sourceUserId !== null && (capableSet === null || capableSet.has(copy.sourceUserId));
```

This resolves the gap: when nobody has ever declared capacitação for a role, `capableUserIdsForRole` returns an empty `Set`, which is now converted to `null` before being stored, and `isCapable` treats `capableSet === null` as "capacitação filter not active for this role" (falls through to `true`), matching the spec's revised Assumption ("Só bloqueia quando **alguém** já foi marcado capaz naquela função e a pessoa da origem não está nesse grupo") and AD-002 ("capacitação orienta, não trava"). When at least one person is capable for the role, the `Set` is non-empty and the original blocking behavior (origin person must be in the set) is preserved.

This is a Prisma-service layer with no automated test (`tasks.md` Test Coverage Matrix classifies "Serviço com Prisma" as `none` — same treatment as every other service layer in this feature, e.g. T4/T5's own Done-when items are `none`/build-gate only). Confirmed by inspection only, consistent with the project's own testing convention (`CLAUDE.md`: unit tests cover pure domain risk logic; Prisma-wrapper I/O is covered by the build gate).

**Verdict: Gap 2 CLOSED** (by code inspection; no automated regression protection exists for this specific line, same as the rest of the service layer in this feature — this is expected, not a new gap).

### Gap 3 — REPT-01.4 error-message translation (orchestrator's claimed false positive)

**Re-read independently**, not taking the orchestrator's claim on faith:

`app/(app)/escalas/actions.ts:29-34`:
```ts
function friendlyError(e: unknown): string {
  const msg = (e as Error)?.message ?? "";
  if (msg.includes("roleIds")) return "Escolha pelo menos uma função.";
  if (msg === "FORBIDDEN") return "Você não tem permissão para essa ação.";
  if (msg === "INVALID_ROTATION_CYCLE") return "Ciclo de rodízio deve ser entre 1 e 12.";
  return "Não deu para salvar. Confira os campos e tente de novo.";
}
```
Line 33 has the exact translation the spec (REPT-01.4) requires, word for word.

`friendlyError` is used at `actions.ts:61` (`createScheduleAction`'s catch) and `actions.ts:90` (`updateScheduleAction`'s catch) — confirmed by reading both functions in full (`actions.ts:37-93`).

`INVALID_ROTATION_CYCLE` is thrown only by `createSchedule.ts:19-21` and `updateSchedule.ts:20-22` (confirmed above) — never by `repeatSchedule.ts`, which throws `NO_ROTATION_CYCLE` instead (`repeatSchedule.ts:9-13,26`) and is handled by its own dedicated catch block in `repeatScheduleAction` (`actions.ts:355-361`), which does not call `friendlyError` and does not need the `INVALID_ROTATION_CYCLE` branch since that error can never reach it.

So the call graph is: `INVALID_ROTATION_CYCLE` → thrown only in `createSchedule`/`updateSchedule` → caught only in `createScheduleAction`/`updateScheduleAction` → both route through `friendlyError`, which already translates it (present since `git log` shows this line existed at commit `3c8d426`, i.e. before the previous validation round even ran, per the orchestrator's claim, which is confirmed correct by this independent read).

**Verdict: Gap 3 was a FALSE POSITIVE in the previous report** — the translation was already present and reachable through the correct call path in `createScheduleAction`/`updateScheduleAction`. No fix was needed; none was applied. Confirmed directly by file read, not by trusting the orchestrator's assertion.

---

## Spec-Anchored Acceptance Criteria (full re-check, all ACs)

### REPT-01: Definir o ciclo de rodízio da escala (P1)

| # | Criterion | Spec-defined outcome | Evidence | Result |
|---|-----------|----------------------|----------|--------|
| 01.1 | Campo "Ciclo de rodízio" com 1-12 e "Sem rodízio" na criação/edição | Select com essas opções exatas | `ScheduleForm.tsx:142-155` — `<option value="">Sem rodízio</option>` + `Array.from({length:12},(_,i)=>i+1)` | ✅ PASS (inspeção — camada de componente client, "none" na Test Coverage Matrix) |
| 01.2 | Salvar com ciclo escolhido persiste `rotationCycle` | Valor gravado | `createSchedule.ts:33` `rotationCycle: data.rotationCycle ?? null`; `updateSchedule.ts:36` idem | ⚪ Coberto por inspeção |
| 01.3 | "Sem rodízio" persiste nulo | `rotationCycle` nulo | `data.rotationCycle` é `.nullish()` no Zod (`createSchedule.ts:13`); `actions.ts:54/83` envia `null` quando campo vazio (`rotationCycle ? Number(...) : null`) | ⚪ Coberto por inspeção |
| 01.4 | Fora de 1-12 rejeita com a mensagem "Ciclo de rodízio deve ser entre 1 e 12." antes de gravar | Erro traduzido, sem gravar | `createSchedule.ts:19-21`/`updateSchedule.ts:20-22` lançam `INVALID_ROTATION_CYCLE` ANTES de qualquer chamada Prisma de escrita; `actions.ts:33` traduz para a mensagem literal exigida, usada em `actions.ts:61,90` | ✅ PASS — gap fechado (falso positivo confirmado nesta rodada) |
| 01.5 | Escalas existentes ficam com `rotationCycle` nulo | Coluna nullable sem default | `migration.sql`: `ALTER TABLE "Schedule" ADD COLUMN "rotationCycle" INTEGER;` — sem `NOT NULL`, sem `DEFAULT` | ✅ PASS |

### REPT-02: Repetir a escalação no próximo ciclo (P1)

| # | Criterion | Spec-defined outcome | Evidence | Result |
|---|-----------|----------------------|----------|--------|
| 02.1 | N primeiras ocorrências ACTIVE futuras como destino | No máximo `cycle` pares, um por ocorrência futura | `tests/unit/rotation.test.ts:5-9` — `expect(pairs.length).toBe(2); expect(pairs.map(p=>p.targetIndex)).toEqual([4,5])` | ✅ PASS (valor exato) |
| 02.2 | Origem = mesma escala, N posições antes | `sourceIndex = targetIndex - cycle` | `rotation.test.ts:11-18` — `toEqual([{targetIndex:5,sourceIndex:2},...])` | ✅ PASS |
| 02.3 | Vaga vazia + origem ocupada → alocação PENDING/LEADER | Status e source exatos | `repeatSchedule.ts:132-141` — `prisma.allocation.create({data:{slotId:copy.targetSlotId, userId:..., source:"LEADER", status:"PENDING"}})` | ⚪ Coberto por inspeção (serviço Prisma = "none" na matriz) |
| 02.4 | Pessoa com conta recebe notificação ASSIGNMENT | `notifyUser` com tipo/dedupeKey corretos | `repeatSchedule.ts:144-155` — `notifyUser({userId, type:"ASSIGNMENT", dedupeKey:\`assign:${alloc.id}\`, ...})`, só quando `copy.sourceUserId` truthy | ⚪ Coberto por inspeção |
| 02.5 | Resultado com contagem de preenchidas/puladas | `{filled, skipped}` | `repeatSchedule.ts:165` `return {filled, skipped}`; `OccurrenceRow.tsx:252-256` `${res.filled} ${vagas}, ${res.skipped} ${puladas}` | ⚪ Coberto por inspeção |
| 02.6 | `rotationCycle` nulo → item desabilitado com dica | Texto exato da dica | `OccurrenceMenu.tsx:61` `disabled={props.disabled \|\| props.rotationCycle == null}`; linha 70-72 — string bate exatamente com a spec | ⚪ Coberto por inspeção |
| 02.7 | Não líder → `FORBIDDEN`, nada criado | Erro antes de qualquer leitura/escrita | `repeatSchedule.ts:24-26` — `requireLeaderOf` chamado logo após carregar `Schedule`, antes da query de `occurrences` | ⚪ Coberto por inspeção |
| 02.8 | Rodar duas vezes seguidas não duplica, `filled:0` na 2ª | Fresh read + idempotência | `repeatSchedule.ts:28-32` recarrega `occurrences` do zero a cada chamada; `targetHasAllocation` reflete estado atual → `decideCopyAllocation` retorna `SKIP_SLOT_TAKEN` para toda vaga já preenchida | ⚪ Coberto por inspeção — lógica de decisão testada unitariamente |

### REPT-04: Pular quem não pode servir (P1)

| # | Criterion | Spec-defined outcome | Evidence | Result |
|---|-----------|----------------------|----------|--------|
| 04.1 | Indisponibilidade → vaga vazia, pulada | `"SKIP_UNAVAILABLE"` | `rotation.test.ts:66-68` | ✅ PASS |
| 04.2 | Vaga de destino já ocupada → pulada, intacta | `"SKIP_SLOT_TAKEN"` | `rotation.test.ts:54-56` | ✅ PASS |
| 04.3 | Sem membership ACTIVE → pulada | `"SKIP_NOT_MEMBER"` | `rotation.test.ts:58-60` | ✅ PASS |
| 04.4 | Capacitação bloqueia só quando alguém já foi marcado capaz naquela função | `"SKIP_NOT_CAPABLE"` quando origem não está no grupo capaz; sem bloqueio quando ninguém declarou | `rotation.test.ts:62-64` (domínio, `isCapable=false` → `SKIP_NOT_CAPABLE`); `repeatSchedule.ts:96-100,112-114` — `capableByRole` guarda `null` quando `set.size===0`, e `isCapable` trata `capableSet===null` como "não filtra" | ✅ PASS — spec de Assumptions foi reescrita para casar com este comportamento; gap funcional anterior fechado por leitura de código (sem teste automatizado nessa camada, conforme convenção do projeto) |
| 04.5 | Slot inativo → ignora sem criar alocação | `"SKIP_SLOT_INACTIVE"` | `rotation.test.ts:50-52` | ✅ PASS |
| 04.6 | Sem vaga de mesma função no destino → ignora sem criar vaga nova | Nenhuma cópia gerada | `repeatSchedule.ts:63-64` — `if (!targetSlot) continue;` | ⚪ Coberto por inspeção |

**Status**: 18/18 ACs (REPT-01 x5, REPT-02 x8, REPT-04 x6 — nota: REPT-03/REPT-05 na tabela de traceability não têm bloco de ACs numerado próprio, mesma observação pré-existente da rodada anterior) endereçadas — 9 com teste automatizado PASS (valor exato), 9 cobertas por inspeção de código real (camadas Server Action/serviço-com-Prisma/UI, "none" na Test Coverage Matrix de `tasks.md`). **0 gaps remanescentes.**

---

## Edge Cases (spec.md) — re-checked

- [x] Escala sem N ocorrências futuras → processa só as que existem: `rotation.test.ts:29-32` — ✅ PASS
- [x] Ocorrência de destino sem origem correspondente → ignorada, contada como pulada: `rotation.test.ts:20-27` devolve `sourceIndex: null`; `repeatSchedule.ts:56` `if (pair.sourceIndex === null) continue;` — nenhuma cópia gerada para esse alvo (mesma leitura pragmática do relatório anterior: sem vaga a copiar, não há slot individual a contar como "pulado"; interpretação razoável, não um bug)
- [x] Todas as origens vazias → zero preenchidas: `repeatSchedule.ts:62` `if (!sourceSlot.allocation) continue;`
- [x] Alocação de origem de pessoa sem conta → copia `guestName`, PENDING, sem notificação: `repeatSchedule.ts:73-74,137,144` + `rotation.test.ts:70-80`
- [x] Corrida de unicidade (`P2002`) → conta como pulada, não aborta: `repeatSchedule.ts:156-162`
- [x] Origem com duas ocorrências no mesmo dia → desempate por `id`: `repeatSchedule.ts:30` `orderBy: [{date:"asc"},{id:"asc"}]`

---

## Discrimination Sensor (re-run this session)

Isolamento: worktree temporário `../gtsm-verify-scratch2` criado com `git worktree add ../gtsm-verify-scratch2 HEAD`; `node_modules` reutilizado via junction NTFS (`cmd /c mklink /J`), removida antes do `git worktree remove --force`. Baseline de `git status --porcelain` do repo real capturado antes e confirmado idêntico depois:
```
?? .specs/features/repetir-escalacao/validation.md
?? docs/superpowers/plans/2026-07-30-check-in-plan.md
```

| # | File:line | Mutação | Testes rodados | Resultado |
|---|-----------|---------|-----------------|-----------|
| 1 | `src/modules/scheduling/domain/rotation.ts:44-45` (scratch copy) | Trocada a ordem de `isActiveMember`/`isCapable`: checa capacitação antes de membership (mesma mutação da rodada anterior) | `npx vitest run tests/unit/rotation.test.ts` | ✅ **Morto** — `membership tem precedencia sobre capacitacao quando as duas faltam` falhou: `expected 'SKIP_NOT_CAPABLE' to be 'SKIP_NOT_MEMBER'` (12/13 passaram, 1 falhou — o discriminador) |

**Sensor depth**: lightweight (targeted re-check of the one previously-surviving mutation; the other 4 mutations from the prior round were already confirmed killed and the underlying code they target is unchanged in this diff)
**Result**: 1/1 killed - PASS ✅ (previously 0/1 on this specific mutation)

---

## Payload/Conjunction Rule

| Campo | Verificação | Resultado |
|-------|-------------|-----------|
| `RotationPair[]` (`planRotationPairs`) | Testes asserem o array completo com `toEqual`, não só o tamanho | ✅ Conjunção respeitada |
| `CopyDecision` (`decideCopyAllocation`) | Testes asserem o valor literal exato da união em cada ramo, incluindo o novo teste de precedência conjunta (`isActiveMember=false` E `isCapable=false`) | ✅ Conjunção respeitada — gap de precedência fechado |
| `RepeatResult { filled, skipped }` (`repeatSchedule`) | Sem teste automatizado (serviço com Prisma = "none" na matriz). Verificado por leitura: `filled++`/`skipped++` em pontos distintos e mutuamente exclusivos | ⚪ Conjunção coberta por inspeção |

---

## Code Quality

| Principle        | Status |
| ----------------- | ------ |
| Minimum code     | ✅ — o diff de fix é mínimo: 1 teste novo + `Set`→`Map<string,Set\|null>` em `repeatSchedule.ts` |
| Surgical changes | ✅ — nenhum arquivo fora do escopo dos 2 gaps tocado |
| No scope creep   | ✅ |
| Matches patterns | ✅ — comentário de domínio em pt-BR explicando a decisão (AD-002), mesmo estilo do resto do arquivo |
| Spec-anchored outcome check (asserted values match spec) | ✅ — 9/18 ACs com valor exato testado; 9 cobertas por inspeção sem gap remanescente |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — domínio puro (`rotation.ts`) com 1:1 nas ACs que define, incluindo o teste de precedência; camadas Prisma/UI cobertas por build gate + inspeção, conforme Test Coverage Matrix |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — todos os `it(...)` citam a AC ou o comportamento exigido |
| Documented guidelines followed | `CLAUDE.md` ("Testes unitários cobrem regra de negócio de risco… Bug corrigido ganha teste que o reproduz" — o novo teste de precedência é exatamente esse caso), `tasks.md` Test Coverage Matrix |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test && npm run build`
- **Result**: typecheck 0 erros; lint "No ESLint warnings or errors"; test **201 passed, 0 failed** (34 arquivos); build compilou com sucesso (todas as rotas geradas, incluindo `/escalas` e `/escalas/[id]/editar`)
- **Test count before this fix round** (HEAD anterior `586715e`): 200 passed / 34 arquivos
- **Test count after this fix round** (HEAD `d47c978`): 201 passed / 34 arquivos
- **Delta**: +1 teste (precedência membership/capacitação em `tests/unit/rotation.test.ts`)
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ----------- |
| REPT-01 | ⚠️ Verified com gap menor | ✅ Verified (gap era falso positivo — tradução já existia e é alcançável) |
| REPT-02 | ✅ Verified | ✅ Verified |
| REPT-03 | N/A (numeração sem bloco de ACs próprio — pré-existente) | N/A |
| REPT-04 | ⚠️ Verified com gap funcional | ✅ Verified (Assumption do spec reescrita; implementação alinhada) |
| REPT-05 | ✅ Verified | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 18/18 ACs endereçadas (9 PASS com teste automatizado de valor exato; 9 cobertas por inspeção sem gap). 0 gaps remanescentes.
**Sensor**: 1/1 mutação re-testada morta (a mutação que sobrevivera na rodada anterior agora é detectada pelo novo teste de precedência)
**Gate**: typecheck + lint + 201 testes + build, todos passando

**What works**: `planRotationPairs` e `decideCopyAllocation` cobertos 1:1 com as ACs de domínio, incluindo a precedência membership→capacitação agora protegida por teste; `repeatSchedule.ts` não bloqueia mais 100% das cópias em funções sem nenhuma capacitação declarada (gap funcional REPT-04.4 fechado, spec.md atualizado para refletir a decisão); mensagem pt-BR do ciclo inválido confirmada presente e alcançável em `createScheduleAction`/`updateScheduleAction` (gap era falso positivo); idempotência da segunda execução, corrida de vaga (P2002), vaga pulada livre em `/vagas`, migration nullable sem default — todos re-confirmados por leitura direta nesta rodada.

**Issues found**: nenhum.

**Next steps**: Nenhuma ação de fix pendente. Feature pronta para ser considerada concluída (orquestrador decide commit/merge).
