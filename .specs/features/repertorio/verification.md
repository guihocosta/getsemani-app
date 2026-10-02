# Repertório e músicas na escala verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: 97256d6..42bbdea
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

As 25 provas rodam verdes em `HEAD` (42bbdea) e cada teste nomeado existe, rodou e tem asserção
localizada. A reprovação vem da leitura adversarial do diff: `moveInSetlist` e `removeFromSetlist`
não checam o flag do módulo, então a AC 3 ("os serviços de `repertoire` SHALL rejeitar escrita e
leitura com `MODULE_DISABLED`") e a AD-007 ("desligar preserva os dados e bloqueia o acesso") são
violadas por um caminho de escrita real. O C3 só amostra 4 dos 12 serviços exportados e por isso
ficou verde em cima do buraco. Há mais dois achados menores (erro de leitura engolido como 404 e
leitura direta de `Ministry` pelo módulo `repertoire`) em `## Ranked gaps`.

Autorização entre ministérios, rascunho (AD-006), links como `href` e convenções de UI foram lidos
contra o código e não têm buraco: detalhes em `## Adversarial read`.

Passo 5 (percorrer o fluxo com o usuário): não executado - o verificador não alcança o usuário.

## Checks

verified at 42bbdea. Provas vitest em uma única invocação com `--reporter=verbose` sobre os 6
arquivos e a alternação de todos os padrões `-t` do checks.md: exit 0, 36 casos passaram, 1 pulado
pelo filtro (caso pré-existente de `getMySchedule` fora dos padrões). Cada caso citado abaixo
aparece individualmente como passado na saída. Provas grep/test e `npm run typecheck` rodadas
exatamente como escritas, todas exit 0.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | schema e migração declaram `repertoireEnabled` com default `false` | `grep -Eq ... prisma/schema.prisma && grep -rq ... prisma/migrations` exit 0 | `prisma/schema.prisma:83` - `repertoireEnabled Boolean @default(false)`; `prisma/migrations/20261002190000_repertoire/migration.sql:2` - `ADD COLUMN "repertoireEnabled" BOOLEAN NOT NULL DEFAULT false` | PASS |
| C2 | `updateMinistry` grava `repertoireEnabled` quando informado e omite quando ausente | vitest em lote exit 0; casos "repertoireEnabled informado e gravado" e "repertoireEnabled ausente nao entra no update" passaram | `tests/unit/updateMinistryModule.test.ts:20` - `expect(prisma.ministry.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { repertoireEnabled: true } })`; `:34` - `toHaveBeenCalledWith({ where: { id: "m1" }, data: { name: "Louvor" } })` | PASS |
| C3 | módulo desligado barra `createSong`, `listVersionsForMinistry`, `getSong`, `getSetlist` com `MODULE_DISABLED`, sem `song.create` | mesmo run; casos "modulo desligado barra createSong, listVersionsForMinistry e getSong" e "modulo desligado barra getSetlist" passaram | `tests/unit/repertoireSongs.test.ts:133` a `:135` - `rejects.toThrow("MODULE_DISABLED")` nos três; `:136` - `expect(prisma.song.create).not.toHaveBeenCalled()`; `tests/unit/repertoireSetlist.test.ts:180` - `await expect(getSetlist("o1")).rejects.toThrow("MODULE_DISABLED")`. A afirmação literal está provada, mas a amostra (4 de 12 serviços) esconde violação real da AC 3: `src/modules/repertoire/services/setlist.ts:86` (`ledEntry`) não chama `assertRepertoireEnabled`, então `moveInSetlist` (`:94`) e `removeFromSetlist` (`:113`) gravam com o módulo desligado | FAIL |
| C4 | `createSong` grava título aparado, vazios como `null` e a versão `Original` | mesmo run; caso "createSong grava titulo aparado, vazios como null e a versao Original" passou | `tests/unit/repertoireSongs.test.ts:80` - `expect(prisma.song.create).toHaveBeenCalledWith({ data: { ministryId: "m1", title: "Bondade de Deus", artist: null, category: null, notes: null, versions: { create: { name: "Original" } } } })` | PASS |
| C5 | `songSchema` rejeita vazio/121/121/41/501 e aceita 120/120/40/500 | mesmo run; caso "songSchema rejeita fora dos limites e aceita os limites" passou | `tests/unit/repertoireValidation.test.ts:15` a `:19` - `expect(songSchema.safeParse({ title: x(121) }).success).toBe(false)` e as outras quatro bordas; `:22` - `expect(ok.success).toBe(true)` sobre `x(120)`, `x(120)`, `x(40)`, `x(500)` | PASS |
| C6 | `saveVersion` cria sem `versionId` e atualiza com `versionId`, com os nove campos | mesmo run; casos "saveVersion sem versionId cria com todos os campos" e "saveVersion com versionId atualiza com todos os campos" passaram | `tests/unit/repertoireSongs.test.ts:96` - `expect(prisma.songVersion.create).toHaveBeenCalledWith({ data: { ...versao, songId: "s1" } })`; `:102` - `expect(prisma.songVersion.update).toHaveBeenCalledWith({ where: { id: "v1", songId: "s1" }, data: versao })` (`versao` com os nove campos em `:41`) | PASS |
| C7 | `versionSchema` rejeita nome vazio/41, tom 11, BPM 19/401/68.5, duração 0/7201; aceita 20/400 e 1/7200 | mesmo run; caso "versionSchema limites de nome, tom, BPM e duracao" passou | `tests/unit/repertoireValidation.test.ts:30` a `:37` - `expect(versionSchema.safeParse({ ...base, bpm: 19 }).success).toBe(false)` e as outras sete rejeições; `:39` e `:40` - `safeParse({ ...base, bpm: 20, durationSec: 1 }).success).toBe(true)` e `bpm: 400, durationSec: 7200` | PASS |
| C8 | links só `http(s)` nos quatro campos | mesmo run; `it.each` "links so http(s) em lyricsUrl / chordsUrl / audioUrl / videoUrl" - os 4 casos passaram | `tests/unit/repertoireValidation.test.ts:44` - `expect(versionSchema.safeParse({ ...base, [campo]: "javascript:alert(1)" }).success).toBe(false)`; `:45` ftp; `:46` sem esquema; `:48` e `:49` - `https://` e `http://` com `toBe(true)` | PASS |
| C9 | `parseDuration` e `formatDuration` nos sete valores | mesmo run; casos "duracao digitada vira segundos", "duracao invalida lanca INVALID_INPUT" e "duracao em segundos vira m:ss" passaram | `tests/unit/repertoireValidation.test.ts:55` - `expect(parseDuration("3:45")).toBe(225)`; `:56` 45; `:57` `toBeNull()`; `:61` e `:62` - `toThrow("INVALID_INPUT")`; `:66` - `expect(formatDuration(225)).toBe("3:45")`; `:67` - `"1:05"` | PASS |
| C10 | `FORBIDDEN` nas cinco escritas de música/versão, sem gravar | mesmo run; caso "FORBIDDEN nao grava em nenhuma escrita de musica ou versao" passou | `tests/unit/repertoireSongs.test.ts:118` a `:122` - `rejects.toThrow("FORBIDDEN")` para `createSong`, `updateSong`, `deleteSong`, `saveVersion`, `deleteVersion`; `:124` - `writes().forEach((w) => expect(w).not.toHaveBeenCalled())` | PASS |
| C11 | `deleteSong` apaga por id e o schema tem três `onDelete: Cascade` | mesmo run (caso "deleteSong apaga a musica pelo id" passou); `test "$(grep -A14 ... grep -c "onDelete: Cascade")" -eq 3` exit 0 | `tests/unit/repertoireSongs.test.ts:110` - `expect(prisma.song.delete).toHaveBeenCalledWith({ where: { id: "s1" } })`; `prisma/schema.prisma:305`, `:319`, `:320` - `onDelete: Cascade` | PASS |
| C12 | `listSongs` consulta só ministérios ligados, por título, com `artist`, `category`, `versionCount` | mesmo run; caso "listSongs so consulta ministerios com modulo ligado, em ordem de titulo" passou | `tests/unit/repertoireSongs.test.ts:150` - `expect.objectContaining({ where: { ministryId: { in: ["m1"] } }, orderBy: { title: "asc" } })`; `:153` - `expect(res.songs).toEqual([{ id: "s1", ministryId: "m1", title: "Bondade", artist: "Banda", category: "Ceia", versionCount: 2 }])` | PASS |
| C13 | `getSong` por não membro rejeita `FORBIDDEN` | mesmo run; caso "getSong nao membro do ministerio recebe FORBIDDEN" passou | `tests/unit/repertoireSongs.test.ts:162` - `await expect(getSong("s1")).rejects.toThrow("FORBIDDEN")` (visíveis `["m2"]` em `:161`) | PASS |
| C14 | `filterSongs` por texto sem acento/caixa, por classificação e pela interseção | mesmo run; caso "filterSongs ignora acento e caixa e filtra por classificacao" passou | `tests/unit/repertoireValidation.test.ts:79` - `toEqual(["Céu Aberto", "Santo"])`; `:80` - `toEqual(["Santo", "Bondade de Deus"])`; `:81` - `toEqual(["Santo"])` | PASS |
| C15 | `repertoireEmptyMessage` nos três estados e `/repertorio` usa a função | mesmo run (caso "repertoireEmptyMessage cobre sem modulo, sem musicas e com musicas" passou); `grep -q "repertoireEmptyMessage(" ... && npm run typecheck` exit 0 | `tests/unit/repertoireValidation.test.ts:87` - `toBe("Repertório não está ativo nos seus ministérios")`; `:90` - `toBe("Nenhuma música cadastrada")`; `:91` - `toBeNull()`; `app/(app)/repertorio/page.tsx:18` | PASS |
| C16 | `addToSetlist` grava `position` 3 com maior 2, e 1 na lista vazia | mesmo run; caso "posicao e a maior existente + 1, ou 1 na lista vazia" passou | `tests/unit/repertoireSetlist.test.ts:81` - `toHaveBeenLastCalledWith({ data: { occurrenceId: "o1", songVersionId: "v1", position: 1 } })`; `:87` - idem com `position: 3` | PASS |
| C17 | `P2002` vira `ALREADY_IN_SETLIST` | mesmo run; caso "P2002 vira ALREADY_IN_SETLIST" passou | `tests/unit/repertoireSetlist.test.ts:94` - `await expect(addToSetlist({ occurrenceId: "o1", versionId: "v1" })).rejects.toThrow("ALREADY_IN_SETLIST")` | PASS |
| C18 | versão de outro ministério rejeita `INVALID_INPUT` sem `create` | mesmo run; caso "versao de outro ministerio rejeita com INVALID_INPUT sem gravar" passou | `tests/unit/repertoireSetlist.test.ts:103` - `rejects.toThrow("INVALID_INPUT")`; `:104` - `expect(prisma.occurrenceSong.create).not.toHaveBeenCalled()` | PASS |
| C19 | `moveInSetlist` troca 1 e 2 com dois `update`; nas bordas não chama `update` | mesmo run; casos "moveInSetlist do meio para cima troca as posicoes 1 e 2" e "moveInSetlist na borda nao altera nada" passaram | `tests/unit/repertoireSetlist.test.ts:113` - `toHaveBeenCalledTimes(2)`; `:114` - `toHaveBeenCalledWith({ where: { id: "e2" }, data: { position: 1 } })`; `:115` - `{ where: { id: "e1" }, data: { position: 2 } }`; `:124` - `expect(prisma.occurrenceSong.update).not.toHaveBeenCalled()` | PASS |
| C20 | `removeFromSetlist` apaga por id | mesmo run; caso "removeFromSetlist apaga a entrada pelo id" passou | `tests/unit/repertoireSetlist.test.ts:132` - `expect(prisma.occurrenceSong.delete).toHaveBeenCalledWith({ where: { id: "e1" } })` | PASS |
| C21 | `getSetlist` ordena por `position` e `id` e devolve os campos da versão | mesmo run; caso "getSetlist devolve as entradas em ordem de posicao com os dados da versao" passou | `tests/unit/repertoireSetlist.test.ts:144` a `:148` - `expect.objectContaining({ where: { occurrenceId: "o1" }, orderBy: [{ position: "asc" }, { id: "asc" }] })`; `:150` - `expect(res.entries).toEqual([{ entryId: "e1", songId: "s1", title: "Bondade de Deus", ..., lyricsUrl, chordsUrl, audioUrl: null, videoUrl: null }])` | PASS |
| C22 | rascunho: não líder recebe `FORBIDDEN`, líder vê a lista | mesmo run; caso "rascunho: quem nao lidera recebe FORBIDDEN, quem lidera ve a lista" passou | `tests/unit/repertoireSetlist.test.ts:170` - `await expect(getSetlist("o1")).rejects.toThrow("FORBIDDEN")`; `:174` - `expect(res.entries).toHaveLength(1)`; `:175` - `expect(res.canManage).toBe(true)` | PASS |
| C23 | `FORBIDDEN` em adicionar, mover e remover, sem gravar | mesmo run; caso "FORBIDDEN nao grava ao adicionar, mover ou remover" passou | `tests/unit/repertoireSetlist.test.ts:189` a `:191` - `rejects.toThrow("FORBIDDEN")` nos três; `:193` a `:195` - `create`, `update`, `delete` com `not.toHaveBeenCalled()` | PASS |
| C24 | `listMonthOccurrences` e `getMySchedule` devolvem `repertoireEnabled` (e `occurrenceId`); três telas linkam `/repertorio/escala/` | mesmo run (casos "repertoireEnabled acompanha o flag do ministerio da data" e "repertoireEnabled e occurrenceId acompanham a data" passaram); `grep -q ... && grep -q ... && grep -q ... && npm run typecheck` exit 0 | `tests/unit/listMonthOccurrences.test.ts:49` - `expect(items.map((i) => [i.occurrenceId, i.repertoireEnabled])).toEqual([["o1", true], ["o2", false]])`; `tests/unit/getMySchedule.test.ts:45` - `expect(item.occurrenceId).toBe("o1")`; `:46` - `expect(item.repertoireEnabled).toBe(true)`; `app/(app)/escalas/OccurrenceRow.tsx:445`, `app/(app)/page.tsx:101`, `app/(app)/TodayCheckInCard.tsx:80` | PASS |
| C25 | `repertoireMinistries` filtra por `id in` e flag ligado; página inicial mostra "Repertório" | mesmo run (caso "repertoireMinistries filtra os informados pelo flag ligado" passou); `grep -q 'href="/repertorio"' ... && npm run typecheck` exit 0 | `tests/unit/updateMinistryModule.test.ts:41` - `expect.objectContaining({ where: { id: { in: ["m1", "m2"] }, repertoireEnabled: true } })`; `app/(app)/page.tsx:71` - `repertoire.length > 0 &&`; `app/(app)/page.tsx:73` - `href="/repertorio"` | PASS |

24 de 25 com resultado PASS. C3 tem a afirmação literal provada e é reprovado pela lacuna de
amostragem que deixou passar a violação da AC 3.

### Level and sampling judgment

- **C3 - lacuna de amostragem (bloqueante).** A AC 3 fala de "os serviços de `repertoire`"; o
  módulo exporta 12 (`listSongs`, `getSong`, `listVersionsForMinistry`, `createSong`, `updateSong`,
  `deleteSong`, `saveVersion`, `deleteVersion`, `getSetlist`, `addToSetlist`, `moveInSetlist`,
  `removeFromSetlist`; `listSongs` é coberto pelo C12). O C3 e a linha de `Coverage` "serviços sob
  módulo desligado (4)" provam 4. Dos 7 restantes, 5 têm a guarda no código sem teste
  (`src/modules/repertoire/services/songs.ts:80` via `ledSong`; `setlist.ts:59`) e 2 não têm guarda
  nenhuma (`setlist.ts:86`).
- **C17 / door 3 - nota de nível.** A linha de `Coverage` atribui o door 3 ao C17, mas o C17 simula
  o `P2002` por mock e não prova que o unique existe. Conferido por leitura: está em
  `prisma/schema.prisma:322` e em `migration.sql:57`. Não bloqueia; nenhuma prova quebraria se o
  `@@unique` fosse removido.
- **C24, C25, C15 - nível declarado.** A ligação com a tela é provada por grep + typecheck (o repo
  não tem teste de componente; o checks.md declara isso). O grep prova que a string existe, não a
  condição. Conferido por leitura: os três links são condicionais ao flag
  (`OccurrenceRow.tsx:443`, `page.tsx:99`, `TodayCheckInCard.tsx:78`).
- Nenhuma prova resolve só para teste que a feature não tocou: os 4 arquivos de teste novos e os
  casos novos em `listMonthOccurrences.test.ts` e `getMySchedule.test.ts` estão no diff.

## Swept existing

| Row | Cited constraint | In the code | Finding |
| --- | --- | --- | --- |
| failure modes | `handleActionError` devolve `code` + `ref` nas actions | sim - `src/lib/actionError.ts:60`; as 8 actions de `app/(app)/repertorio/actions.ts` (`:31`, `:42`, `:52`, `:74`, `:85`, `:95`, `:109`, `:119`) usam | - |
| failure modes | erro de leitura cai em `app/(app)/error.tsx` | parcial - o arquivo existe e vale para `/repertorio`; em `/repertorio/[id]` e `/repertorio/escala/[id]` todo erro que não é redirect vira `notFound()` sem log (`app/(app)/repertorio/[id]/page.tsx:15`, `app/(app)/repertorio/escala/[occurrenceId]/page.tsx:17`) | gap 2 |
| observability | `handleActionError` loga com escopo e `ref` | sim - `src/lib/actionError.ts:67` chama `logError(scope, e, ctx)`; `src/lib/logError.ts:14` | vale só para actions; os dois `catch` de página acima não logam |

Linhas `existing` do `Observable` do plano, conferidas: `app/(app)/loading.tsx` e
`app/(app)/error.tsx` existem; `useConfirm` com `tone: "danger"` em
`app/(app)/repertorio/[id]/SongDetail.tsx:102` e `:131`; `EmptyState` "Nenhuma música nesta escala"
em `app/(app)/repertorio/escala/[occurrenceId]/SetlistEditor.tsx:97`; "Nenhuma versão cadastrada"
em `SongDetail.tsx:268`.

## Adversarial read

**a. Autorização - sem buraco.**
- Leitura: `getSong` exige ministério da música em `visibleMinistryIds` (membership `ACTIVE` ou
  admin) - `songs.ts:44`; `getSetlist` idem para o ministério da data - `setlist.ts:20`. `listSongs`
  não checa, por convenção, e o único chamador passa `visibleMinistryIds` (`repertorio/page.tsx:16`).
- Escrita chamando a Server Action direto: toda action cai num serviço que chama `requireLeaderOf`
  sobre o ministério **derivado do registro**, não de um id vindo do cliente (`ledSong` em
  `songs.ts:77`, `ledEntry` em `setlist.ts:86`, `addToSetlist` em `setlist.ts:58`). Só
  `createSong` recebe `ministryId` do cliente e checa liderança sobre ele (`songs.ts:68`).
- Id de A para mexer em B: `saveVersion` com `versionId` de outra música bate em
  `where: { id, songId }` (`songs.ts:102`, asserção em `repertoireSongs.test.ts:102`) e falha com
  `P2025`; `deleteVersion` resolve a música da versão antes de autorizar (`songs.ts:108`);
  `moveInSetlist` e `removeFromSetlist` resolvem a data da entrada (`setlist.ts:87`);
  `addToSetlist` rejeita versão de outro ministério (`setlist.ts:65`). O `occurrenceId` e o
  `songId` que as actions recebem a mais só entram em `revalidatePath`.

**b. Flag do módulo - buraco real.** Ver gap 1. Demais caminhos conferem: `listSongs` filtra por
`repertoireMinistries`; `getSong`, `listVersionsForMinistry`, `createSong`, `ledSong`, `getSetlist`
e `addToSetlist` chamam `assertRepertoireEnabled`; os links da interface dependem do flag.

**c. Rascunho (AD-006) - sem buraco.** `getSetlist` rejeita rascunho para quem não gerencia
(`setlist.ts:25`) e a página responde `notFound()` igual a id inexistente. `getMySchedule` já filtra
`published: true` (`getMySchedule.ts:23`), então os links do cartão de hoje e de próxima escala não
apontam para rascunho; o calendário só entrega rascunho a quem gerencia (regra existente).
Escritas de setlist são só de líder.

**d. Links como `href` - sem buraco.** Criação e edição passam pelo mesmo
`parseOrInvalid(versionSchema, params)` antes do `if (params.versionId)` (`songs.ts:98`); o regex é
`/^https?:\/\/\S+$/i` sem flag `m` (`src/modules/repertoire/domain/validation.ts:26`), então
`javascript:`, `ftp:`, texto sem esquema e valor com quebra de linha são rejeitados. Nenhum outro
caminho grava os quatro campos (`createSong` cria a versão `Original` só com `name`).
`VersionMeta.tsx:40` renderiza `href={version[field]!}` com `rel="noopener noreferrer"`.

**e. Limites de módulo - desvio menor.** Ver gap 3. Fora isso `repertoire` só toca `song`,
`songVersion` e `occurrenceSong`; `Membership` e `Occurrence` vêm por `visibleMinistryIds`,
`isLeaderOf`/`requireLeaderOf` e `getOccurrenceAccess`; o flag vem por `ministries/services/modules.ts`.

**f. Convenções de UI - sem achado.** Busca por cores cruas do Tailwind e hex em
`app/(app)/repertorio` e nas linhas adicionadas das telas existentes: zero ocorrências; só tokens
(`text-text`, `text-text-muted`, `text-primary`, `text-danger`, `bg-surface-2`, `ring-border`,
`bg-primary/10`). Todos os textos visíveis e `aria-label` estão em pt-BR.

## Ranked gaps

1. **Escrita com o módulo desligado (AC 3, AD-007) - C3 -
   `src/modules/repertoire/services/setlist.ts:86`.** `ledEntry` faz `requireLeaderOf` e não chama
   `assertRepertoireEnabled`. Com `repertoireEnabled = false`, um líder (ou admin) que chame
   `moveInSetlistAction` ou `removeFromSetlistAction` com o id de uma entrada existente reordena ou
   **apaga** a entrada (`setlist.ts:94`, `setlist.ts:113`), contrariando "desligar preserva os dados
   e bloqueia o acesso". Nenhum teste cobre os dois sob módulo desligado. Correção esperada: guarda
   em `ledEntry` e teste que enumere todas as escritas sob `MODULE_DISABLED`.
2. **Erro de leitura engolido como 404, sem log - Swept "failure modes" -
   `app/(app)/repertorio/[id]/page.tsx:15` e `app/(app)/repertorio/escala/[occurrenceId]/page.tsx:17`.**
   O `catch` devolve `null` para qualquer erro que não seja redirect, então banco fora do ar ou bug
   no serviço aparece como "página não encontrada" e não chega a `error.tsx` nem ao `logError`. A
   linha do Swept afirma o contrário. Esconder a existência do registro só exige tratar `FORBIDDEN`,
   `MODULE_DISABLED` e `P2025`; o resto deveria ser relançado.
3. **`repertoire` lê `Ministry` direto (door 5) - sem check -
   `src/modules/repertoire/services/songs.ts:42`.** `getSong` faz
   `include: { ministry: { select: { name: true } } }`. O door 5 diz que `Ministry` só é lido por
   serviços de `ministries`. É só o nome para o cabeçalho, mas é o formato aprovado sendo desviado
   sem registro.

## Residual notes

Não bloqueiam; ficam registradas.

- **Posições empatadas não se movem.** O Swept tolera posições iguais após duas adições simultâneas
  (desempate por `id`). Nesse caso `moveInSetlist` troca dois valores iguais e devolve
  `moved: true` sem mudar a ordem (`setlist.ts:107`); o par fica preso até remover e adicionar de novo.
- **Ordem busca-antes-de-autorizar.** `ledSong` (`songs.ts:78`), `deleteVersion` (`songs.ts:108`),
  `ledEntry` (`setlist.ts:87`) e `addToSetlist` (`setlist.ts:57`) fazem `findUniqueOrThrow` antes de
  `requireLeaderOf`, então a action responde `FORBIDDEN` para id existente e `UNKNOWN` para
  inexistente. Só distingue existência para quem já tem o UUID; inclui data em rascunho.
- **Link "Músicas" para quem não é membro ativo.** `getMySchedule` marca `repertoireEnabled` pelo
  ministério da alocação, e `getSetlist` exige membership `ACTIVE`; um alocado cuja membership foi
  desativada vê o link e cai em 404.
- **`direction` sem validação em runtime.** `moveInSetlistAction` trata qualquer valor diferente de
  `"up"` como `"down"` (`setlist.ts:102`). Sem efeito de segurança.

## Gate

`npm run test` - 309 passed, 0 failed (54 arquivos); `npm run typecheck` exit 0; `npm run lint` exit 0 (sem avisos); `npx prisma validate` válido. Árvore de trabalho inalterada além deste relatório.
