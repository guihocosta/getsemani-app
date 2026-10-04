# Presença e faltas verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 0099754..cb8748b
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Escopo da rodada 2: tudo o que mudou nos arquivos da feature desde `42d2d73` (rodada 1). Foram `cb8748b` (removeu o parâmetro morto `hasAllocation` de `slotAttendanceMark`; reescreveu AC 11, C11 e a linha de Coverage da marca), `68f578d`/`8e20029` (`rascunho-publicar`: `published: true` no `where` de `attendanceRows` e no teste) e commits sem relação direta (`e2b2015`, `9a58a2c`, `8dcb7ca`, que só acrescentaram código ao lado em `reports.ts`, `OccurrenceRow.tsx` e `admin/page.tsx`). Perfil `light`, o mesmo declarado em `checks.md`: sem injeção de falhas, sem recomputar `Coverage`, sem passo de fontes vinculantes. Passo 5 (percorrer o fluxo com o usuário) não se aplica: o verificador não alcança o usuário.

Cada seção abaixo diz de onde vem. Os C1, C2, C3, C5, C6, C7 e C8 exercitam código e teste que nenhum commit posterior tocou (`src/modules/reports/domain/attendance.ts` e `tests/unit/attendanceSummary.test.ts` ficaram idênticos a `42d2d73`); a prova foi rodada de novo e as citações foram conferidas de novo.

## Checks

