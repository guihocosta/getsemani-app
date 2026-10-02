# Repertório e músicas na escala - checks

Profile: light
Plan: `.specs/features/repertorio/plan.md`

## Intent

25 checks in 5 slices · 6 one-way doors · 1 open, of which 0 block the build (1 blocks go-live)

## Checks

### S1 - Módulo ligado por ministério · 5 files · 10 KB · ~3k

**C1** - [x] O schema declara `repertoireEnabled Boolean @default(false)` em `Ministry` e a migração contém `ADD COLUMN "repertoireEnabled" BOOLEAN NOT NULL DEFAULT false` (AC 1, door 1)
Proof: `grep -Eq "repertoireEnabled +Boolean +@default\(false\)" prisma/schema.prisma && grep -rq 'ADD COLUMN "repertoireEnabled" BOOLEAN NOT NULL DEFAULT false' prisma/migrations`

**C2** - [x] `updateMinistry({ ministryId, repertoireEnabled: true })` chama `ministry.update` com `data` contendo `repertoireEnabled: true`; sem o campo, `data` não o contém (AC 2)
Proof: `npm run test -- tests/unit/updateMinistryModule.test.ts -t "repertoireEnabled"`

**C3** - [x] Com o módulo desligado, `createSong`, `listVersionsForMinistry`, `getSong` e `getSetlist` rejeitam com `MODULE_DISABLED`, e `createSong` não chama `song.create` (AC 3)
Proof: `npm run test -- tests/unit/repertoireSongs.test.ts -t "modulo desligado"`
Proof: `npm run test -- tests/unit/repertoireSetlist.test.ts -t "modulo desligado"`

### S2 - Líder cadastra músicas e versões · 6 files · 22 KB · ~6k

**C4** - [x] `createSong` com `title: "  Bondade de Deus  "`, `artist: ""` chama `song.create` com `title: "Bondade de Deus"`, `artist: null`, `category: null`, `notes: null`, `ministryId` e `versions: { create: { name: "Original" } }` (AC 4)
Proof: `npm run test -- tests/unit/repertoireSongs.test.ts -t "createSong grava"`

**C5** - [x] `songSchema` rejeita título vazio, título com 121, artista com 121, classificação com 41 e observações com 501 caracteres, e aceita os limites 120/120/40/500 (AC 5)
Proof: `npm run test -- tests/unit/repertoireValidation.test.ts -t "songSchema"`

**C6** - [x] `saveVersion` sem `versionId` chama `songVersion.create` e com `versionId` chama `songVersion.update`, ambos com `name`, `key`, `bpm`, `durationSec`, `notes`, `lyricsUrl`, `chordsUrl`, `audioUrl`, `videoUrl` (AC 6)
Proof: `npm run test -- tests/unit/repertoireSongs.test.ts -t "saveVersion"`

**C7** - [x] `versionSchema` rejeita nome vazio, nome com 41, tom com 11, BPM 19, 401 e 68.5, duração 0 e 7201; aceita BPM 20 e 400, duração 1 e 7200 (AC 7)
Proof: `npm run test -- tests/unit/repertoireValidation.test.ts -t "versionSchema limites"`

**C8** - [x] `versionSchema` rejeita `javascript:alert(1)`, `ftp://x.com/a` e `cifraclub.com/x` em qualquer dos quatro links e aceita `https://` e `http://` (AC 8)
Proof: `npm run test -- tests/unit/repertoireValidation.test.ts -t "links so http"`

**C9** - [x] `parseDuration("3:45") = 225`, `("45") = 45`, `("") = null`; `("3:75")` e `("abc")` lançam `INVALID_INPUT`; `formatDuration(225) = "3:45"`, `formatDuration(65) = "1:05"` (AC 9)
Proof: `npm run test -- tests/unit/repertoireValidation.test.ts -t "duracao"`

**C10** - [x] Com `requireLeaderOf` lançando `FORBIDDEN`, `createSong`, `updateSong`, `deleteSong`, `saveVersion` e `deleteVersion` rejeitam com `FORBIDDEN` e nenhum `create`/`update`/`delete` é chamado (AC 10)
Proof: `npm run test -- tests/unit/repertoireSongs.test.ts -t "FORBIDDEN nao grava"`

**C11** - [x] `deleteSong` chama `song.delete` com `where: { id }`, e o schema declara `onDelete: Cascade` em `SongVersion.song`, `OccurrenceSong.version` e `OccurrenceSong.occurrence` (AC 11, door 2)
Proof: `npm run test -- tests/unit/repertoireSongs.test.ts -t "deleteSong"`
Proof: `test "$(grep -A14 -E "^model (SongVersion|OccurrenceSong) " prisma/schema.prisma | grep -c "onDelete: Cascade")" -eq 3`

