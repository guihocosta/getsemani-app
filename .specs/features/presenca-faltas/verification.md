# Presença e faltas verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 0099754..42d2d73
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Escopo: todos os 12 checks de `checks.md` (C1..C12), verificados em `42d2d73` (HEAD de `feat/backlog-louveapp`). Perfil `light`, o mesmo declarado em `checks.md`: sem injeção de falhas, sem recomputar `Coverage`, sem passo de fontes vinculantes. Passo 5 (percorrer o fluxo com o usuário) não se aplica: o verificador não alcança o usuário.

## Checks

Provas rodadas pelo verificador em `42d2d73`, uma única chamada vitest: `npm run test -- tests/unit/attendanceSummary.test.ts tests/unit/attendanceReport.test.ts tests/unit/attendanceMark.test.ts --reporter=verbose`, exit 0: 3 arquivos, 13 testes passaram, 0 falharam. Cada teste nomeado aparece individualmente como executado e aprovado na saída. Cada padrão `-t` de `checks.md` casa com pelo menos um nome de teste existente (conferido contra os arquivos). Os três arquivos de teste foram criados dentro do diff range, então nenhuma prova resolve para teste antigo. As três provas `grep -q` saíram com 0 e `npm run typecheck` (`tsc --noEmit`) saiu com 0.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `summarizeAttendance` com `ana:false, ana:true, bia:true` -> `total 3`, `presentes 2`, `faltas 1`, Ana `escalado 2`, `faltas 1` | vitest em lote, `summarizeAttendance > conta presencas e faltas` passou | `tests/unit/attendanceSummary.test.ts:24` - `expect(s.total).toBe(3)`; `:25` - `expect(s.presentes).toBe(2)`; `:26` - `expect(s.faltas).toBe(1)`; `:27` - `expect(s.ranking).toEqual([{ userId: "ana", name: "Ana", escalado: 2, faltas: 1 }])` | PASS |
| C2 | `taxa = 67` para 2 de 3 e `taxa = null` para lista vazia | vitest em lote, `taxa de presenca arredonda e e nula sem escalas` passou | `tests/unit/attendanceSummary.test.ts:36` - `expect(s.taxa).toBe(67)`; `:37` - `expect(summarizeAttendance([]).taxa).toBeNull()` | PASS |
| C3 | ranking por faltas desc, empate por nome asc, sem quem tem 0 faltas: `[Caio 2, Ana 1, Bia 1]` | vitest em lote, `ordena ranking por faltas e depois por nome, sem quem nao faltou` passou | `tests/unit/attendanceSummary.test.ts:48` - `expect(s.ranking.map((p) => [p.name, p.faltas])).toEqual([["Caio", 2], ["Ana", 1], ["Bia", 1]])` (Duda, com 0 faltas, está na entrada `:46` e fora do esperado) | PASS |
| C4 | `attendanceRows(from, to, ["m1"])` chama `allocation.findMany` com `userId: { not: null }`, `status: "ACTIVE"`, `date: { gte: from, lt: to }`, `schedule: { ministryId: { in: ["m1"] } }`; sem `ministryIds`, sem filtro de `schedule` | vitest em lote, `attendanceRows filtra pessoa, ocorrencia ativa, janela e ministerios` e `attendanceRows sem ministryIds nao filtra por ministerio` passaram | `tests/unit/attendanceReport.test.ts:25` - `expect(prisma.allocation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: { not: null }, slot: { occurrence: { status: "ACTIVE", date: { gte: from, lt: to }, schedule: { ministryId: { in: ["m1"] } } } } } }))`; `:48` - mesma chamada com `where: { userId: { not: null }, slot: { occurrence: { status: "ACTIVE", date: { gte: from, lt: to } } } }` (o `where` é comparado por igualdade profunda, então uma chave `schedule` a mais falharia) | PASS |
| C5 | `attendanceWindow(2026-10-02T15:00Z)` -> `from = 2026-09-02T03:00Z`, `to = 2026-10-02T03:00Z`; `AdminPage` chama `attendanceRows` com essa janela e `scopeIds` | vitest em lote, `attendanceWindow vai de 30 dias atras ate o inicio de hoje em APP_TZ` passou; `grep -q "attendanceRows(presencaFrom, presencaTo, scopeIds)" "app/(app)/admin/page.tsx"` exit 0 | `tests/unit/attendanceSummary.test.ts:83` - `expect(from.toISOString()).toBe("2026-09-02T03:00:00.000Z")`; `:84` - `expect(to.toISOString()).toBe("2026-10-02T03:00:00.000Z")`; ligação em `app/(app)/admin/page.tsx:56` (`attendanceWindow(now)`) e `:65` (`attendanceRows(presencaFrom, presencaTo, scopeIds)`) | PASS |
| C6 | `attendanceView` com `total = 0` -> `mensagem = "Sem escalas concluídas no período."`, `itens = []` | vitest em lote, `sem escalas concluidas mostra mensagem de vazio` passou | `tests/unit/attendanceSummary.test.ts:59` - `expect(v.mensagem).toBe("Sem escalas concluídas no período.")`; `:60` - `expect(v.itens).toEqual([])` | PASS |
| C7 | `attendanceView` com `total = 2` e 0 faltas -> `mensagem = "Nenhuma falta no período."` | vitest em lote, `nenhuma falta mostra mensagem propria` passou | `tests/unit/attendanceSummary.test.ts:65` - `expect(v.mensagem).toBe("Nenhuma falta no período.")` (entrada `:64` com duas linhas `checkedIn: true`) | PASS |
| C8 | 7 pessoas com falta -> 5 itens, `mensagem = null`, rótulos `"2 faltas de 3"` e `"1 falta de 1"`; `AdminPage` renderiza `attendanceView` | vitest em lote, `limita a 5 pessoas e escreve o rotulo no singular e plural` passou; `grep -q "attendanceView(" "app/(app)/admin/page.tsx"` exit 0; `npm run typecheck` exit 0 | `tests/unit/attendanceSummary.test.ts:71` - `expect(v.mensagem).toBeNull()`; `:72` - `expect(v.itens).toHaveLength(5)`; `:73` - `expect(v.itens[0].label).toBe("2 faltas de 3")`; `:76` - `expect(um.itens).toEqual([{ userId: "ana", name: "Ana", label: "1 falta de 1" }])`; ligação em `app/(app)/admin/page.tsx:68` | PASS |
| C9 | dia `2026-10-01`, hoje `2026-10-02`, pessoa com conta, sem check-in, `canManage: true` -> `"FALTA"` | vitest em lote, `falta em dia passado sem check-in, para quem gerencia` passou | `tests/unit/attendanceMark.test.ts:18` - `expect(slotAttendanceMark({ ...base, dayKey: ONTEM })).toBe("FALTA")` (`base` em `:8-14`: `todayKey: "2026-10-02"`, `isGuest: false`, `checkedIn: false`, `canManage: true`) | PASS |
| C10 | com check-in -> `"PRESENTE"` hoje e em dia passado, `canManage` `true` ou `false` | vitest em lote, `presente com check-in hoje e em dia passado, gerente ou nao` passou | `tests/unit/attendanceMark.test.ts:24` - `expect(slotAttendanceMark({ ...base, dayKey, checkedIn: true, canManage })).toBe("PRESENTE")`, dentro de laços sobre `[HOJE, ONTEM]` (`:22`) e `[true, false]` (`:23`): as 4 combinações | PASS |
| C11 | `null` para vaga aberta, convidado sem conta, dia futuro, hoje sem check-in | vitest em lote, `sem marca para vaga aberta, convidado, futuro e hoje sem check-in` passou | `tests/unit/attendanceMark.test.ts:30` - `expect(slotAttendanceMark({ ...base, dayKey: ONTEM, hasAllocation: false })).toBeNull()`; `:31` - `...isGuest: true })).toBeNull()`; `:32` - `...dayKey: AMANHA })).toBeNull()`; `:33` - `...dayKey: HOJE })).toBeNull()` | PASS |
| C12 | dia passado sem check-in com `canManage: false` -> `null`; `OccurrenceRow` decide o selo por `slotAttendanceMark` | vitest em lote, `nao gerente nao ve falta` passou; `grep -q "slotAttendanceMark(" "app/(app)/escalas/OccurrenceRow.tsx"` exit 0; `npm run typecheck` exit 0 | `tests/unit/attendanceMark.test.ts:37` - `expect(slotAttendanceMark({ ...base, dayKey: ONTEM, canManage: false })).toBeNull()`; ligação em `app/(app)/escalas/OccurrenceRow.tsx:375` (chamada), `:381` (`canManage: props.canManage`), selo "faltou" só quando `marca === "FALTA"` | PASS |

