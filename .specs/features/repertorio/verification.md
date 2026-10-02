# Repertório e músicas na escala verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: 97256d6..4e1756f (fix da rodada 1: 42bbdea..9911ebf)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Os três gaps da rodada 1 estão fechados no código: `ledEntry` checa o flag do módulo, as duas
páginas de leitura só convertem em 404 o que é falta de acesso, módulo desligado ou id inexistente,
e `getSong` não lê mais `Ministry`. As 28 provas rodam verdes em `HEAD` (4e1756f).

A reprovação desta rodada vem do próprio fix: a mudança em `moveInSetlist` (residual de posições
empatadas) trocou "troca a posição com a vizinha" por "grava índice + 1 nas duas", e isso
**corrompe a ordem quando a lista tem buraco antes do par movido** - o caso comum de remover a
primeira música e depois reordenar. A AC 19 passa a ser violada num caminho que funcionava em
42bbdea. C19 e C28 só exercitam posições contíguas a partir de 1 e por isso continuam verdes.

Passo 5 (percorrer o fluxo com o usuário): não executado - o verificador não alcança o usuário.

## Checks

verified at 4e1756f - todas as provas C1..C28 rodaram de novo neste commit: uma invocação vitest
com `--reporter=verbose` sobre os 6 arquivos e a alternação de todos os padrões `-t` (exit 0, 41
casos passaram, 2 pulados pelo filtro, ambos de outras features); provas grep/test e
`npm run typecheck` como escritas, todas exit 0. Citações relocalizadas nos arquivos que o fix ou
commits posteriores tocaram (`repertoireSongs.test.ts`, `repertoireSetlist.test.ts`,
`repertoireValidation.test.ts`, `prisma/schema.prisma`, `app/(app)/page.tsx`, `OccurrenceRow.tsx`).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | schema e migração declaram `repertoireEnabled` com default `false` | `grep -Eq ... prisma/schema.prisma && grep -rq ... prisma/migrations` exit 0 | `prisma/schema.prisma:86` - `repertoireEnabled Boolean @default(false)`; `prisma/migrations/20261002190000_repertoire/migration.sql:2` - `ADD COLUMN "repertoireEnabled" BOOLEAN NOT NULL DEFAULT false` | PASS |
| C2 | `updateMinistry` grava `repertoireEnabled` quando informado e omite quando ausente | vitest em lote exit 0; casos "repertoireEnabled informado e gravado" e "repertoireEnabled ausente nao entra no update" passaram | `tests/unit/updateMinistryModule.test.ts:20` - `expect(prisma.ministry.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { repertoireEnabled: true } })`; `:34` - `toHaveBeenCalledWith({ where: { id: "m1" }, data: { name: "Louvor" } })` | PASS |
| C3 | módulo desligado barra `createSong`, `listVersionsForMinistry`, `getSong`, `getSetlist`, sem `song.create` | mesmo run; casos "modulo desligado barra createSong, listVersionsForMinistry e getSong" e "modulo desligado barra getSetlist" passaram | `tests/unit/repertoireSongs.test.ts:133` a `:135` - `rejects.toThrow("MODULE_DISABLED")` nos três; `:136` - `expect(prisma.song.create).not.toHaveBeenCalled()`; `tests/unit/repertoireSetlist.test.ts:194` - `await expect(getSetlist("o1")).rejects.toThrow("MODULE_DISABLED")`. A lacuna de amostragem da rodada 1 foi fechada pelo C26 | PASS |
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
| C19 | `moveInSetlist` troca 1 e 2 com dois `update`; nas bordas não chama `update` | mesmo run; casos "moveInSetlist do meio para cima troca as posicoes 1 e 2" e "moveInSetlist na borda nao altera nada" passaram | `tests/unit/repertoireSetlist.test.ts:113` - `toHaveBeenCalledTimes(2)`; `:114` - `toHaveBeenCalledWith({ where: { id: "e2" }, data: { position: 1 } })`; `:115`; `:138` - `expect(prisma.occurrenceSong.update).not.toHaveBeenCalled()`. A afirmação literal está provada, mas só com posições contíguas 1,2,3; com buraco antes do par (ex.: 2,3,4) `src/modules/repertoire/services/setlist.ts:110` grava índice + 1 e empata com a entrada anterior, violando a AC 19 | FAIL |
| C20 | `removeFromSetlist` apaga por id | mesmo run; caso "removeFromSetlist apaga a entrada pelo id" passou | `tests/unit/repertoireSetlist.test.ts:146` - `expect(prisma.occurrenceSong.delete).toHaveBeenCalledWith({ where: { id: "e1" } })` | PASS |
| C21 | `getSetlist` ordena por `position` e `id` e devolve os campos da versão | mesmo run; caso "getSetlist devolve as entradas em ordem de posicao com os dados da versao" passou | `tests/unit/repertoireSetlist.test.ts:158` - `expect.objectContaining({ where: { occurrenceId: "o1" }, orderBy: [{ position: "asc" }, { id: "asc" }] })`; `:164` - `expect(res.entries).toEqual([{ entryId: "e1", songId: "s1", title: "Bondade de Deus", ... }])` | PASS |
| C22 | rascunho: não líder recebe `FORBIDDEN`, líder vê a lista | mesmo run; caso "rascunho: quem nao lidera recebe FORBIDDEN, quem lidera ve a lista" passou | `tests/unit/repertoireSetlist.test.ts:184` - `await expect(getSetlist("o1")).rejects.toThrow("FORBIDDEN")`; `:188` - `expect(res.entries).toHaveLength(1)`; `:189` - `expect(res.canManage).toBe(true)` | PASS |
| C23 | `FORBIDDEN` em adicionar, mover e remover, sem gravar | mesmo run; caso "FORBIDDEN nao grava ao adicionar, mover ou remover" passou | `tests/unit/repertoireSetlist.test.ts:216` a `:218` - `rejects.toThrow("FORBIDDEN")` nos três; `:220` a `:222` - `not.toHaveBeenCalled()` | PASS |
| C24 | `listMonthOccurrences` e `getMySchedule` devolvem `repertoireEnabled` (e `occurrenceId`); três telas linkam `/repertorio/escala/` | mesmo run (casos "repertoireEnabled acompanha o flag do ministerio da data" e "repertoireEnabled e occurrenceId acompanham a data" passaram); grep triplo `&& npm run typecheck` exit 0 | `tests/unit/listMonthOccurrences.test.ts:49` - `expect(items.map((i) => [i.occurrenceId, i.repertoireEnabled])).toEqual([["o1", true], ["o2", false]])`; `tests/unit/getMySchedule.test.ts:45` e `:46`; `app/(app)/escalas/OccurrenceRow.tsx:464`, `app/(app)/page.tsx:139`, `app/(app)/TodayCheckInCard.tsx:80` | PASS |
| C25 | `repertoireMinistries` filtra por `id in` e flag ligado; página inicial mostra "Repertório" | mesmo run (caso "repertoireMinistries filtra os informados pelo flag ligado" passou); `grep -q 'href="/repertorio"' ... && npm run typecheck` exit 0 | `tests/unit/updateMinistryModule.test.ts:42` - `expect.objectContaining({ where: { id: { in: ["m1", "m2"] }, repertoireEnabled: true } })`; `app/(app)/page.tsx:100` - `repertoire.length > 0 &&`; `:101` - `href="/repertorio"` | PASS |
| C26 | módulo desligado barra as sete escritas restantes, sem gravar | mesmo run; casos "modulo desligado barra updateSong, deleteSong, saveVersion e deleteVersion sem gravar" e "modulo desligado barra toda escrita de setlist sem gravar" passaram | `tests/unit/repertoireSongs.test.ts:144` a `:147` - `rejects.toThrow("MODULE_DISABLED")` nas quatro; `:149` - `writes().forEach((w) => expect(w).not.toHaveBeenCalled())`; `tests/unit/repertoireSetlist.test.ts:201` a `:203` - `rejects.toThrow("MODULE_DISABLED")` em `addToSetlist`, `moveInSetlist`, `removeFromSetlist`; `:205` a `:207` - `create`, `update`, `delete` com `not.toHaveBeenCalled()`; guarda em `src/modules/repertoire/services/setlist.ts:90` | PASS |
| C27 | `isMissingOrDenied` classifica os oito casos; as duas páginas relançam o resto | mesmo run (os dois casos "isMissingOrDenied ..." passaram); `test "$(grep -l "if (isMissingOrDenied(e)) return null;" ... wc -l)" -eq 2` exit 0 | `tests/unit/repertoireValidation.test.ts:98` a `:101` - `expect(isMissingOrDenied(new Error("FORBIDDEN"))).toBe(true)`, `MODULE_DISABLED`, `{ code: "P2025" }`, `{ code: "P2023" }`; `:105` a `:108` - `toBe(false)` para `Error("db down")`, `{ code: "P1001" }`, `{ digest: "NEXT_REDIRECT;..." }`, `null`; `app/(app)/repertorio/[id]/page.tsx:16` e `:17`; `app/(app)/repertorio/escala/[occurrenceId]/page.tsx:18` e `:19` | PASS |
| C28 | mover para cima a 2ª de duas entradas empatadas em `position: 1` grava 1 na movida e 2 na vizinha | mesmo run; caso "moveInSetlist troca mesmo com posicoes empatadas" passou | `tests/unit/repertoireSetlist.test.ts:128` - `expect(prisma.occurrenceSong.update).toHaveBeenCalledWith({ where: { id: "e2" }, data: { position: 1 } })`; `:129` - `{ where: { id: "e1" }, data: { position: 2 } }` | PASS |

