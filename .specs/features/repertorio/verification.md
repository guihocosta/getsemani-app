# Repertório e músicas na escala verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 97256d6..6f0f04c (fix da rodada 1: 42bbdea..9911ebf; fix da rodada 2: f2d7342)
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Os 29 checks estão provados em `HEAD` (6f0f04c) com evidência localizada. O gap que reprovou a
rodada 2 (reordenar corrompia a ordem em lista com buraco) está fechado: `moveInSetlist` monta a
lista já trocada e renumera a lista inteira de 1 a n numa única transação
(`src/modules/repertoire/services/setlist.ts:109` a `:120`). A simulação do algoritmo novo sobre 48
movimentos em 8 listas (buraco, empate duplo e triplo, posições esparsas, entrada única, bordas)
deu sempre a ordem pretendida com posições exatamente 1..n, sem repetição. Os três gaps da rodada 1
seguem fechados. Sobram observações não bloqueantes em `## Residual notes`.

Passo 5 (percorrer o fluxo com o usuário): não executado - o verificador não alcança o usuário.

## Checks

verified at 6f0f04c - todas as provas C1..C29 rodaram de novo neste commit: uma invocação vitest
com `--reporter=verbose` sobre os 6 arquivos e a alternação de todos os padrões `-t` (exit 0, 43
casos passaram, 2 pulados pelo filtro, ambos de outras features); provas grep/test e
`npm run typecheck` como escritas, todas exit 0. Citações de `tests/unit/repertoireSetlist.test.ts`
relocalizadas (o fix inseriu 37 linhas); as demais conferidas e inalteradas desde 4e1756f.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | schema e migração declaram `repertoireEnabled` com default `false` | `grep -Eq ... prisma/schema.prisma && grep -rq ... prisma/migrations` exit 0 | `prisma/schema.prisma:86` - `repertoireEnabled Boolean @default(false)`; `prisma/migrations/20261002190000_repertoire/migration.sql:2` - `ADD COLUMN "repertoireEnabled" BOOLEAN NOT NULL DEFAULT false` | PASS |
| C2 | `updateMinistry` grava `repertoireEnabled` quando informado e omite quando ausente | vitest em lote exit 0; casos "repertoireEnabled informado e gravado" e "repertoireEnabled ausente nao entra no update" passaram | `tests/unit/updateMinistryModule.test.ts:20` - `expect(prisma.ministry.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { repertoireEnabled: true } })`; `:34` - `toHaveBeenCalledWith({ where: { id: "m1" }, data: { name: "Louvor" } })` | PASS |
| C3 | módulo desligado barra `createSong`, `listVersionsForMinistry`, `getSong`, `getSetlist`, sem `song.create` | mesmo run; casos "modulo desligado barra createSong, listVersionsForMinistry e getSong" e "modulo desligado barra getSetlist" passaram | `tests/unit/repertoireSongs.test.ts:133` a `:135` - `rejects.toThrow("MODULE_DISABLED")` nos três; `:136` - `expect(prisma.song.create).not.toHaveBeenCalled()`; `tests/unit/repertoireSetlist.test.ts:231` - `await expect(getSetlist("o1")).rejects.toThrow("MODULE_DISABLED")` | PASS |
| C4 | `createSong` grava título aparado, vazios como `null` e a versão `Original` | mesmo run; caso "createSong grava titulo aparado, vazios como null e a versao Original" passou | `tests/unit/repertoireSongs.test.ts:80` - `expect(prisma.song.create).toHaveBeenCalledWith({ data: { ministryId: "m1", title: "Bondade de Deus", artist: null, category: null, notes: null, versions: { create: { name: "Original" } } } })` | PASS |
| C5 | `songSchema` rejeita vazio/121/121/41/501 e aceita 120/120/40/500 | mesmo run; caso "songSchema rejeita fora dos limites e aceita os limites" passou | `tests/unit/repertoireValidation.test.ts:16` a `:20` - `expect(songSchema.safeParse({ title: x(121) }).success).toBe(false)` e as outras quatro bordas; `:23` - `expect(ok.success).toBe(true)` | PASS |
| C6 | `saveVersion` cria sem `versionId` e atualiza com `versionId`, com os nove campos | mesmo run; os dois casos "saveVersion ..." passaram | `tests/unit/repertoireSongs.test.ts:96` - `expect(prisma.songVersion.create).toHaveBeenCalledWith({ data: { ...versao, songId: "s1" } })`; `:102` - `expect(prisma.songVersion.update).toHaveBeenCalledWith({ where: { id: "v1", songId: "s1" }, data: versao })` | PASS |
| C7 | `versionSchema` rejeita nome vazio/41, tom 11, BPM 19/401/68.5, duração 0/7201; aceita 20/400 e 1/7200 | mesmo run; caso "versionSchema limites de nome, tom, BPM e duracao" passou | `tests/unit/repertoireValidation.test.ts:31` a `:38` - `expect(versionSchema.safeParse({ ...base, bpm: 19 }).success).toBe(false)` e as outras sete; `:40` e `:41` - `toBe(true)` para `bpm: 20, durationSec: 1` e `bpm: 400, durationSec: 7200` | PASS |
| C8 | links só `http(s)` nos quatro campos | mesmo run; `it.each` "links so http(s) em lyricsUrl / chordsUrl / audioUrl / videoUrl" - 4 casos passaram | `tests/unit/repertoireValidation.test.ts:45` - `expect(versionSchema.safeParse({ ...base, [campo]: "javascript:alert(1)" }).success).toBe(false)`; `:46` ftp; `:47` sem esquema; `:49` e `:50` - `toBe(true)` | PASS |
| C9 | `parseDuration` e `formatDuration` nos sete valores | mesmo run; os três casos "duracao ..." passaram | `tests/unit/repertoireValidation.test.ts:56` - `expect(parseDuration("3:45")).toBe(225)`; `:57`; `:58` `toBeNull()`; `:62` e `:63` - `toThrow("INVALID_INPUT")`; `:67` - `expect(formatDuration(225)).toBe("3:45")`; `:68` - `"1:05"` | PASS |
| C10 | `FORBIDDEN` nas cinco escritas de música/versão, sem gravar | mesmo run; caso "FORBIDDEN nao grava em nenhuma escrita de musica ou versao" passou | `tests/unit/repertoireSongs.test.ts:118` a `:122` - `rejects.toThrow("FORBIDDEN")` nas cinco; `:124` - `writes().forEach((w) => expect(w).not.toHaveBeenCalled())` | PASS |
| C11 | `deleteSong` apaga por id e o schema tem três `onDelete: Cascade` | mesmo run (caso "deleteSong apaga a musica pelo id" passou); `test "$(grep -A14 ... grep -c "onDelete: Cascade")" -eq 3` exit 0 | `tests/unit/repertoireSongs.test.ts:110` - `expect(prisma.song.delete).toHaveBeenCalledWith({ where: { id: "s1" } })`; `prisma/schema.prisma:309`, `:323`, `:324` - `onDelete: Cascade` | PASS |
| C12 | `listSongs` consulta só ministérios ligados, por título, com `artist`, `category`, `versionCount` | mesmo run; caso "listSongs so consulta ministerios com modulo ligado, em ordem de titulo" passou | `tests/unit/repertoireSongs.test.ts:163` - `expect.objectContaining({ where: { ministryId: { in: ["m1"] } }, orderBy: { title: "asc" } })`; `:166` - `expect(res.songs).toEqual([{ id: "s1", ministryId: "m1", title: "Bondade", artist: "Banda", category: "Ceia", versionCount: 2 }])` | PASS |
| C13 | `getSong` por não membro rejeita `FORBIDDEN` | mesmo run; caso "getSong nao membro do ministerio recebe FORBIDDEN" passou | `tests/unit/repertoireSongs.test.ts:175` - `await expect(getSong("s1")).rejects.toThrow("FORBIDDEN")` | PASS |
| C14 | `filterSongs` por texto sem acento/caixa, por classificação e pela interseção | mesmo run; caso "filterSongs ignora acento e caixa e filtra por classificacao" passou | `tests/unit/repertoireValidation.test.ts:80` - `toEqual(["Céu Aberto", "Santo"])`; `:81` - `toEqual(["Santo", "Bondade de Deus"])`; `:82` - `toEqual(["Santo"])` | PASS |
| C15 | `repertoireEmptyMessage` nos três estados e `/repertorio` usa a função | mesmo run (caso "repertoireEmptyMessage cobre sem modulo, sem musicas e com musicas" passou); `grep -q "repertoireEmptyMessage(" ... && npm run typecheck` exit 0 | `tests/unit/repertoireValidation.test.ts:88` - `toBe("Repertório não está ativo nos seus ministérios")`; `:91` - `toBe("Nenhuma música cadastrada")`; `:92` - `toBeNull()`; `app/(app)/repertorio/page.tsx:18` | PASS |
| C16 | `addToSetlist` grava `position` 3 com maior 2, e 1 na lista vazia | mesmo run; caso "posicao e a maior existente + 1, ou 1 na lista vazia" passou | `tests/unit/repertoireSetlist.test.ts:81` - `toHaveBeenLastCalledWith({ data: { occurrenceId: "o1", songVersionId: "v1", position: 1 } })`; `:87` - idem com `position: 3` | PASS |
| C17 | `P2002` vira `ALREADY_IN_SETLIST` | mesmo run; caso "P2002 vira ALREADY_IN_SETLIST" passou | `tests/unit/repertoireSetlist.test.ts:94` - `await expect(addToSetlist({ occurrenceId: "o1", versionId: "v1" })).rejects.toThrow("ALREADY_IN_SETLIST")` | PASS |
| C18 | versão de outro ministério rejeita `INVALID_INPUT` sem `create` | mesmo run; caso "versao de outro ministerio rejeita com INVALID_INPUT sem gravar" passou | `tests/unit/repertoireSetlist.test.ts:103` - `rejects.toThrow("INVALID_INPUT")`; `:104` - `expect(prisma.occurrenceSong.create).not.toHaveBeenCalled()` | PASS |
| C19 | `moveInSetlist` troca 1 e 2 com dois `update`; nas bordas não chama `update` | mesmo run; casos "moveInSetlist do meio para cima troca as posicoes 1 e 2" e "moveInSetlist na borda nao altera nada" passaram | `tests/unit/repertoireSetlist.test.ts:113` - `expect(prisma.occurrenceSong.update).toHaveBeenCalledTimes(2)`; `:114` - `toHaveBeenCalledWith({ where: { id: "e2" }, data: { position: 1 } })`; `:115` - `{ where: { id: "e1" }, data: { position: 2 } }`; `:175` - `expect(prisma.occurrenceSong.update).not.toHaveBeenCalled()`. Continua literal com o algoritmo novo: em 1,2,3 a terceira já está no lugar e não é gravada. A lacuna de amostragem da rodada 2 foi fechada pelo C29 | PASS |
| C20 | `removeFromSetlist` apaga por id | mesmo run; caso "removeFromSetlist apaga a entrada pelo id" passou | `tests/unit/repertoireSetlist.test.ts:183` - `expect(prisma.occurrenceSong.delete).toHaveBeenCalledWith({ where: { id: "e1" } })` | PASS |
| C21 | `getSetlist` ordena por `position` e `id` e devolve os campos da versão | mesmo run; caso "getSetlist devolve as entradas em ordem de posicao com os dados da versao" passou | `tests/unit/repertoireSetlist.test.ts:195` - `expect.objectContaining({ where: { occurrenceId: "o1" }, orderBy: [{ position: "asc" }, { id: "asc" }] })`; `:201` - `expect(res.entries).toEqual([{ entryId: "e1", songId: "s1", title: "Bondade de Deus", ... }])` | PASS |
| C22 | rascunho: não líder recebe `FORBIDDEN`, líder vê a lista | mesmo run; caso "rascunho: quem nao lidera recebe FORBIDDEN, quem lidera ve a lista" passou | `tests/unit/repertoireSetlist.test.ts:221` - `await expect(getSetlist("o1")).rejects.toThrow("FORBIDDEN")`; `:225` - `expect(res.entries).toHaveLength(1)`; `:226` - `expect(res.canManage).toBe(true)` | PASS |
| C23 | `FORBIDDEN` em adicionar, mover e remover, sem gravar | mesmo run; caso "FORBIDDEN nao grava ao adicionar, mover ou remover" passou | `tests/unit/repertoireSetlist.test.ts:253` a `:255` - `rejects.toThrow("FORBIDDEN")` nos três; `:257` a `:259` - `not.toHaveBeenCalled()` | PASS |
| C24 | `listMonthOccurrences` e `getMySchedule` devolvem `repertoireEnabled` (e `occurrenceId`); três telas linkam `/repertorio/escala/` | mesmo run (casos "repertoireEnabled acompanha o flag do ministerio da data" e "repertoireEnabled e occurrenceId acompanham a data" passaram); grep triplo `&& npm run typecheck` exit 0 | `tests/unit/listMonthOccurrences.test.ts:49` - `expect(items.map((i) => [i.occurrenceId, i.repertoireEnabled])).toEqual([["o1", true], ["o2", false]])`; `tests/unit/getMySchedule.test.ts:45` e `:46`; `app/(app)/escalas/OccurrenceRow.tsx:464`, `app/(app)/page.tsx:139`, `app/(app)/TodayCheckInCard.tsx:80` | PASS |
| C25 | `repertoireMinistries` filtra por `id in` e flag ligado; página inicial mostra "Repertório" | mesmo run (caso "repertoireMinistries filtra os informados pelo flag ligado" passou); `grep -q 'href="/repertorio"' ... && npm run typecheck` exit 0 | `tests/unit/updateMinistryModule.test.ts:42` - `expect.objectContaining({ where: { id: { in: ["m1", "m2"] }, repertoireEnabled: true } })`; `app/(app)/page.tsx:100` - `repertoire.length > 0 &&`; `:101` - `href="/repertorio"` | PASS |
| C26 | módulo desligado barra as sete escritas restantes, sem gravar | mesmo run; casos "modulo desligado barra updateSong, deleteSong, saveVersion e deleteVersion sem gravar" e "modulo desligado barra toda escrita de setlist sem gravar" passaram | `tests/unit/repertoireSongs.test.ts:144` a `:147` - `rejects.toThrow("MODULE_DISABLED")` nas quatro; `:149` - `writes().forEach((w) => expect(w).not.toHaveBeenCalled())`; `tests/unit/repertoireSetlist.test.ts:238` a `:240` - `rejects.toThrow("MODULE_DISABLED")` em `addToSetlist`, `moveInSetlist`, `removeFromSetlist`; `:242` a `:244` - `not.toHaveBeenCalled()`; guarda em `src/modules/repertoire/services/setlist.ts:90` | PASS |
| C27 | `isMissingOrDenied` classifica os oito casos; as duas páginas relançam o resto | mesmo run (os dois casos "isMissingOrDenied ..." passaram); `test "$(grep -l "if (isMissingOrDenied(e)) return null;" ... wc -l)" -eq 2` exit 0 | `tests/unit/repertoireValidation.test.ts:98` a `:101` - `expect(isMissingOrDenied(new Error("FORBIDDEN"))).toBe(true)`, `MODULE_DISABLED`, `{ code: "P2025" }`, `{ code: "P2023" }`; `:105` a `:108` - `toBe(false)` para `Error("db down")`, `{ code: "P1001" }`, `{ digest: "NEXT_REDIRECT;..." }`, `null`; `app/(app)/repertorio/[id]/page.tsx:16` e `:17`; `app/(app)/repertorio/escala/[occurrenceId]/page.tsx:18` e `:19` | PASS |
| C28 | mover para cima a 2ª de duas entradas empatadas em `position: 1` grava 1 na movida e 2 na vizinha | mesmo run; caso "moveInSetlist troca mesmo com posicoes empatadas" passou | `tests/unit/repertoireSetlist.test.ts:128` - `expect(prisma.occurrenceSong.update).toHaveBeenCalledWith({ where: { id: "e2" }, data: { position: 1 } })`; `:129` - `{ where: { id: "e1" }, data: { position: 2 } }` | PASS |
| C29 | lista 2,3,4: mover a 3ª para cima grava 1,2,3 na ordem 1ª, movida, 2ª com 3 `update`; lista 1,1,2: mover a 1ª para baixo grava 1,2,3 na ordem 2ª, movida, 3ª | mesmo run; casos "moveInSetlist renumera lista com buraco (2,3,4)" e "moveInSetlist renumera lista com empate triplo (1,1,2)" passaram | `tests/unit/repertoireSetlist.test.ts:145` - `expect(prisma.occurrenceSong.update).toHaveBeenCalledTimes(3)`; `:146` - `toHaveBeenCalledWith({ where: { id: "m" }, data: { position: 1 } })`; `:147` - `{ where: { id: "c" }, data: { position: 2 } }`; `:148` - `{ where: { id: "q" }, data: { position: 3 } }`; `:163` a `:166` - idem para `b` 1, `a` 2, `c` 3; código em `src/modules/repertoire/services/setlist.ts:114` | PASS |