verified at `cb8748b`. Provas re-rodadas em `cb8748b`, uma única chamada vitest: `npm run test -- tests/unit/attendanceSummary.test.ts tests/unit/attendanceReport.test.ts tests/unit/attendanceMark.test.ts --reporter=verbose`, exit 0: 3 arquivos, 13 testes passaram, 0 falharam, cada um listado individualmente. As provas `grep -q` de C5, C8 e C12 saíram com 0 e `npm run typecheck` (`tsc --noEmit`) saiu com 0. Todo padrão `-t` de `checks.md` casa com ao menos um teste existente (o teste de C11 agora se chama `sem marca para convidado, futuro e hoje sem check-in`, que ainda casa com `sem marca`).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `summarizeAttendance` com `ana:false, ana:true, bia:true` -> `total 3`, `presentes 2`, `faltas 1`, Ana `escalado 2`, `faltas 1` | vitest em lote, `conta presencas e faltas` passou (carried from 42d2d73: arquivo intocado) | `tests/unit/attendanceSummary.test.ts:24` - `expect(s.total).toBe(3)`; `:25` - `expect(s.presentes).toBe(2)`; `:26` - `expect(s.faltas).toBe(1)`; `:27` - `expect(s.ranking).toEqual([{ userId: "ana", name: "Ana", escalado: 2, faltas: 1 }])` | PASS |
| C2 | `taxa = 67` para 2 de 3 e `taxa = null` para lista vazia | vitest em lote, `taxa de presenca arredonda e e nula sem escalas` passou (carried from 42d2d73) | `tests/unit/attendanceSummary.test.ts:36` - `expect(s.taxa).toBe(67)`; `:37` - `expect(summarizeAttendance([]).taxa).toBeNull()` | PASS |
| C3 | ranking por faltas desc, empate por nome asc, sem quem tem 0 faltas: `[Caio 2, Ana 1, Bia 1]` | vitest em lote, `ordena ranking por faltas e depois por nome, sem quem nao faltou` passou (carried from 42d2d73) | `tests/unit/attendanceSummary.test.ts:48` - `expect(s.ranking.map((p) => [p.name, p.faltas])).toEqual([["Caio", 2], ["Ana", 1], ["Bia", 1]])` | PASS |
| C4 | `attendanceRows(from, to, ["m1"])` chama `allocation.findMany` com `userId: { not: null }`, `status: "ACTIVE"`, `date: { gte: from, lt: to }`, `schedule: { ministryId: { in: ["m1"] } }`; sem `ministryIds`, sem filtro de `schedule` | vitest em lote, `attendanceRows filtra pessoa, ocorrencia ativa, janela e ministerios` e `attendanceRows sem ministryIds nao filtra por ministerio` passaram em `cb8748b` | `tests/unit/attendanceReport.test.ts:25-26` - `expect(prisma.allocation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: { not: null }, slot: { occurrence: { status: "ACTIVE", published: true, date: { gte: from, lt: to }, schedule: { ministryId: { in: ["m1"] } } } } } }))`; `:49-50` - mesma chamada sem `ministryIds`, com `slot: { occurrence: { status: "ACTIVE", published: true, date: { gte: from, lt: to } } }`. O `where` é igualdade profunda, então tanto uma chave `schedule` a mais quanto a falta de `published: true` quebram o teste. Código: `src/modules/reports/services/reports.ts:66-72` | PASS |
| C5 | `attendanceWindow(2026-10-02T15:00Z)` -> `from = 2026-09-02T03:00Z`, `to = 2026-10-02T03:00Z`; `AdminPage` chama `attendanceRows` com essa janela e `scopeIds` | vitest em lote, `attendanceWindow vai de 30 dias atras ate o inicio de hoje em APP_TZ` passou; `grep -q "attendanceRows(presencaFrom, presencaTo, scopeIds)" "app/(app)/admin/page.tsx"` exit 0 | `tests/unit/attendanceSummary.test.ts:83` - `expect(from.toISOString()).toBe("2026-09-02T03:00:00.000Z")`; `:84` - `expect(to.toISOString()).toBe("2026-10-02T03:00:00.000Z")`; ligação em `app/(app)/admin/page.tsx:56` e `:65` (linhas inalteradas desde `42d2d73`) | PASS |
| C6 | `attendanceView` com `total = 0` -> `mensagem = "Sem escalas concluídas no período."`, `itens = []` | vitest em lote, `sem escalas concluidas mostra mensagem de vazio` passou (carried from 42d2d73) | `tests/unit/attendanceSummary.test.ts:59` - `expect(v.mensagem).toBe("Sem escalas concluídas no período.")`; `:60` - `expect(v.itens).toEqual([])` | PASS |
| C7 | `attendanceView` com `total = 2` e 0 faltas -> `mensagem = "Nenhuma falta no período."` | vitest em lote, `nenhuma falta mostra mensagem propria` passou (carried from 42d2d73) | `tests/unit/attendanceSummary.test.ts:65` - `expect(v.mensagem).toBe("Nenhuma falta no período.")` | PASS |
| C8 | 7 pessoas com falta -> 5 itens, `mensagem = null`, rótulos `"2 faltas de 3"` e `"1 falta de 1"`; `AdminPage` renderiza `attendanceView` | vitest em lote, `limita a 5 pessoas e escreve o rotulo no singular e plural` passou; `grep -q "attendanceView(" "app/(app)/admin/page.tsx"` exit 0; `npm run typecheck` exit 0 | `tests/unit/attendanceSummary.test.ts:71` - `expect(v.mensagem).toBeNull()`; `:72` - `expect(v.itens).toHaveLength(5)`; `:73` - `expect(v.itens[0].label).toBe("2 faltas de 3")`; `:76` - `expect(um.itens).toEqual([{ userId: "ana", name: "Ana", label: "1 falta de 1" }])`; ligação em `app/(app)/admin/page.tsx:68` | PASS |
| C9 | dia `2026-10-01`, hoje `2026-10-02`, pessoa com conta, sem check-in, `canManage: true` -> `"FALTA"` | vitest em lote, `falta em dia passado sem check-in, para quem gerencia` passou em `cb8748b` | `tests/unit/attendanceMark.test.ts:17` - `expect(slotAttendanceMark({ ...base, dayKey: ONTEM })).toBe("FALTA")` (`base` em `:8-13`: `todayKey: HOJE`, `isGuest: false`, `checkedIn: false`, `canManage: true`) | PASS |
| C10 | com check-in -> `"PRESENTE"` hoje e em dia passado, `canManage` `true` ou `false` | vitest em lote, `presente com check-in hoje e em dia passado, gerente ou nao` passou em `cb8748b` | `tests/unit/attendanceMark.test.ts:23` - `expect(slotAttendanceMark({ ...base, dayKey, checkedIn: true, canManage })).toBe("PRESENTE")`, dentro dos laços de `:21-22` sobre `[HOJE, ONTEM]` e `[true, false]`: 4 combinações | PASS |
| C11 | `null` para convidado sem conta, dia futuro e hoje sem check-in (texto reescrito em `cb8748b`, sem "vaga aberta") | vitest em lote, `sem marca para convidado, futuro e hoje sem check-in` passou em `cb8748b` | `tests/unit/attendanceMark.test.ts:29` - `expect(slotAttendanceMark({ ...base, dayKey: ONTEM, isGuest: true })).toBeNull()`; `:30` - `...dayKey: AMANHA })).toBeNull()`; `:31` - `...dayKey: HOJE })).toBeNull()` | PASS |
| C12 | dia passado sem check-in com `canManage: false` -> `null`; `OccurrenceRow` decide o selo por `slotAttendanceMark` | vitest em lote, `nao gerente nao ve falta` passou; `grep -q "slotAttendanceMark(" "app/(app)/escalas/OccurrenceRow.tsx"` exit 0; `npm run typecheck` exit 0 | `tests/unit/attendanceMark.test.ts:35` - `expect(slotAttendanceMark({ ...base, dayKey: ONTEM, canManage: false })).toBeNull()`; ligação em `app/(app)/escalas/OccurrenceRow.tsx:428` (única chamada no repositório, conferido por `grep -rn slotAttendanceMark app src`), `:432` (`canManage: props.canManage`) | PASS |

### Adversarial read of the mark function after `cb8748b`

verified at `cb8748b`. Pergunta: sem `hasAllocation`, `slotAttendanceMark` pode devolver marca para algo que não é pessoa alocada?