27 de 28 com resultado PASS. C19 tem a afirmação literal provada e é reprovado pela lacuna de
amostragem que deixou passar a regressão do gap 1.

### Level and sampling judgment

- **C19 e C28 - lacuna de amostragem (bloqueante), verified at 4e1756f.** Os três casos de
  `moveInSetlist` usam listas em que `position === índice + 1` (1,2,3) ou lista de duas entradas
  (1,1). Nenhum tem buraco, que é o estado normal depois de `removeFromSetlist` (apaga sem
  renumerar - `setlist.ts:118`). É exatamente onde o algoritmo novo falha.
- **C27 - nível declarado.** O relançamento nas páginas é provado por grep da linha
  `if (isMissingOrDenied(e)) return null;`; conferido por leitura que a linha seguinte é `throw e`
  nas duas. `P2023` para UUID malformado não foi exercitado contra banco real (migração não
  aplicada); se o código real for outro, o efeito é tela de erro em vez de 404, sem vazamento.
- carried from 42bbdea: C17 simula `P2002` por mock e não prova o unique do door 3 (existe em
  `prisma/schema.prisma:326`); C15, C24 e C25 provam a ligação com a tela por grep + typecheck.

## Swept existing

verified at 4e1756f para a linha que o fix mudou; o resto carried from 42bbdea.

