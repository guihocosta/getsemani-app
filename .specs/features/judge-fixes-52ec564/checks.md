# Correções do julgamento do merge 52ec564 - checks

Profile: light
Plan: `.specs/features/judge-fixes-52ec564/plan.md`

## Intent

12 checks in 3 slices · 0 one-way doors · 0 open

## Checks

### S1 - Repetir escalação trata sessão, erro e falha parcial · 4 files · 42 KB · ~11k

**C1** - [x] `repeatScheduleAction` relança o erro com digest `NEXT_REDIRECT;replace;/login;307;` lançado por `repeatSchedule` (AC 1)
Proof: `npm run test -- tests/unit/repeatScheduleAction.test.ts -t "relanca redirect"`

**C2** - [x] Erro desconhecido (`new Error("boom")`) gera `logError("escalas.repeatSchedule", ...)` e devolve `{ ok: false, error: "Não deu para repetir a escalação agora.", ref }` com o `ref` de `logError` (AC 2)
Proof: `npm run test -- tests/unit/repeatScheduleAction.test.ts -t "loga erro desconhecido"`

**C3** - [x] Com 2 cópias OK e `allocation.create` falhando na 2ª com erro sem `code`, `repeatSchedule` lança `RepeatPartialFailure` com `filled = 1` (AC 3)
Proof: `npm run test -- tests/unit/repeatSchedule.test.ts -t "falha parcial carrega filled"`

**C4** - [x] `RepeatPartialFailure` com `filled = 3` gera `logError` e `{ ok: false, filled: 3, error: "3 vagas preenchidas antes da falha. Tente de novo para completar." }`; com `filled = 1`, "1 vaga preenchida antes da falha. ..." (AC 4)
Proof: `npm run test -- tests/unit/repeatScheduleAction.test.ts -t "falha parcial"`

**C5** - [x] `repeatOutcome` devolve `refresh: true` para `{ ok: true, filled: 0 }` e para `{ ok: false, filled: 2 }`, e `refresh: false` para `{ ok: false }` sem `filled` (AC 5)
Proof: `npm run test -- tests/unit/repeatOutcome.test.ts -t "refresh"`

### S2 - Selo só depois de declaração · 5 files · 30 KB · ~8k

**C6** - [x] `capableUserIdsForRole` devolve `null` quando `userSkill.findMany` retorna 0 linhas, e o `Set` dos `userId` quando retorna ≥ 1 (AC 6)
Proof: `npm run test -- tests/unit/userSkills.test.ts -t "capableUserIdsForRole"`

**C7** - [x] `markCapable(candidatos, null)` marca todos `capable: true` e ordena por `count30d` crescente (AC 7)
Proof: `npm run test -- tests/unit/candidateList.test.ts -t "null marca todos capazes"`

**C8** - [x] `markCapable(candidatos, Set{u3})` mantém u3 primeiro e `capable: false` nos demais (AC 8)
Proof: `npm run test -- tests/unit/candidateList.test.ts -t "markCapable"`

**C9** - [x] Com `capableUserIdsForRole` devolvendo `null`, `repeatSchedule` copia a alocação de origem (`filled = 1`); com `Set{outro}`, pula (`skipped = 1`) (AC 9)
Proof: `npm run test -- tests/unit/repeatSchedule.test.ts -t "capacitacao nao declarada"`

### S3 - Estrutura sem mudar comportamento · 6 files · 20 KB · ~5k

**C10** - [x] `rotationCycleSchema` aceita `1`, `12`, `null`, `undefined`; rejeita `0`, `13`, `1.5` com mensagem `INVALID_ROTATION_CYCLE`; e `createSchedule`/`updateSchedule` usam o mesmo schema (AC 10)
Proof: `npm run test -- tests/unit/rotationCycleSchema.test.ts -t "rotationCycleSchema"`
Proof: `npm run typecheck`

**C11** - [x] `setMemberSkill` com `enabled: true` chama `userSkill.upsert` com `userId_roleId: { userId, roleId }`; com `enabled: false` chama `userSkill.deleteMany` com `{ userId, roleId }` (AC 11)
Proof: `npm run test -- tests/unit/userSkills.test.ts -t "setMemberSkill"`

**C12** - [x] `src/modules/scheduling/domain/candidateList.ts` existe, não importa `@/lib/prisma`, e `src/modules/scheduling/services/candidateList.ts` não existe (AC 12)
Proof: `test -f src/modules/scheduling/domain/candidateList.ts && ! grep -q "lib/prisma" src/modules/scheduling/domain/candidateList.ts && test ! -f src/modules/scheduling/services/candidateList.ts`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| ramos do catch de `repeatScheduleAction` (5) | redirect C1 · desconhecido C2 · falha parcial C4 · `FORBIDDEN` C2 · `NO_ROTATION_CYCLE` C2 | - |
| retorno de `capableUserIdsForRole` (2) | `null` C6 · `Set` C6 | - |
| entrada de `markCapable` (2) | `null` C7 · `Set` C8 | - |
| bordas de `rotationCycle` (6) | 0 C10 · 1 C10 · 12 C10 · 13 C10 · não inteiro C10 · nulo C10 | - |
| `enabled` em capacitação (2) | `true` C11 · `false` C11 | - |
| decisão de refresh na tela (3) | ok C5 · erro com `filled` C5 · erro sem `filled` C5 | - |

- C2 também cobre `FORBIDDEN` e `NO_ROTATION_CYCLE`: o mesmo teste afirma a mensagem de cada ramo
- Nenhum outro check afirma mais do que o caso que sua prova exercita

## Swept

- validation: C10
- failure modes: C3, C4
- idempotency: existing - `repeatSchedule` pula vaga já preenchida (`decideCopyAllocation`, `SKIP_SLOT_TAKEN`)
- authorization: C1
- concurrency: existing - `P2002` na criação vira pulada em `repeatSchedule`
- data lifecycle: n/a - nenhuma linha criada ou apagada por regra nova
- dependency failure: C3
- state transitions: n/a - nenhuma transição de status alterada
- observability: C2, C4

## Handoff

- S1 ~11k + S2 ~8k + S3 ~5k = ~24k (wc -c / 4 dos arquivos tocados), abaixo do budget de 150k - one builder
