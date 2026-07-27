# Escalar pessoa sem conta (guest) — design

## Contexto

Hoje `Allocation.userId` é obrigatório: só dá pra escalar quem já tem conta (login Supabase + `Membership` no ministério). Líderes querem escalar gente que ainda não usa o app (visitante, voluntário novo) e, quando essa pessoa criar conta, ligar as escalas antigas a ela. Também querem gerar um texto pronto pra colar no grupo do WhatsApp com quem serve em cada culto/evento — útil sobretudo pra guests, que não recebem push.

## Escopo

- Alocar guest (nome + CPF opcional) numa vaga vazia.
- Vincular manualmente um guest a um usuário real depois.
- Gerar texto (client-side, copiar pra área de transferência) com a escalação de uma ocorrência inteira.
- Fora de escopo: sugestão automática de link por CPF/nome, guest confirmar/recusar/check-in, guest aparecer em relatórios de carga (`candidateList`) ou receber notificação antes de ser linkado.

## Modelo de dados

`prisma/schema.prisma` — `Allocation`:

```prisma
model Allocation {
  id                     String           @id @default(uuid()) @db.Uuid
  slotId                 String           @unique @db.Uuid
  userId                 String?          @db.Uuid   // agora opcional
  guestName              String?                      // novo
  guestCpf               String?                      // novo — só dígitos
  source                 AllocationSource
  overrideUnavailability Boolean          @default(false)
  status                 AllocationStatus @default(PENDING)
  respondedAt            DateTime?
  checkedInAt            DateTime?
  createdAt              DateTime         @default(now())

  slot        Slot         @relation(fields: [slotId], references: [id], onDelete: Cascade)
  user        User?        @relation(fields: [userId], references: [id], onDelete: Cascade)
  swapRequest SwapRequest?
}
```

Invariante "exatamente um de `userId`/`guestName` preenchido" — validada na camada de serviço (único ponto de entrada) e reforçada por `CHECK` SQL adicionado à migration gerada:

```sql
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_user_xor_guest"
  CHECK ((("userId" IS NOT NULL) AND ("guestName" IS NULL))
      OR (("userId" IS NULL) AND ("guestName" IS NOT NULL)));
```

Nenhum campo novo em `User` — CPF é só anotação do guest pra o líder não confundir duas pessoas com nome parecido; não alimenta busca/match automático.

## Serviços (`src/modules/scheduling/services`)

### `allocateGuest` (novo, `allocateGuest.ts`)

```ts
export async function allocateGuest(params: { slotId: string; guestName: string; guestCpf?: string })
```

- `requireLeaderOf(slot.occurrence.schedule.ministryId)`.
- Sem `hasUnavailabilityConflict` (não há usuário).
- Cria `Allocation` com `userId: null`, `guestName`, `guestCpf: params.guestCpf ?? null`, `source: "LEADER"`, `status: "PENDING"`.
- P2002 (slot já ocupado) → `SlotTaken` (reusa a classe de `allocateVolunteer.ts`).
- Sem `notifyUser` (guest não tem push).

### `linkGuestAllocation` (novo, `linkGuestAllocation.ts`)

```ts
export async function linkGuestAllocation(params: { allocationId: string; userId: string; override?: boolean })
```

- Carrega a `Allocation` (`include: { slot: { include: { occurrence: { include: { schedule: true } }, role: true } } }`).
- `requireLeaderOf(ministryId)`.
- Se `allocation.userId != null` → lança `NotGuest` (allocation já é de usuário real).
- `hasUnavailabilityConflict(userId, occurrence.date)` — mesma regra de `reassignAllocation`: bloqueia salvo `override`.
- `update`: `userId`, `guestName: null`, `guestCpf: null` (mantém `status: "PENDING"`, `source` inalterado).
- `notifyUser` tipo `ASSIGNMENT` pro usuário linkado (mesmo padrão de `allocateVolunteer`).

Erros novos em `src/lib/actionError.ts`:

```ts
export type ActionCode =
  | "FORBIDDEN"
  | "SLOT_TAKEN"
  | "NOT_ELIGIBLE"
  | "NOT_OWNER"
  | "UNAVAILABILITY_BLOCKED"
  | "NO_ALLOCATION"
  | "ALREADY_REQUESTED"
  | "ALREADY_REVIEWED"
  | "NOT_GUEST"        // novo
  | "UNKNOWN";
```

