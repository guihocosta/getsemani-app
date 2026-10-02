# Panorama de escalas verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 9911ebf..6123488
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Escopo: os 11 checks de `checks.md` (C1..C11), provas rodadas em `4e1756f` (HEAD de `feat/backlog-louveapp`). Nenhum arquivo da feature mudou entre `6123488` e HEAD (`git diff --stat 6123488..HEAD` vazio para os arquivos do diff). Perfil `light`, o mesmo de `checks.md`: sem injeção de falhas, sem recomputar `Coverage`, sem passo de fontes vinculantes. Passo 5 (percorrer o fluxo com o usuário) não se aplica: o verificador não alcança o usuário.

## Checks

Uma única chamada vitest sobre os arquivos de prova das duas features verificadas nesta rodada: `npm run test -- tests/unit/panorama.test.ts tests/unit/parseMonthParam.test.ts tests/unit/listMonthOccurrences.test.ts tests/unit/overview.test.ts tests/unit/overviewData.test.ts --reporter=verbose`, exit 0, 5 arquivos, 21 testes passaram, 0 falharam. Cada teste nomeado abaixo aparece individualmente na saída como executado e aprovado. Cada padrão `-t` de `checks.md` casa com um nome de teste existente (conferido contra os arquivos). As provas `grep` rodaram exatamente como escritas e `npm run typecheck` (`tsc --noEmit`) saiu com 0.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | colunas na ordem recebida com `dayLabel`, `time` e `published` | vitest em lote, `buildPanorama > colunas seguem a ordem recebida com dia, hora e published` passou | `tests/unit/panorama.test.ts:25` - `expect(p.columns).toEqual([{ occurrenceId: "o-2026-10-04", dayLabel: "04/10", time: "19:00", published: true }, { occurrenceId: "o-2026-10-11", dayLabel: "11/10", time: "09:00", published: false }])` | PASS |
| C2 | linhas `["Áudio", "Bateria", "Violão"]`, função só com vaga inativa não vira linha | vitest em lote, `linhas em ordem alfabetica pt-BR, sem funcao que so tem vaga inativa` passou | `tests/unit/panorama.test.ts:43` - `expect(p.rows.map((r) => r.role)).toEqual(["Áudio", "Bateria", "Violão"])` (entrada `:38` traz `Teclado` com `active: false`) | PASS |
| C3 | célula `null`, `open`, `filled` com `name`, `isGuest`, `pending` só para `PENDING` com conta | vitest em lote, `celulas: sem vaga, aberta, preenchida, pendente e convidado` passou | `tests/unit/panorama.test.ts:62` - `expect(linha("Som")).toEqual([{ state: "filled", name: "Maria S.", isGuest: false, pending: false }, { state: "open" }])`; `:66` - `expect(linha("Voz")).toEqual([{ state: "filled", name: "Ana", isGuest: false, pending: true }, null])`; `:67` - `expect(linha("Baixo")).toEqual([null, { state: "filled", name: "Zé C.", isGuest: true, pending: false }])` | PASS |
| C4 | `shortName` nos três formatos | vitest em lote, `shortName usa primeiro nome e inicial do ultimo sobrenome` passou | `tests/unit/panorama.test.ts:90` - `expect(shortName("Maria Silva Souza")).toBe("Maria S.")`; `:91` - `expect(shortName("Ana")).toBe("Ana")`; `:92` - `expect(shortName("  joão   pedro ")).toBe("joão p.")` | PASS |
| C5 | hoje `2026-10-05`: 1 aberta em `10-04` e 2 em `10-11` dão `openCount = 2`; hoje conta | vitest em lote, `openCount conta so vagas abertas de hoje em diante` passou | `tests/unit/panorama.test.ts:78` - `expect(p.openCount).toBe(2)`; `:80` - `expect(buildPanorama([item(HOJE, [slot("r1", "Som")])], HOJE).openCount).toBe(1)` | PASS |
| C6 | `buildPanorama([])` devolve grade vazia e a página mostra "Nenhuma escala neste mês" | vitest em lote, `mes vazio devolve grade vazia` passou; `grep -q "Nenhuma escala neste mês" "app/(app)/escalas/panorama/page.tsx"` exit 0 | `tests/unit/panorama.test.ts:84` - `expect(buildPanorama([], HOJE)).toEqual({ columns: [], rows: [], openCount: 0 })`; `app/(app)/escalas/panorama/page.tsx:118` - `panorama.columns.length === 0 ?` e `:119` - `<EmptyState title="Nenhuma escala neste mês" />` | PASS |
| C7 | `pickMinistry` devolve o pedido só se visível, senão o primeiro, `null` com lista vazia | vitest em lote, `pickMinistry respeita o pedido so quando e visivel` passou | `tests/unit/panorama.test.ts:103` - `expect(pickMinistry(visiveis, "m2")?.id).toBe("m2")`; `:104` - `expect(pickMinistry(visiveis, undefined)?.id).toBe("m1")`; `:105` - `expect(pickMinistry(visiveis, "m9")?.id).toBe("m1")`; `:106` - `expect(pickMinistry([], "m1")).toBeNull()` | PASS |
| C8 | página mostra "Você ainda não participa de nenhum ministério" quando `pickMinistry` devolve `null` | `grep -q "Você ainda não participa de nenhum ministério" ... && grep -q "pickMinistry(" ...` exit 0 | `app/(app)/escalas/panorama/page.tsx:45` - `const ministry = pickMinistry(visible, ministerio)`; `:54` - `if (!ministry) {`; `:59` - `<EmptyState title="Você ainda não participa de nenhum ministério" ...` | PASS |
| C9 | página resolve o mês com `parseMonthParam(mes, <mês corrente>)` | `grep -q "parseMonthParam(mes" ...` exit 0; vitest em lote, os 5 casos de `parseMonthParam` passaram | `app/(app)/escalas/panorama/page.tsx:36` - `parseMonthParam(mes, { year: defYear, month: defMonth })` (fallback vem de `dateKey(new Date())` em `:34`, APP_TZ); `tests/unit/parseMonthParam.test.ts:12` - `expect(parseMonthParam(undefined, fallback)).toEqual(fallback)`; `:16` - `expect(parseMonthParam("garbage", fallback)).toEqual(fallback)` | PASS |
| C10 | página chama `listMonthOccurrences([ministerio], ano, mes, gerenciaveis)` com gerenciáveis de `ledMinistryIds`; item traz `time` `HH:mm` em APP_TZ | vitest em lote, `time vem em HH:mm no fuso do app` passou; `grep -Eq "listMonthOccurrences\(\[ministry\.id\], year, month, manageIds\)" ... && grep -q "ledMinistryIds(" ... && npm run typecheck` exit 0 | `tests/unit/listMonthOccurrences.test.ts:61` - `expect(item.time).toBe("19:00")` (data mockada `2026-10-11T22:00:00Z`); `app/(app)/escalas/panorama/page.tsx:64` - `listMonthOccurrences([ministry.id], year, month, manageIds)`; `:40` - `ledMinistryIds(user.id, user.isAdmin)` | PASS |
| C11 | `/escalas` linka "Panorama" para `/escalas/panorama` | `grep -q 'href="/escalas/panorama"' "app/(app)/escalas/page.tsx"` exit 0 | `app/(app)/escalas/page.tsx:67` - `<Link href="/escalas/panorama" ...>` com o texto `Panorama` em `:68` | PASS |

