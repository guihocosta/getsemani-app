# Rascunho e publicação de escala - checks

Profile: light
Plan: `.specs/features/rascunho-publicar/plan.md`

## Intent

19 checks in 5 slices · 1 one-way door · 1 open, of which 0 block the build (1 blocks go-live)

## Checks

### S1 - Líder alterna rascunho e publicada · 4 files · 22 KB · ~6k

**C1** - [x] `setOccurrencePublished({ occurrenceId, published: false })` chama `occurrence.update` com `data: { published: false }` e não chama `notifyUser` (AC 1)
Proof: `npm run test -- tests/unit/publishOccurrence.test.ts -t "tornar rascunho nao notifica"`

**C2** - [x] `setOccurrencePublished({ published: true })` com duas alocações com conta chama `occurrence.update` com `data: { published: true }` e `notifyUser` 2 vezes, com `type: "ASSIGNMENT"` e `dedupeKey: "assign:al1"` / `"assign:al2"` (AC 2)
Proof: `npm run test -- tests/unit/publishOccurrence.test.ts -t "publicar notifica cada alocado"`

**C3** - [x] Ao publicar, alocação de convidado (`userId: null`) não gera chamada a `notifyUser` (AC 3)
Proof: `npm run test -- tests/unit/publishOccurrence.test.ts -t "convidado nao e notificado"`

**C4** - [x] Se `requireLeaderOf` lança `FORBIDDEN`, `setOccurrencePublished` rejeita com `FORBIDDEN` e não chama `occurrence.update` (AC 4)
Proof: `npm run test -- tests/unit/publishOccurrence.test.ts -t "FORBIDDEN nao grava"`

**C5** - [x] O schema declara `published Boolean @default(true)` em `Occurrence` e a migração contém `ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true` (AC 5, door 1)
Proof: `grep -Eq "published +Boolean +@default\(true\)" prisma/schema.prisma && grep -rq 'ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true' prisma/migrations`

### S2 - Rascunho não notifica · 6 files · 30 KB · ~8k

**C6** - [x] `notifyIfPublished(false, params)` devolve `"skipped"` sem chamar `notifyUser`; `notifyIfPublished(true, params)` chama `notifyUser` com os mesmos `params` (AC 6)
Proof: `npm run test -- tests/unit/notifyIfPublished.test.ts -t "notifyIfPublished"`

**C7** - [x] `allocateVolunteer` numa ocorrência com `published: false` cria a alocação com `status: "PENDING"` e não chama `notifyUser`; com `published: true`, chama com `dedupeKey: "assign:al1"` (AC 7)
Proof: `npm run test -- tests/unit/allocateDraft.test.ts -t "allocateVolunteer"`

**C8** - [x] Nenhum dos cinco serviços (`allocateVolunteer.ts`, `allocateGuest.ts`, `linkGuestAllocation.ts`, `repeatSchedule.ts`, `setSlotActive.ts`) chama `notifyUser(` direto (AC 8)
Proof: `! grep -l "notifyUser(" src/modules/scheduling/services/allocateVolunteer.ts src/modules/scheduling/services/allocateGuest.ts src/modules/scheduling/services/linkGuestAllocation.ts src/modules/scheduling/services/repeatSchedule.ts src/modules/scheduling/services/setSlotActive.ts`

### S3 - Rascunho invisível para quem não gerencia · 7 files · 26 KB · ~7k

**C9** - [x] `listMonthOccurrences(["m1","m2"], 2026, 10, ["m1"])` consulta com `OR: [{ published: true }, { schedule: { ministryId: { in: ["m1"] } } }]` e cada item devolvido carrega `published` (AC 9)
Proof: `npm run test -- tests/unit/listMonthOccurrences.test.ts -t "rascunho so para gerenciaveis"`

**C10** - [x] `getMySchedule` consulta com `occurrence: { status: "ACTIVE", published: true, date: { gte: from } }` (AC 10)
Proof: `npm run test -- tests/unit/getMySchedule.test.ts -t "so ocorrencia publicada"`

**C11** - [x] As duas consultas de `/vagas` (vagas livres e trocas abertas) filtram `published: true` (AC 11)
Proof: `test "$(grep -c "published: true" "app/(app)/vagas/page.tsx")" -eq 2`

**C12** - [x] `selfAllocate` em vaga de ocorrência com `published: false` rejeita com `NOT_PUBLISHED` sem chamar `allocation.create`; `toActionCode` devolve `"NOT_PUBLISHED"` e `MENSAGENS.NOT_PUBLISHED` é "Essa escala ainda não foi publicada." (AC 12)
Proof: `npm run test -- tests/unit/allocateDraft.test.ts -t "selfAllocate"`
Proof: `npm run test -- tests/unit/actionError.test.ts -t "NOT_PUBLISHED"`

**C13** - [x] `attendanceRows` consulta com `published: true` na ocorrência, e o cron `reminders` filtra `published: true` (AC 13)
Proof: `npm run test -- tests/unit/attendanceReport.test.ts -t "attendanceRows"`
Proof: `grep -q "published: true" app/api/cron/reminders/route.ts`

### S4 - Líder enxerga o estado · 4 files · 26 KB · ~7k