| Row | Cited constraint | In the code | Finding |
| --- | --- | --- | --- |
| failure modes (agora C27) | erro inesperado de leitura sobe para `app/(app)/error.tsx` | sim - `app/(app)/repertorio/[id]/page.tsx:17` e `app/(app)/repertorio/escala/[occurrenceId]/page.tsx:19` relançam; `app/(app)/error.tsx` existe e mostra o `digest` | - |
| failure modes | `handleActionError` devolve `code` + `ref` nas actions | sim - `src/lib/actionError.ts:60` (carried from 42bbdea) | - |
| observability | `handleActionError` loga com escopo e `ref` | sim - `src/lib/actionError.ts:67`, `src/lib/logError.ts:14` (carried from 42bbdea) | - |

## Adversarial read

**Gaps da rodada 1 - verified at 4e1756f.**
- Gap 1 (flag do módulo): fechado. Os 12 serviços exportados de `src/modules/repertoire` checam o
  flag: `listSongs` filtra por `repertoireMinistries` (`songs.ts:16`); `getSong` (`songs.ts:46`);
  `listVersionsForMinistry` (`songs.ts:54`); `createSong` (`songs.ts:69`); `updateSong`,
  `deleteSong`, `saveVersion`, `deleteVersion` via `ledSong` (`songs.ts:80`); `getSetlist`
  (`setlist.ts:22`); `addToSetlist` (`setlist.ts:59`); `moveInSetlist` e `removeFromSetlist` via
  `ledEntry` (`setlist.ts:90`). Todos com teste (C3, C12, C26).