### S3 - Membro consulta o repertório · 5 files · 16 KB · ~4k

**C12** - [x] `listSongs(["m1","m2"])` com só `m1` ligado consulta `song.findMany` com `ministryId: { in: ["m1"] }` e `orderBy: { title: "asc" }`, e cada item traz `artist`, `category` e `versionCount` (AC 12)
Proof: `npm run test -- tests/unit/repertoireSongs.test.ts -t "listSongs"`

**C13** - [x] `getSong` de música do ministério `m1` por usuário cujos ministérios visíveis são `["m2"]` rejeita com `FORBIDDEN` (AC 13)
Proof: `npm run test -- tests/unit/repertoireSongs.test.ts -t "getSong nao membro"`

**C14** - [x] `filterSongs` com `q: "ceu"` acha "Céu Aberto" e artista "CÉU"; com `category: "Ceia"` devolve só as de classificação `Ceia`; com os dois, a interseção (AC 14)
Proof: `npm run test -- tests/unit/repertoireValidation.test.ts -t "filterSongs"`

**C15** - [x] `repertoireEmptyMessage` devolve "Repertório não está ativo nos seus ministérios" com 0 ministérios ligados, "Nenhuma música cadastrada" com ministério ligado e 0 músicas, e `null` havendo músicas; `/repertorio` usa essa função (AC 15)
Proof: `npm run test -- tests/unit/repertoireValidation.test.ts -t "repertoireEmptyMessage"`
Proof: `grep -q "repertoireEmptyMessage(" "app/(app)/repertorio/page.tsx" && npm run typecheck`

### S4 - Músicas na escala · 5 files · 18 KB · ~5k

**C16** - [x] `addToSetlist` com maior posição existente 2 chama `occurrenceSong.create` com `position: 3`; sem entradas, `position: 1` (AC 16)
Proof: `npm run test -- tests/unit/repertoireSetlist.test.ts -t "posicao"`

**C17** - [x] Se `occurrenceSong.create` falha com `P2002`, `addToSetlist` rejeita com `ALREADY_IN_SETLIST` (AC 17)
Proof: `npm run test -- tests/unit/repertoireSetlist.test.ts -t "ALREADY_IN_SETLIST"`

**C18** - [x] `addToSetlist` com versão de música do ministério `m2` numa data do ministério `m1` rejeita com `INVALID_INPUT` sem chamar `occurrenceSong.create` (AC 18)
Proof: `npm run test -- tests/unit/repertoireSetlist.test.ts -t "outro ministerio"`

**C19** - [x] `moveInSetlist` da 2ª de três entradas para cima troca as posições 1 e 2 (dois `update`); mover a 1ª para cima e a última para baixo não chama `update` (AC 19)
Proof: `npm run test -- tests/unit/repertoireSetlist.test.ts -t "moveInSetlist"`

**C20** - [x] `removeFromSetlist` chama `occurrenceSong.delete` com `where: { id }` (AC 20)
Proof: `npm run test -- tests/unit/repertoireSetlist.test.ts -t "removeFromSetlist"`

**C21** - [x] `getSetlist` consulta com `orderBy: [{ position: "asc" }, { id: "asc" }]` e devolve por entrada `title`, `versionName`, `key`, `bpm`, `durationSec` e os quatro links (AC 21)
Proof: `npm run test -- tests/unit/repertoireSetlist.test.ts -t "getSetlist devolve"`

**C22** - [x] `getSetlist` de data com `published: false` por quem não lidera rejeita com `FORBIDDEN`; por quem lidera, devolve a lista (AC 22)
Proof: `npm run test -- tests/unit/repertoireSetlist.test.ts -t "rascunho"`

**C23** - [x] Com `requireLeaderOf` lançando `FORBIDDEN`, `addToSetlist`, `moveInSetlist` e `removeFromSetlist` rejeitam com `FORBIDDEN` e nenhum `create`/`update`/`delete` é chamado (AC 23)
Proof: `npm run test -- tests/unit/repertoireSetlist.test.ts -t "FORBIDDEN nao grava"`

### S5 - Entradas na interface · 8 files · 40 KB · ~10k