**C14** - [x] `publishMenuItem(false)` devolve rótulo `"Publicar"` e alvo `true`; `publishMenuItem(true)` devolve `"Tornar rascunho"` e alvo `false`; `OccurrenceRow` renderiza o selo "rascunho" e usa `publishMenuItem` (AC 14)
Proof: `npm run test -- tests/unit/publishMenuItem.test.ts -t "publishMenuItem"`
Proof: `grep -q "rascunho" "app/(app)/escalas/OccurrenceRow.tsx" && grep -q "publishMenuItem(" "app/(app)/escalas/OccurrenceRow.tsx" && npm run typecheck`

**C15** - [x] `publishMenuItem(true).confirm` é "Voluntários deixam de ver esta data até você publicar de novo." e `publishMenuItem(false).confirm` é `null` (AC 15)
Proof: `npm run test -- tests/unit/publishMenuItem.test.ts -t "confirmacao so ao tornar rascunho"`

### S5 - Ações por id não furam o rascunho · 6 files · 24 KB · ~6k

**C16** - [x] `requestSwap` de alocação em ocorrência com `published: false` rejeita com `NOT_PUBLISHED`, sem `swapRequest.create` e sem `notifyUser` (AC 16)
Proof: `npm run test -- tests/unit/draftGuards.test.ts -t "requestSwap em rascunho"`

**C17** - [x] `claimSwap` de pedido `OPEN` em ocorrência com `published: false` rejeita com `NOT_PUBLISHED`, sem `allocation.update`, sem `swapRequest.update` e sem `notifyUser` (AC 17)
Proof: `npm run test -- tests/unit/draftGuards.test.ts -t "claimSwap em rascunho"`

**C18** - [x] `confirmAllocation`, `declineAllocation` e `checkInAllocation` em ocorrência com `published: false` rejeitam com `NOT_PUBLISHED` sem `allocation.update` / `allocation.delete` (AC 18)
Proof: `npm run test -- tests/unit/draftGuards.test.ts -t "resposta em rascunho"`

**C19** - [x] `notifyRemoval(false, { status: "PENDING" })` sem aviso `assign:al1` enviado devolve `"skipped"`; com aviso enviado, ou com `status: "CONFIRMED"`, ou com `published: true`, chama `notifyUser`; e os três pontos de remoção usam `notifyRemoval` (AC 19)
Proof: `npm run test -- tests/unit/draftGuards.test.ts -t "notifyRemoval"`
Proof: `test "$(cat src/modules/scheduling/services/allocateVolunteer.ts src/modules/scheduling/services/allocateGuest.ts src/modules/scheduling/services/setSlotActive.ts | grep -c "notifyRemoval(")" -eq 3`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| direção da alternância (2) | para rascunho C1 · para publicada C2 | - |
| alocação na publicação (2) | com conta C2 · convidado C3 | - |
| serviços que notificam em `scheduling` (8) | `allocateVolunteer.ts` C7, C8 · `allocateGuest.ts` C8 · `linkGuestAllocation.ts` C8 · `repeatSchedule.ts` C8 · `setSlotActive.ts` C8 · `publishOccurrence.ts` C2 · `swap.ts` C16, C17 (barrado antes de notificar) · `respondAllocation.ts` C18 (barrado antes de notificar) | - |
| serviços que aceitam id de vaga/alocação/troca vindos do voluntário (7) | `selfAllocate` C12 · `requestSwap` C16 · `claimSwap` C17 · `confirmAllocation` C18 · `declineAllocation` C18 · `checkInAllocation` C18 · `cancelSwap` fora de escopo no plano (só fecha o próprio pedido) | - |
| decisão do aviso de remoção (4) | rascunho + nunca soube C19 · rascunho + já avisado C19 · rascunho + confirmado C19 · publicada C19 | - |
| leituras que escondem rascunho (6) | `listMonthOccurrences` C9 · `getMySchedule` C10 · `/vagas` livres C11 · `/vagas` trocas C11 · cron `reminders` C13 · `attendanceRows` C13 | - |
| estado do helper (2) | rascunho C6 · publicada C6 | - |
| item do menu (2) | publicada C14, C15 · rascunho C14, C15 | - |
| door 1 (2 lugares) | schema C5 · migração C5 | - |

- C8, C11 e a 2ª prova de C13/C14 são grep: a consulta mora inline em página/rota sem teste de unidade no repo; C7 prova o comportamento em um dos cinco serviços no próprio nível
- Nenhum outro check afirma mais do que o caso que sua prova exercita

## Swept

- validation: n/a - a única entrada é um booleano vindo de botão; id inexistente cai em `findUniqueOrThrow`
- failure modes: existing - `notifyUser` nunca lança (`notify.ts`), então falha de push não desfaz a publicação
- idempotency: C2 - republicar reusa `dedupeKey` `assign:<allocationId>`; existing - `notifyUser` devolve `"duplicate"` se já enviado
- authorization: C4, C9, C16, C17, C18
- concurrency: n/a - alternância é um `update` de uma coluna; último a gravar vence, sem invariante entre linhas
- data lifecycle: C5 - default `true` mantém as ocorrências existentes publicadas
- dependency failure: existing - falha de push é logada e engolida em `notifyUser`
- state transitions: C1, C2, C19
- observability: existing - `handleActionError` loga com `ref` nas actions de `escalas`

## Handoff

- **Rodada 1 do Verifier: FAIL** - C1-C15 verdes, mas troca/confirmação/check-in por id ignoravam o rascunho e o aviso de remoção se perdia. Corrigido em S5 (C16-C19).

- S1 ~6k + S2 ~8k + S3 ~7k + S4 ~7k = ~28k (wc -c / 4 dos arquivos tocados), abaixo do budget de 150k - one builder