## Level and sampling

Nenhum item abaixo derruba o veredito: em todos o código foi lido e está correto em `4e1756f`. Ficam registrados porque a prova não pegaria uma regressão.

- **C10 (level)**: a prova não liga `manageIds` ao resultado de `ledMinistryIds`. O `grep` confirma que a chamada existe e que `manageIds` é o quarto argumento, mas a ordem da desestruturação em `app/(app)/escalas/panorama/page.tsx:38-42` (`[viewIds, manageIds, allMinistries]` contra `[visibleMinistryIds, ledMinistryIds, listMinistries]`) não é exercitada. Trocar as duas posições vazaria rascunho (AD-006) com todas as provas verdes. Hoje a ordem está certa.
- **AC 10, primeira metade (sem check)**: nenhum check prova que a coluna em rascunho traz a marca "rascunho". C1 prova só o dado `published: false`. A marca existe em `app/(app)/escalas/panorama/page.tsx:132-136`.
- **C9 (level)**: o trecho "mês corrente (APP_TZ)" do AC 9 só é provado por leitura (`page.tsx:34-36`, `dateKey` usa `formatInTimeZone(..., APP_TZ, ...)` em `src/lib/time.ts`). A suíte `parseMonthParam.test.ts` é anterior à feature e prova a função, não a ligação.
- **C6, C8, C11 (level)**: `grep` prova que a string existe na página, não o que a tela renderiza. Declarado em `checks.md`; o repo não tem teste de componente. Conferido por leitura.
- **C5 (sampling)**: o caso "vaga inativa em data futura não conta" não está na amostra de `openCount`; é coberto de forma indireta por C2 (vaga inativa vira célula nula, e só célula `open` conta, `src/modules/scheduling/domain/panorama.ts:49-53`).
- **AC 10, filtro de rascunho no serviço**: provado por teste anterior à feature (`tests/unit/listMonthOccurrences.test.ts:27`, caso `rascunho so para gerenciaveis e item carrega published`, que passou no mesmo lote). A feature não mudou o `where`.