```ts
NOT_GUEST: "Essa vaga já está com um usuário cadastrado.",
```

## Leitura (`listMonthOccurrences.ts`)

`MonthOccurrenceItem.slots[]` ganha os campos do guest:

```ts
slots: {
  slotId: string;
  role: string;
  allocatedUserId: string | null;
  allocatedName: string | null;   // já existia — agora vem de user?.name ?? guestName
  allocationId: string | null;
  allocatedStatus: AllocationStatus | null;
  checkedIn: boolean;
  isGuest: boolean;                // novo: allocatedUserId === null && allocatedName !== null
}[]
```

Mapeamento:

```ts
allocatedUserId: s.allocation?.userId ?? null,
allocatedName: s.allocation?.user?.name ?? s.allocation?.guestName ?? null,
isGuest: !!s.allocation && s.allocation.userId === null,
```

`include` do Prisma passa a ser `allocation: { include: { user: true } }` (já é — `user` vira opcional no retorno, `guestName` vem direto do allocation).

## Actions (`app/(app)/escalas/actions.ts`)

```ts
export async function allocateGuestAction(
  slotId: string,
  guestName: string,
  guestCpf?: string,
): Promise<{ ok: true; allocation: { id: string; status: AllocationStatus } } | { ok: false; code: ActionCode; ref: string }>
```

```ts
export async function linkGuestAction(
  allocationId: string,
  userId: string,
  override = false,
): Promise<{ ok: true; allocation: { id: string; status: AllocationStatus } } | { ok: false; code: ActionCode; ref: string }>
```

Ambas seguem o padrão de `allocateAction`/`reassignAllocationAction`: `revalidatePath("/escalas")`, `handleActionError`.

## UI

### `AllocatePicker.tsx`

Item fixo no fim da lista de candidatos: `+ Pessoa sem conta`. Ao clicar, abre formulário inline (substitui a lista) com campo nome (obrigatório) e CPF (opcional, `inputMode="numeric"`, sem máscara — grava dígitos crus), botão "Adicionar". Novo prop:

```ts
onPickGuest: (name: string, cpf?: string) => void;
```

### `OccurrenceRow.tsx`

- `Slot` (`occurrenceCache.ts`) ganha `isGuest: boolean`.
- Quando `s.allocatedName && s.isGuest`: badge `tone="info"` com texto `sem conta` no lugar do badge `aguardando confirmação`.
- Botão `vincular` ao lado de `trocar`, visível só quando `props.canManage && s.isGuest`: abre o mesmo `AllocatePicker` (candidatos reais do ministério, já carregados) em modo "link" → `linkGuestAction(s.allocationId, userId)`.
- Botão `Copiar p/ WhatsApp` no cabeçalho do card (ao lado de editar/excluir, só `canManage`), monta texto client-side:

```ts
function buildWhatsAppText(title: string, when: string, slots: Slot[]): string {
  const linhas = slots.map((s) => `- ${s.role}: ${s.allocatedName ?? "— vaga aberta"}`);
  return `*${title}*\n${when}\n\n${linhas.join("\n")}`;
}
```

`navigator.clipboard.writeText(texto)`, mostra nota transitória "Copiado!" (mesmo padrão de `note` já usado no componente).

## Testes (`tests/unit/`)

- `allocateGuestOutcome.test.ts`: função pura que decide `OK`/`SLOT_TAKEN` pra `allocateGuest` (mesmo formato de `decideAllocate` em `allocateOutcome.test.ts`, sem checagem de indisponibilidade).
- `linkGuestAllocation.test.ts`: função pura `decideLinkGuest({ hasUserId, hasConflict, override })` → `"OK" | "NOT_GUEST" | "UNAVAILABILITY_BLOCKED"`.
- `patchOccurrenceSlot.test.ts` (existente): caso novo cobrindo patch com `isGuest`.

## Fora de escopo (confirmado com o usuário)

- Sugestão automática de link por CPF ou nome parecido.
- Guest aparecer em `candidateList`/relatórios de carga.
- Notificação pro guest antes de virar usuário linkado.