- Só existe um chamador: `app/(app)/escalas/OccurrenceRow.tsx:428`. Ele está dentro do ramo `{s.allocatedName ? (` aberto em `:414`; o ramo `else` (`:~455`, "vaga aberta") não chama a função. Então a função só roda para vaga com nome alocado.
- `allocatedName` vem de `s.allocation?.user?.name ?? s.allocation?.guestName ?? null` (`src/modules/scheduling/services/listMonthOccurrences.ts:41`), logo nome não nulo implica alocação existente. Convidado sem conta continua tratado por `isGuest`, que vem de `!!s.allocation && s.allocation.userId === null` (`:45`) e é repassado em `OccurrenceRow.tsx:431`. Único desvio imaginável: nome vazio (`""`) cai no ramo de vaga aberta e fica sem marca, o que é o comportamento seguro.
- A função hoje decide por exatamente três ramos (`src/modules/scheduling/domain/attendance.ts:12-14`): `isGuest` ou dia futuro -> `null`; `checkedIn` -> `"PRESENTE"`; senão dia passado e `canManage` -> `"FALTA"`, senão `null`. AC 9, AC 10, AC 11 (reescrito) e AC 12 batem com isso.
- Linha de Coverage "tabela de decisão da marca (7)" bate com a função: convidado C11, futuro C11, hoje sem check-in C11, hoje com check-in C10, passado com check-in C10, passado sem check-in gerente C9, passado sem check-in não gerente C12. São os 7 resultados distintos e cada um tem prova que o afirma.
- A remoção tira da função uma proteção que passa a viver só no chamador. Nenhum teste prende esse acoplamento (ver gaps).

### Gaps (level / sampling / precision)

Nenhum bloqueia o veredito.

- **C4 (precision), novo**: o texto da claim em `checks.md` (e o AC 4 do plano) lista quatro filtros e não cita `published: true`, que o código (`src/modules/reports/services/reports.ts:69`) e o teste (`tests/unit/attendanceReport.test.ts:30` e `:51`) já têm desde `rascunho-publicar`. A claim continua verdadeira palavra por palavra (cada filtro citado está lá, com os mesmos valores), e o teste protege o filtro a mais por igualdade profunda. Falta só uma nota de precisão na claim, para que remover `published: true` seja visto como regressão e não como mudança livre. Sem coluna `Unproven` afetada, pois a linha de Coverage "filtros da consulta (5)" também não o conta (seria o 6º membro).
- **C12 / AC 11 (level), novo**: "a tela só chama a função para vaga com pessoa" é invariante do chamador (`OccurrenceRow.tsx:414` e `:428`), provada só por leitura. Nenhum teste renderiza `OccurrenceRow`. Antes da `cb8748b` a função se defendia sozinha (`hasAllocation`); agora um novo chamador fora do ramo `allocatedName ?` poderia marcar vaga aberta como `FALTA`. Aceitável porque a função tem um único chamador e o comentário em `src/modules/scheduling/domain/attendance.ts:5` registra o contrato.
- **C5, C8, C12 (level)**, carried from 42d2d73: o teste unitário para na função pura e a ligação com a tela é provada por `grep` e `typecheck`, como `checks.md` declara. Nenhum teste renderiza o bloco "Presença" nem o selo "faltou".
- **AC 8 / teste independente de S1 (level)**, carried from 42d2d73: a linha "N% de presença em M escalações" e o título do bloco são JSX sem prova automatizada. O valor `taxa` está provado em C2.
- **C3 (sampling)**, carried from 42d2d73: o desempate usa `localeCompare(..., "pt-BR")` (`src/modules/reports/domain/attendance.ts:39`) e o teste só usa nomes ASCII.
- **C4 (level)**, carried from 42d2d73: `findMany` é mockado, então a prova é sobre o formato do `where`, não sobre o resultado no Postgres. O fallback `name: a.user?.name ?? "?"` não tem teste.

### Swept rows resolving to `existing`

verified at `cb8748b`. Relidas contra o código.

| Row | Cited constraint | Found |
| --- | --- | --- |
| failure modes | `app/(app)/error.tsx` cobre falha de leitura em `/admin` | sim - `app/(app)/error.tsx:6` exporta `AppError`; `app/(app)/loading.tsx` também existe |
| authorization | `AdminPage` redireciona quem não é admin nem líder | sim - `app/(app)/admin/page.tsx:33` `if (!user) redirect("/login")`; `:36` `if (!user.isAdmin && !isLeader) redirect("/")`; `:39` `scopeIds` limitado a `ledMinistryIds` para líder (linhas inalteradas) |

Sobre rascunhos no calendário: `src/modules/scheduling/services/listMonthOccurrences.ts:54` mostra ocorrência em rascunho só a quem gerencia o ministério, então "faltou" (também só para gerente) nunca aparece em rascunho para quem não gerencia, e o relatório de `/admin` exclui rascunho por `published: true`. Os dois lados são consistentes.

## Gate

verified at `cb8748b`.

`npm run test -- tests/unit/attendanceSummary.test.ts tests/unit/attendanceReport.test.ts tests/unit/attendanceMark.test.ts --reporter=verbose` - 13 passed, 0 failed

`npm run typecheck` exit 0. Provas `grep -q` de C5, C8 e C12 exit 0. Nenhum arquivo de código ou teste foi alterado pelo verificador; a única escrita é este relatório.