29 de 29 provados com evidência localizada.

### Level and sampling judgment

- **C19, C28, C29 - verified at 6f0f04c.** O conjunto "estado das posições antes de mover" agora
  tem os quatro membros com prova (contíguas C19, empate duplo C28, buraco C29, empate triplo C29).
  O teste do buraco usa ids fora de ordem alfabética (`m`, `q`, `c`), que é o que fazia o algoritmo
  da rodada 2 errar, e afirma a posição final das três entradas.
- carried from 4e1756f: C27 prova o relançamento nas páginas por grep (a linha seguinte é
  `throw e` nas duas, conferido por leitura); `P2023` para UUID malformado não foi exercitado
  contra banco real.
- carried from 42bbdea: C17 simula `P2002` por mock e não prova o unique do door 3 (existe em
  `prisma/schema.prisma:326`); C15, C24 e C25 provam a ligação com a tela por grep + typecheck.

## Swept existing

carried from 4e1756f - o fix da rodada 2 não tocou esses caminhos.

| Row | Cited constraint | In the code | Finding |
| --- | --- | --- | --- |
| failure modes (C27) | erro inesperado de leitura sobe para `app/(app)/error.tsx` | sim - `app/(app)/repertorio/[id]/page.tsx:17` e `app/(app)/repertorio/escala/[occurrenceId]/page.tsx:19` relançam | - |
| failure modes | `handleActionError` devolve `code` + `ref` nas actions | sim - `src/lib/actionError.ts:60` | - |
| observability | `handleActionError` loga com escopo e `ref` | sim - `src/lib/actionError.ts:67`, `src/lib/logError.ts:14` | - |

