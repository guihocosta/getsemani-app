# Presença e faltas - checks

Profile: light
Plan: `.specs/features/presenca-faltas/plan.md`

## Intent

12 checks in 2 slices · 0 one-way doors · 0 open

## Checks

### S1 - Relatório de presença em `/admin` · 4 files · 14 KB · ~4k

**C1** - [x] `summarizeAttendance` com linhas `ana:false, ana:true, bia:true` devolve `total = 3`, `presentes = 2`, `faltas = 1`, e Ana com `escalado = 2`, `faltas = 1` (AC 1)
Proof: `npm run test -- tests/unit/attendanceSummary.test.ts -t "conta presencas e faltas"`

**C2** - [x] `summarizeAttendance` devolve `taxa = 67` para 2 presentes em 3 e `taxa = null` para lista vazia (AC 2)
Proof: `npm run test -- tests/unit/attendanceSummary.test.ts -t "taxa de presenca"`

**C3** - [x] O ranking sai ordenado por faltas decrescente, empate por nome crescente, sem quem tem 0 faltas: `[Caio 2, Ana 1, Bia 1]` (AC 3)
Proof: `npm run test -- tests/unit/attendanceSummary.test.ts -t "ordena ranking"`

**C4** - [x] `attendanceRows(from, to, ["m1"])` chama `allocation.findMany` com `userId: { not: null }`, ocorrência `status: "ACTIVE"`, `date: { gte: from, lt: to }` e `schedule: { ministryId: { in: ["m1"] } }`; sem `ministryIds`, sem filtro de `schedule` (AC 4)
Proof: `npm run test -- tests/unit/attendanceReport.test.ts -t "attendanceRows"`

**C5** - [x] `attendanceWindow(2026-10-02T15:00Z)` devolve `from = 2026-09-02T03:00Z` e `to = 2026-10-02T03:00Z`, e `AdminPage` chama `attendanceRows` com essa janela e `scopeIds` (AC 5)
Proof: `npm run test -- tests/unit/attendanceSummary.test.ts -t "attendanceWindow"`
Proof: `grep -q "attendanceRows(presencaFrom, presencaTo, scopeIds)" "app/(app)/admin/page.tsx"`

**C6** - [x] `attendanceView` com `total = 0` devolve `mensagem = "Sem escalas concluídas no período."` e `itens = []` (AC 6)
Proof: `npm run test -- tests/unit/attendanceSummary.test.ts -t "sem escalas concluidas"`

**C7** - [x] `attendanceView` com `total = 2` e 0 faltas devolve `mensagem = "Nenhuma falta no período."` (AC 7)
Proof: `npm run test -- tests/unit/attendanceSummary.test.ts -t "nenhuma falta"`

**C8** - [x] `attendanceView` com 7 pessoas com falta devolve 5 itens, `mensagem = null`, rótulos `"2 faltas de 3"` e `"1 falta de 1"`; `AdminPage` renderiza `attendanceView` (AC 8)
Proof: `npm run test -- tests/unit/attendanceSummary.test.ts -t "limita a 5"`
Proof: `grep -q "attendanceView(" "app/(app)/admin/page.tsx" && npm run typecheck`

### S2 - Marca de presença no dia passado · 3 files · 24 KB · ~6k

**C9** - [x] `slotAttendanceMark` com dia `2026-10-01`, hoje `2026-10-02`, pessoa com conta, sem check-in, `canManage: true` devolve `"FALTA"` (AC 9)
Proof: `npm run test -- tests/unit/attendanceMark.test.ts -t "falta em dia passado"`

**C10** - [x] `slotAttendanceMark` com check-in devolve `"PRESENTE"` tanto no dia de hoje quanto em dia passado, com `canManage` `true` ou `false` (AC 10)
Proof: `npm run test -- tests/unit/attendanceMark.test.ts -t "presente com check-in"`

**C11** - [x] `slotAttendanceMark` devolve `null` para vaga aberta, convidado sem conta, dia futuro, e hoje sem check-in (AC 11)
Proof: `npm run test -- tests/unit/attendanceMark.test.ts -t "sem marca"`

**C12** - [x] `slotAttendanceMark` em dia passado sem check-in com `canManage: false` devolve `null`, e `OccurrenceRow` decide o selo por `slotAttendanceMark` (AC 12)
Proof: `npm run test -- tests/unit/attendanceMark.test.ts -t "nao gerente nao ve falta"`
Proof: `grep -q "slotAttendanceMark(" "app/(app)/escalas/OccurrenceRow.tsx" && npm run typecheck`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| tabela de decisão da marca (8) | vaga aberta C11 · convidado C11 · futuro C11 · hoje sem check-in C11 · hoje com check-in C10 · passado com check-in C10 · passado sem check-in gerente C9 · passado sem check-in não gerente C12 | - |
| estados do bloco Presença (3) | `total = 0` C6 · sem faltas C7 · com faltas C8 | - |
| filtros da consulta (5) | `userId` não nulo C4 · `ACTIVE` C4 · `gte from` C4 · `lt to` C4 · `ministryIds` presente e ausente C4 | - |
| bordas da taxa (2) | `total = 0` C2 · arredondamento 2/3 C2 | - |
| regra de ordenação (3) | faltas desc C3 · empate por nome C3 · exclui 0 faltas C3 | - |

- C5, C8 e C12 têm segunda prova (grep + typecheck) porque o teste unitário para na função pura e a ligação com a tela é outra camada
- Nenhum outro check afirma mais do que o caso que sua prova exercita

## Swept

- validation: n/a - sem entrada de usuário; a janela é calculada no servidor
- failure modes: existing - `app/(app)/error.tsx` cobre falha de leitura em `/admin`
- idempotency: n/a - feature só de leitura
- authorization: C4, C12; existing - `AdminPage` redireciona quem não é admin nem líder
- concurrency: n/a - nenhuma escrita
- data lifecycle: C5 - janela de 30 dias deixa de fora o histórico anterior ao check-in
- dependency failure: n/a - sem dependência externa
- state transitions: C9, C10, C11
- observability: n/a - sem requisito de log numa leitura

## Handoff

- S1 ~4k + S2 ~6k = ~10k (wc -c / 4 dos arquivos tocados), abaixo do budget de 150k - one builder
