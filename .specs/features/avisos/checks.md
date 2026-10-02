# Avisos do ministério - checks

Profile: light
Plan: `.specs/features/avisos/plan.md`

## Intent

10 checks in 2 slices · 3 one-way doors · 1 open, of which 0 block the build (1 blocks go-live)

## Checks

### S1 - Líder publica e gerencia avisos · 6 files · 14 KB · ~4k

**C1** - [x] `createAnnouncement` com título `"  Ensaio  "` e texto `" Quinta 20h "` chama `announcement.create` com `ministryId`, `authorId` do usuário da sessão, `title: "Ensaio"`, `body: "Quinta 20h"` e `pinned` informado (AC 1)
Proof: `npm run test -- tests/unit/announcements.test.ts -t "createAnnouncement grava"`

**C2** - [x] `announcementSchema` rejeita título vazio, título com 81, texto vazio e texto com 1001 caracteres, aceita 80 e 1000; e `createAnnouncement` com título vazio rejeita com `INVALID_INPUT` sem `announcement.create` (AC 2)
Proof: `npm run test -- tests/unit/announcements.test.ts -t "announcementSchema"`
Proof: `npm run test -- tests/unit/announcements.test.ts -t "INVALID_INPUT nao grava"`

**C3** - [x] Com `requireLeaderOf` lançando `FORBIDDEN`, `createAnnouncement`, `setAnnouncementPinned` e `deleteAnnouncement` rejeitam com `FORBIDDEN` e nenhum `create`/`update`/`delete` nem `notifyUser` é chamado (AC 3)
Proof: `npm run test -- tests/unit/announcements.test.ts -t "FORBIDDEN nao grava"`

**C4** - [x] Com membros ativos `u1` (autor), `u2` e `u3`, `createAnnouncement` chama `notifyUser` 2 vezes, para `u2` e `u3`, com `type: "ANNOUNCEMENT"`, `dedupeKey: "announcement:an1:u2"` / `"announcement:an1:u3"`, `title` do aviso e `url: "/avisos"`; e o schema declara `ANNOUNCEMENT` em `NotificationType` com a migração `ADD VALUE 'ANNOUNCEMENT'` (AC 4, door 2)
Proof: `npm run test -- tests/unit/announcements.test.ts -t "notifica membros menos o autor"`
Proof: `grep -A6 "^enum NotificationType" prisma/schema.prisma | grep -q "ANNOUNCEMENT" && grep -rq "ADD VALUE 'ANNOUNCEMENT'" prisma/migrations`

**C5** - [x] `setAnnouncementPinned({ announcementId, pinned: true })` chama `announcement.update` com `where: { id }` e `data: { pinned: true }` (AC 5)
Proof: `npm run test -- tests/unit/announcements.test.ts -t "setAnnouncementPinned"`

**C6** - [x] `deleteAnnouncement` chama `announcement.delete` com `where: { id }`, e o schema declara `onDelete: Cascade` nas duas relações de `Announcement` (AC 6, door 1)
Proof: `npm run test -- tests/unit/announcements.test.ts -t "deleteAnnouncement"`
Proof: `test "$(grep -A12 "^model Announcement " prisma/schema.prisma | grep -c "onDelete: Cascade")" -eq 2`

### S2 - Membro lê os avisos · 5 files · 14 KB · ~4k

**C7** - [x] `listAnnouncements(["m1"])` consulta `announcement.findMany` com `where: { ministryId: { in: ["m1"] } }`, `orderBy: [{ pinned: "desc" }, { createdAt: "desc" }]`, `take: 50`, e cada item traz `ministry` e `author` (nomes) (AC 7)
Proof: `npm run test -- tests/unit/announcements.test.ts -t "listAnnouncements"`

**C8** - [x] `listPinnedAnnouncements(["m1"])` consulta com `where: { ministryId: { in: ["m1"] }, pinned: true }`, `orderBy: { createdAt: "desc" }` e `take: 3`; com lista de ministérios vazia não consulta e devolve `[]` (AC 8)
Proof: `npm run test -- tests/unit/announcements.test.ts -t "listPinnedAnnouncements"`

**C9** - [x] `/avisos` mostra "Nenhum aviso por aqui" quando a lista é vazia (AC 9)
Proof: `grep -q "Nenhum aviso por aqui" "app/(app)/avisos/page.tsx" && npm run typecheck`

**C10** - [x] A página inicial tem a entrada `href="/avisos"` e o bloco "Avisos em destaque" alimentado por `listPinnedAnnouncements` (AC 10)
Proof: `grep -q 'href="/avisos"' "app/(app)/page.tsx" && grep -q "Avisos em destaque" "app/(app)/page.tsx" && grep -q "listPinnedAnnouncements(" "app/(app)/page.tsx" && npm run typecheck`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| escritas sob `FORBIDDEN` (3) | `createAnnouncement` C3 · `setAnnouncementPinned` C3 · `deleteAnnouncement` C3 | - |
| bordas de `announcementSchema` (6) | título vazio C2 · título 80 C2 · título 81 C2 · texto vazio C2 · texto 1000 C2 · texto 1001 C2 | - |
| destinatários do push (3) | autor fica de fora C4 · membro `u2` C4 · membro `u3` C4 | - |
| leituras (2) | lista completa C7 · destaques da página inicial C8 | - |
| doors do schema (2) | door 1 C6 · door 2 C4 | - |

- C9 e C10 têm prova grep + typecheck para a ligação com a tela; o repo não tem teste de componente
- C4 e C6 provam schema e migração por grep: a migração não é aplicada nesta feature (AD-008)
- Nenhum outro check afirma mais do que o caso que sua prova exercita

## Swept

- validation: C2
- failure modes: existing - `notifyUser` nunca lança (`notify.ts`): falha de push não desfaz o aviso gravado
- idempotency: C4 - `dedupeKey` `announcement:<id>:<userId>`; existing - `notifyUser` devolve `"duplicate"` se já enviado
- authorization: C3, C7
- concurrency: n/a - cada escrita é uma linha independente; último destaque gravado vence
- data lifecycle: C6 (cascata), C7 (lista limitada a 50)
- dependency failure: existing - falha de push é logada e engolida em `notifyUser`
- state transitions: C5
- observability: existing - `handleActionError` loga com escopo e `ref`

## Handoff

- S1 ~4k + S2 ~4k = ~8k de arquivos existentes tocados, mais ~5k de arquivos novos = ~13k, abaixo do budget de 150k - one builder
