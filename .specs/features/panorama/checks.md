# Panorama de escalas - checks

Profile: light
Plan: `.specs/features/panorama/plan.md`

## Intent

11 checks in 3 slices · 0 one-way doors · 0 open

## Checks

### S1 - Grade função × data · 4 files · 14 KB · ~4k

**C1** - [x] `buildPanorama` com duas ocorrências (`2026-10-04` 19:00 publicada, `2026-10-11` 09:00 rascunho) devolve colunas nessa ordem com `dayLabel` `"04/10"` / `"11/10"`, `time` `"19:00"` / `"09:00"` e `published` `true` / `false` (AC 1)
Proof: `npm run test -- tests/unit/panorama.test.ts -t "colunas"`

**C2** - [x] Funções `Violão`, `Bateria` e `Áudio` saem nas linhas como `["Áudio", "Bateria", "Violão"]`, e uma função que só tem vaga inativa não vira linha (AC 2)
Proof: `npm run test -- tests/unit/panorama.test.ts -t "linhas"`

**C3** - [x] Células: função ausente na ocorrência -> `null`; vaga ativa vazia -> `{ state: "open" }`; alocada -> `{ state: "filled", name, isGuest, pending }` com `pending: true` só para `PENDING` de pessoa com conta (AC 3)
Proof: `npm run test -- tests/unit/panorama.test.ts -t "celulas"`

**C4** - [x] `shortName("Maria Silva Souza") = "Maria S."`, `shortName("Ana") = "Ana"`, `shortName("  joão   pedro ") = "joão p."` (AC 4)
Proof: `npm run test -- tests/unit/panorama.test.ts -t "shortName"`

**C5** - [x] Com hoje `2026-10-05`, uma vaga aberta em `2026-10-04` e duas em `2026-10-11`, `openCount = 2`; vaga aberta em ocorrência de hoje conta (AC 5)
Proof: `npm run test -- tests/unit/panorama.test.ts -t "openCount"`

**C6** - [x] `buildPanorama([])` devolve `columns = []`, `rows = []`, `openCount = 0`, e a página mostra "Nenhuma escala neste mês" nesse caso (AC 6)
Proof: `npm run test -- tests/unit/panorama.test.ts -t "mes vazio"`
Proof: `grep -q "Nenhuma escala neste mês" "app/(app)/escalas/panorama/page.tsx"`

### S2 - Escolha de ministério e mês · 3 files · 8 KB · ~2k

**C7** - [x] `pickMinistry([{m1 Louvor}, {m2 Mídia}], "m2")` devolve `m2`; com `undefined` ou `"m9"` devolve o primeiro (`m1`); com lista vazia devolve `null` (AC 7)
Proof: `npm run test -- tests/unit/panorama.test.ts -t "pickMinistry"`

**C8** - [x] A página mostra "Você ainda não participa de nenhum ministério" quando `pickMinistry` devolve `null` (AC 8)
Proof: `grep -q "Você ainda não participa de nenhum ministério" "app/(app)/escalas/panorama/page.tsx" && grep -q "pickMinistry(" "app/(app)/escalas/panorama/page.tsx"`

**C9** - [x] A página resolve o mês com `parseMonthParam(mes, <mês corrente>)` (AC 9)
Proof: `grep -q "parseMonthParam(mes" "app/(app)/escalas/panorama/page.tsx" && npm run test -- tests/unit/parseMonthParam.test.ts`

**C10** - [x] A página chama `listMonthOccurrences([ministerio], ano, mes, gerenciaveis)` com os gerenciáveis vindos de `ledMinistryIds`, e `listMonthOccurrences` devolve `time` `"HH:mm"` em APP_TZ por item (AC 10)
Proof: `npm run test -- tests/unit/listMonthOccurrences.test.ts -t "time"`
Proof: `grep -Eq "listMonthOccurrences\(\[ministry\.id\], year, month, manageIds\)" "app/(app)/escalas/panorama/page.tsx" && grep -q "ledMinistryIds(" "app/(app)/escalas/panorama/page.tsx" && npm run typecheck`

### S3 - Entrada · 1 file · 3 KB · ~1k

**C11** - [x] `/escalas` linka "Panorama" para `/escalas/panorama` (AC 11)
Proof: `grep -q 'href="/escalas/panorama"' "app/(app)/escalas/page.tsx"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| estados da célula (5) | sem vaga C3 · vaga inativa C2 · aberta C3 · preenchida confirmada C3 · preenchida pendente / convidado C3 | - |
| contagem de abertas por data (3) | passada C5 · hoje C5 · futura C5 | - |
| entrada de `pickMinistry` (4) | id visível C7 · ausente C7 · id não visível C7 · lista vazia C7 | - |
| formato de nome (3) | três palavras C4 · uma palavra C4 · espaços sobrando C4 | - |
| estados vazios da página (2) | sem ministério C8 · mês sem escala C6 | - |

- C6, C8, C9, C10 e C11 têm prova grep para a ligação com a página: o repo não tem teste de componente; a regra em si é provada na função pura
- C9 reusa a suíte existente `parseMonthParam.test.ts`, que já cobre ausente, malformado e mês fora de 01..12
- Nenhum outro check afirma mais do que o caso que sua prova exercita

## Swept

- validation: C7, C9
- failure modes: existing - `app/(app)/error.tsx` cobre falha de leitura
- idempotency: n/a - feature só de leitura
- authorization: C7, C10
- concurrency: n/a - nenhuma escrita
- data lifecycle: n/a - nada gravado
- dependency failure: n/a - sem dependência externa
- state transitions: n/a - nenhum estado alterado
- observability: n/a - sem requisito de log numa leitura

## Handoff

- S1 ~4k + S2 ~2k + S3 ~1k = ~7k (wc -c / 4 dos arquivos tocados), abaixo do budget de 150k - one builder