## Adversarial read

**`moveInSetlist` novo - verified at 6f0f04c.** Leitura de `setlist.ts:100` a `:121`: busca a
lista em `position asc, id asc`, troca as duas entradas numa cópia (`:109` a `:111`) e, numa única
`$transaction`, grava `i + 1` nas duas trocadas e em toda entrada cuja posição difere de `i + 1`
(`:114` a `:120`). Depois de qualquer movimento toda entrada no índice `i` tem posição `i + 1`: ou
foi gravada, ou já valia isso. Na borda retorna antes de gravar (`:107`).

Simulação do algoritmo (réplica das linhas `:104` a `:120`, mesma ordenação), todos os movimentos
possíveis de cada lista - 48 casos, 0 errados:

| Lista (id:posição, na ordem lida) | Movimentos testados | Ordem final | Posições finais |
| --- | --- | --- | --- |
| m:2 q:3 c:4 (buraco no início) | 4 trocas, 2 bordas | sempre a troca pedida (ex.: c para cima dá m c q) | 1,2,3 |
| a:1 b:1 0c:2 (empate, 3º id menor) | 4 trocas, 2 bordas | sempre a troca pedida (ex.: a para baixo dá b a 0c) | 1,2,3 |
| a:1 b:5 c:9 (esparsa) | 4 trocas, 2 bordas | sempre a troca pedida | 1,2,3 |
| a:1 k:1 z:1 (empate triplo) | 4 trocas, 2 bordas | sempre a troca pedida | 1,2,3 |
| s:7 (entrada única) | 2 bordas | inalterada | nenhuma escrita |
| e1:1 e2:2 e3:3 (contígua, C19) | 4 trocas, 2 bordas | sempre a troca pedida | 1,2,3 com 2 escritas |
| e1:1 e2:1 (C28) | 2 trocas, 2 bordas | sempre a troca pedida | 1,2 |
| b:3 f:3 a:7 m:7 x:7 c:20 (buracos e empates) | 10 trocas, 2 bordas | sempre a troca pedida | 1,2,3,4,5,6 |

