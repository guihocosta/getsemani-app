# Visão geral - checks

Profile: light
Plan: `.specs/features/visao-geral/plan.md`

## Intent

7 checks in 3 slices · 0 one-way doors · 0 open

## Checks

### S1 - Período · 2 files · 4 KB · ~1k

**C1** - [x] Com agora `2026-10-02T15:00Z`, `overviewPeriod("7d")` devolve `from = 2026-09-26T03:00Z`, `to = 2026-10-03T03:00Z`; `"30d"` -> `from = 2026-09-03T03:00Z`; `"90d"` -> `from = 2026-07-05T03:00Z`; `"mes"` -> `2026-10-01T03:00Z` a `2026-11-01T03:00Z` (AC 1)
Proof: `npm run test -- tests/unit/overview.test.ts -t "janelas"`

**C2** - [x] `overviewPeriod(undefined)` e `overviewPeriod("xyz")` devolvem `key = "30d"` (AC 2)
Proof: `npm run test -- tests/unit/overview.test.ts -t "periodo padrao"`

### S2 - Métricas · 3 files · 8 KB · ~2k

**C3** - [x] `summarizeOverview` com 2 ocorrências, 1 vaga aberta, 5 membros ativos e 4 alocações (3 de pessoas distintas com conta + 1 convidado; 2 `CONFIRMED`; 2 em dia encerrado, 1 delas sem check-in) devolve `escalas 2`, `escalacoes 4`, `vagasAbertas 1`, `membrosEscalados 3`, `pctMembros 60`, `pctConfirmadas 67`, `pctFaltas 50` (AC 3)
Proof: `npm run test -- tests/unit/overview.test.ts -t "summarizeOverview calcula"`

**C4** - [x] Sem alocações e sem membros, os três percentuais são `null`; `fmtPct(null) = "—"` e `fmtPct(67) = "67%"` (AC 4)
Proof: `npm run test -- tests/unit/overview.test.ts -t "denominador zero"`

**C5** - [x] `overviewData(from, to, hoje, ["m1"])` consulta ocorrências, vagas e alocações com `status: "ACTIVE"`, `published: true`, `date: { gte: from, lt: to }` e `schedule: { ministryId: { in: ["m1"] } }`; membros com `status: "ACTIVE"`, `ministryId: { in: ["m1"] }` e `distinct: ["userId"]`; e marca `ended` para data anterior a `hoje` (AC 5)
Proof: `npm run test -- tests/unit/overviewData.test.ts -t "overviewData"`

### S3 - Acesso e entrada · 2 files · 10 KB · ~3k

**C6** - [x] A página redireciona para `/` quem não é admin nem líder e passa `scopeIds` (`undefined` para admin, `ledMinistryIds` para líder) a `overviewData` (AC 6)
Proof: `grep -q 'if (!user.isAdmin && !isLeader) redirect("/");' "app/(app)/admin/visao-geral/page.tsx" && grep -q "overviewData(from, to, startOfDay(now), scopeIds)" "app/(app)/admin/visao-geral/page.tsx" && grep -q "user.isAdmin ? undefined : await ledMinistryIds(user.id, false)" "app/(app)/admin/visao-geral/page.tsx" && npm run typecheck`

**C7** - [x] `/admin` linka "Visão geral" para `/admin/visao-geral` (AC 7)
Proof: `grep -q 'href="/admin/visao-geral"' "app/(app)/admin/page.tsx"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| chaves de período (6) | `7d` C1 · `30d` C1 · `90d` C1 · `mes` C1 · ausente C2 · desconhecida C2 | - |
| métricas do cartão (7) | escalas C3 · escalações C3 · vagas abertas C3 · membros escalados C3 · % membros C3 · % confirmadas C3 · % faltas C3 | - |
| denominadores zerados (3) | membros ativos C4 · alocações com conta C4 · alocações em dia encerrado C4 | - |
| filtros da consulta (5) | `ACTIVE` C5 · publicada C5 · janela C5 · `ministryIds` C5 · membros distintos C5 | - |
| papel de quem abre (3) | admin C6 · líder C6 · nenhum dos dois C6 | - |

- C6 e C7 são grep (+ typecheck): gate e ligação moram na página, sem teste de componente no repo; o gate é o mesmo texto de `app/(app)/admin/page.tsx`
- Nenhum outro check afirma mais do que o caso que sua prova exercita

## Swept

- validation: C2
- failure modes: existing - `app/(app)/error.tsx` cobre falha de leitura
- idempotency: n/a - feature só de leitura
- authorization: C5, C6
- concurrency: n/a - nenhuma escrita
- data lifecycle: n/a - nada gravado
- dependency failure: n/a - sem dependência externa
- state transitions: n/a - nenhum estado alterado
- observability: n/a - sem requisito de log numa leitura

## Handoff

- S1 ~1k + S2 ~2k + S3 ~3k = ~6k (wc -c / 4 dos arquivos tocados), abaixo do budget de 150k - one builder