### Gaps (level / sampling / precision)

Nenhum bloqueia o veredito. Registrados para quem for mexer depois.

- **C5, C8, C12 (level)**: o teste unitário para na função pura e a ligação com a tela é provada por `grep` + `typecheck`, como `checks.md` declara na nota de `Coverage`. O `grep` prova que a chamada existe, não o que a tela renderiza. Conferido por leitura: `app/(app)/admin/page.tsx:56`, `:65`, `:68` e `app/(app)/escalas/OccurrenceRow.tsx:375-381`. Nenhum teste renderiza o bloco "Presença" nem o selo "faltou".
- **AC 8 / teste independente de S1 (level)**: a linha "N% de presença em M escalações" e o título "Presença (últimos 30 dias)" são JSX de `app/(app)/admin/page.tsx` sem prova automatizada. O valor `taxa` em si está provado em C2.
- **C12 (sampling)**: `hasAllocation: true` é fixo em `OccurrenceRow.tsx:378`. É correto por leitura (o trecho só renderiza no ramo `s.allocatedName ?`, onde há alocação), mas nenhum teste cobre esse acoplamento.
- **C3 (sampling)**: o desempate usa `localeCompare(..., "pt-BR")` (`src/modules/reports/domain/attendance.ts:39`) e o teste só usa nomes ASCII. Ordenação com acento não está exercitada. A claim não promete isso.
- **C4 (level)**: `findMany` é mockado, então a prova é sobre o formato do `where`, não sobre o resultado no Postgres. É exatamente o que a claim afirma. O fallback `name: a.user?.name ?? "?"` (`src/modules/reports/services/reports.ts:76`) não tem teste.