Primeira para cima e última para baixo: nenhuma escrita em todas as listas, e a lista fica como
estava (inclusive com buraco ou empate, o que não quebra nada: a próxima troca renumera).
Interação com o resto: `addToSetlist` usa maior posição + 1 (`setlist.ts:77`), coerente com lista
renumerada; `removeFromSetlist` segue sem renumerar, o que agora é inofensivo.

**Carried from 4e1756f**: flag do módulo nos 12 serviços exportados; classificação de erro nas
páginas (404 real, redirect, erro inesperado); limite de módulo.
**Carried from 42bbdea**: a. autorização entre ministérios e por id cru; c. rascunho (AD-006);
d. links como `href`; f. tokens de tema e textos pt-BR.

## Residual notes

Não bloqueiam.

- **Mover concorrente com remover** (verified at 6f0f04c): se outra pessoa remove uma entrada entre
  a leitura e a transação de `moveInSetlist`, o `update` da entrada apagada falha com `P2025`, a
  transação inteira desfaz e a action responde `UNKNOWN`. Nada fica inconsistente; basta repetir.
- **Mover grava até n linhas** na primeira troca de uma lista com buraco no início (uma por
  entrada fora do lugar). Listas de músicas têm poucas entradas; sem impacto.
- carried from 4e1756f: ordem busca-antes-de-autorizar (`songs.ts:78`, `songs.ts:108`,
  `setlist.ts:87`, `setlist.ts:57`) distingue `FORBIDDEN` de `UNKNOWN` para quem já tem o UUID;
  link "Músicas" para alocado sem membership ativa leva a 404; `direction` sem validação em runtime
  (`setlist.ts:105`); cabeçalho da música não mostra mais o ministério.
- **Go-live** (do plano, não da verificação): a migração `20261002190000_repertoire` não foi
  aplicada; o código que lê as tabelas novas quebra em produção se subir antes de `db:deploy`.

## Gate

verified at 6f0f04c: `npm run test` - 377 passed, 0 failed (62 arquivos); `npm run typecheck` exit 0; `npm run lint` exit 0 (sem avisos). Árvore de trabalho inalterada além deste relatório.