- Gap 2 (classificação de erro nas páginas): fechado. "Não encontrado" real continua 404:
  `findUniqueOrThrow` lança `P2025`, que `isMissingOrDenied` reconhece
  (`src/modules/repertoire/domain/validation.ts:96`). Redirect continua redirect: o erro de
  `redirect()` tem `message` `NEXT_REDIRECT` e nenhum `code`, cai no `throw e`. Erro inesperado
  (banco fora, bug) agora propaga para o error boundary. `listVersionsForMinistry` na página da
  escala fica fora do `catch` (`escala/[occurrenceId]/page.tsx:23`) e também propaga.
- Gap 3 (limite de módulo): fechado. `getSong` inclui só `versions` (`songs.ts:42`); busca por
  `prisma.ministry`, `prisma.membership`, `prisma.occurrence` e includes de `ministry`/`occurrence`
  em `src/modules/repertoire` não acha nada. O nome do ministério saiu do cabeçalho da música.

**`moveInSetlist` - buraco novo, verified at 4e1756f.** Ver gap 1 abaixo. Simulação do algoritmo
de `setlist.ts:98` a `:112` (mesma ordenação `position asc, id asc`):

| Lista antes (id:posição) | Movimento | Esperado | Resultado |
| --- | --- | --- | --- |
| a:1 b:5 c:9 | c para cima | a c b | a:1 c:2 b:3 - correto |
| m:2 q:3 c:4 (1ª removida) | c para cima | m c q | c:2 m:2 q:3 - ordem c m q, errado |
| m:2 q:3 c:4 (1ª removida) | q para baixo | m c q | c:2 m:2 q:3 - ordem c m q, errado |
| x:2 y:3 z:4 (1ª removida) | z para cima | x z y | x:2 z:2 y:3 - certo só porque x vem antes de z por id |
| a:1 b:1 0c:2 | a para baixo | b a 0c | b:1 0c:2 a:2 - errado |

Com 1,5,9 um movimento ainda dá ordem consistente. Com buraco **antes** do par (posições maiores
que índice + 1 nas entradas anteriores) a entrada movida empata com a anterior e o desempate é o
UUID, então metade das vezes ela pula uma casa a mais. Com 1,1,2 a terceira entrada empata com a
que desceu.

**Carried from 42bbdea** (o fix não tocou esses caminhos): a. autorização entre ministérios e por
id cru; c. rascunho (AD-006); d. links como `href` (o fix só acrescentou `isMissingOrDenied` em
`validation.ts`, regex inalterado); f. tokens de tema e textos pt-BR (o fix só removeu uma linha em
`SongDetail.tsx`).

## Ranked gaps

1. **Reordenar corrompe a ordem quando há buraco nas posições (AC 19, regressão do fix) - C19 -
   `src/modules/repertoire/services/setlist.ts:110` e `:111`.** O fix grava `neighbourIndex + 1` e
   `index + 1` só nas duas entradas trocadas e deixa as outras com a posição antiga. Depois de
   remover a primeira música (posições 2,3,4), mover a terceira para cima grava 2 e 3: a movida
   empata em 2 com a primeira e a ordem final depende do UUID. Em 42bbdea esse caso funcionava
   (troca de posições entre vizinhas). Correção esperada: renumerar a lista inteira na transação
   (índice + 1 para todas após a troca), ou trocar as posições e só renumerar quando empatadas; e
   teste com buraco (ex.: 2,3,4) e com empate triplo.

## Residual notes

Não bloqueiam. carried from 42bbdea salvo indicação.

- **Ordem busca-antes-de-autorizar.** `ledSong` (`songs.ts:78`), `deleteVersion` (`songs.ts:108`),
  `ledEntry` (`setlist.ts:87`) e `addToSetlist` (`setlist.ts:57`) respondem `FORBIDDEN` para id
  existente e `UNKNOWN` para inexistente; só distingue existência para quem já tem o UUID.
- **Link "Músicas" para alocado sem membership ativa** leva a 404.
- **`direction` sem validação em runtime** (`setlist.ts:103`): qualquer valor diferente de `"up"`
  vale como `"down"`.
- **Cabeçalho da música sem ministério** (verified at 4e1756f): quem é membro de dois ministérios
  com repertório não vê na página da música a qual ela pertence; a lista em `/repertorio` ainda
  mostra. Consequência aceita do fix do gap 3.

## Gate

verified at 4e1756f: `npm run test` - 365 passed, 0 failed (61 arquivos); `npm run typecheck` exit 0; `npm run lint` exit 0 (sem avisos). Árvore de trabalho inalterada além deste relatório e do registro de lições.