## Swept rows resolving to existing

| Row | Cited constraint | Found |
| --- | --- | --- |
| failure modes | `app/(app)/error.tsx` cobre falha de leitura | sim - `app/(app)/error.tsx:6` exporta `AppError`, boundary do grupo `(app)`, que contém `escalas/panorama/page.tsx`; `app/(app)/loading.tsx` também existe |

## Adversarial read

Lido o diff inteiro além dos checks. Nenhum achado bloqueante.

- **Autorização por `?ministerio=<id>`**: sem vazamento. `visible` é `listMinistries()` filtrado por `visibleMinistryIds` (`page.tsx:44`; só `Membership` `ACTIVE`, admin vê todos, `src/modules/scheduling/services/listMonthOccurrences.ts:104-113`). `pickMinistry` só devolve item dessa lista (`src/modules/scheduling/domain/panorama.ts:78-80`), e é o `id` desse item, nunca o parâmetro cru, que vai para o serviço (`page.tsx:64`).
- **Rascunho (AD-006)**: sem vazamento. `listMonthOccurrences` aplica `OR: [{ published: true }, { schedule: { ministryId: { in: manageableIds } } }]` (`listMonthOccurrences.ts:54`). Líder de A e voluntário de B abrindo B recebe só publicadas, porque `manageIds` não contém B. Função que só existe em coluna de rascunho não vira linha para quem não gerencia, porque as linhas saem dos itens já filtrados.
- **Duas vagas da mesma função numa ocorrência**: impossível no schema (`prisma/schema.prisma:196`, `@@unique([occurrenceId, roleId])`), então o `find` em `panorama.ts:49` não esconde vaga.
- **Vaga inativa**: não vira linha nem célula (`panorama.ts:39` e `:49`); vaga inativa não guarda alocação (`src/modules/scheduling/services/setSlotActive.ts:21` apaga a alocação ao desligar).
- **Contagem por dia**: comparação de `dayKey` contra `todayKey`, ambos `yyyy-MM-dd` em APP_TZ (`panorama.ts:52`, `page.tsx:34`).
- **Módulos e UI**: domínio puro, página fala com `ministries` e `scheduling` por serviço. Só tokens de tema (busca por cores cruas do Tailwind nos arquivos do diff sem resultado). Textos em pt-BR.

Observações menores, não bloqueantes:

1. **Mobile, 360px** - `app/(app)/escalas/panorama/page.tsx:125` e `:144`: a coluna "Função" é `sticky left-0` dentro de um contêiner `-mx-4 px-4` (`:121`). Ao rolar, o rótulo gruda na borda da tela sem respiro à esquerda. A coluna tem `whitespace-nowrap` sem largura máxima, então nome de função longo come boa parte dos 328px úteis; com colunas de `min-w-24` cabem cerca de duas datas por vez. Usável com rolagem horizontal, que é o que o plano descreve.
2. **Legenda** - `page.tsx:169-172`: a legenda fica dentro do contêiner rolável e sai da tela junto com a tabela; o trecho "· · = função não usada na data" usa o mesmo caractere como separador e como símbolo.
3. **Link de entrada** - `app/(app)/escalas/page.tsx:67`: o link não leva o mês que o usuário estava vendo no calendário; o panorama sempre abre no mês corrente.
4. **Mês extremo** - `page.tsx:36`: `?mes=0000-01` passa em `parseMonthParam` e gera data inválida, caindo no `error.tsx`. Comportamento herdado de `/escalas` e `/admin`, só por URL digitada.

## Gate

`npm run test -- tests/unit/panorama.test.ts tests/unit/parseMonthParam.test.ts tests/unit/listMonthOccurrences.test.ts tests/unit/overview.test.ts tests/unit/overviewData.test.ts --reporter=verbose` - 21 passed, 0 failed

`npm run typecheck` exit 0. Provas `grep` de C6, C8, C9, C10 e C11 exit 0. Árvore de trabalho igual ao baseline, exceto os relatórios de verificação.