**C24** - [x] `listMonthOccurrences` e `getMySchedule` devolvem `repertoireEnabled` igual ao flag do ministério da data (e `getMySchedule` devolve `occurrenceId`); `OccurrenceRow`, `app/(app)/page.tsx` e `TodayCheckInCard` linkam para `/repertorio/escala/` (AC 24)
Proof: `npm run test -- tests/unit/listMonthOccurrences.test.ts -t "repertoireEnabled"`
Proof: `npm run test -- tests/unit/getMySchedule.test.ts -t "repertoireEnabled"`
Proof: `grep -q "/repertorio/escala/" "app/(app)/escalas/OccurrenceRow.tsx" && grep -q "/repertorio/escala/" "app/(app)/page.tsx" && grep -q "/repertorio/escala/" "app/(app)/TodayCheckInCard.tsx" && npm run typecheck`

**C25** - [x] `repertoireMinistries(["m1","m2"])` consulta `ministry.findMany` com `id: { in: [...] }` e `repertoireEnabled: true`, e a página inicial mostra a entrada "Repertório" para `/repertorio` quando a lista não é vazia (AC 25)
Proof: `npm run test -- tests/unit/updateMinistryModule.test.ts -t "repertoireMinistries"`
Proof: `grep -q 'href="/repertorio"' "app/(app)/page.tsx" && npm run typecheck`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| escritas de música/versão sob `FORBIDDEN` (5) | `createSong` C10 · `updateSong` C10 · `deleteSong` C10 · `saveVersion` C10 · `deleteVersion` C10 | - |
| escritas de setlist sob `FORBIDDEN` (3) | `addToSetlist` C23 · `moveInSetlist` C23 · `removeFromSetlist` C23 | - |
| serviços sob módulo desligado (4) | `createSong` C3 · `listVersionsForMinistry` C3 · `getSong` C3 · `getSetlist` C3 | - |
| bordas de `songSchema` (9) | título vazio C5 · título 120 C5 · título 121 C5 · artista 120 C5 · artista 121 C5 · classificação 40 C5 · classificação 41 C5 · observações 500 C5 · observações 501 C5 | - |
| bordas de `versionSchema` (11) | nome vazio C7 · nome 41 C7 · tom 11 C7 · BPM 19 C7 · BPM 20 C7 · BPM 400 C7 · BPM 401 C7 · BPM não inteiro C7 · duração 0 C7 · duração 1 e 7200 C7 · duração 7201 C7 | - |
| esquemas de link (5) | `https` C8 · `http` C8 · `javascript:` C8 · `ftp` C8 · sem esquema C8 | - |
| campos de link (4) | `lyricsUrl` C8 · `chordsUrl` C8 · `audioUrl` C8 · `videoUrl` C8 | - |
| duração digitada (5) | `m:ss` C9 · só segundos C9 · vazio C9 · segundos ≥ 60 C9 · não numérico C9 | - |
| estados vazios de `/repertorio` (3) | sem módulo C15 · sem músicas C15 · com músicas C15 | - |
| movimento na lista (3) | meio para cima C19 · primeira para cima C19 · última para baixo C19 | - |
| leitura da lista por estado da data (3) | publicada C21 · rascunho não gerente C22 · rascunho gerente C22 | - |
| pontos de entrada do link "Músicas" (3) | `OccurrenceRow` C24 · página inicial C24 · `TodayCheckInCard` C24 | - |
| doors do schema (4) | door 1 C1 · door 2 C11 · door 3 C17 · door 4/6 C4, C6 | - |

- C15, C24 e C25 têm prova grep + typecheck para a ligação com a tela; o repo não tem teste de componente
- C1 e C11 provam o schema por grep: a migração não é aplicada nesta feature
- Nenhum outro check afirma mais do que o caso que sua prova exercita

## Swept

- validation: C5, C7, C8, C9
- failure modes: existing - `handleActionError` devolve `code` + `ref` nas actions; erro de leitura cai em `app/(app)/error.tsx`
- idempotency: C17 - repetir o mesmo "adicionar" esbarra no unique e vira `ALREADY_IN_SETLIST`
- authorization: C10, C13, C22, C23
- concurrency: C17 - duas adições simultâneas da mesma versão: o unique do banco decide; posições iguais em adições simultâneas de versões diferentes são toleradas pelo desempate por `id` (C21)
- data lifecycle: C11 - apagar música leva versões e entradas de escala em cascata; módulo desligado preserva os dados (C3 só bloqueia acesso)
- dependency failure: n/a - sem dependência externa; links são só texto guardado
- state transitions: C2 (módulo liga/desliga), C19 (ordem)
- observability: existing - `handleActionError` loga com escopo e `ref`

## Handoff

- S1 ~3k + S2 ~6k + S3 ~4k + S4 ~5k + S5 ~10k = ~28k de arquivos existentes tocados, mais ~12k de arquivos novos (telas e serviços) = ~40k, abaixo do budget de 150k - one builder