### Swept rows resolving to `existing`

Relidas contra o código em `42d2d73`.

| Row | Cited constraint | Found |
| --- | --- | --- |
| failure modes | `app/(app)/error.tsx` cobre falha de leitura em `/admin` | sim - `app/(app)/error.tsx:6` exporta `AppError` (error boundary do grupo `(app)`, que contém `admin/page.tsx`) |
| authorization | `AdminPage` redireciona quem não é admin nem líder | sim - `app/(app)/admin/page.tsx:33` `if (!user) redirect("/login")`; `:36` `if (!user.isAdmin && !isLeader) redirect("/")`; `:39` `scopeIds` limitado a `ledMinistryIds` para líder |

Também conferido, citado em `plan.md` `Observable`: `app/(app)/loading.tsx` existe. E o termo `falta` do plano ("ocorrência `ACTIVE`") vale também no calendário: `src/modules/scheduling/services/listMonthOccurrences.ts:46` filtra `status: "ACTIVE"`, então o selo nunca aparece em ocorrência cancelada.

## Gate

`npm run test -- tests/unit/attendanceSummary.test.ts tests/unit/attendanceReport.test.ts tests/unit/attendanceMark.test.ts --reporter=verbose` - 13 passed, 0 failed

`npm run typecheck` exit 0. Provas `grep -q` de C5, C8 e C12 exit 0. Árvore de trabalho igual ao baseline, exceto este relatório.
