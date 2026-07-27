# Escalar Pessoa Sem Conta (Guest) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que um líder escale alguém sem conta (nome + CPF opcional) numa vaga, vincule manualmente essa pessoa a um usuário real depois que ela se cadastrar, e gere um texto pronto pra colar no grupo do WhatsApp com a escalação de uma ocorrência.

**Architecture:** `Allocation.userId` vira opcional; guest ocupa a mesma linha com `guestName`/`guestCpf` no lugar de `userId`. Dois serviços novos (`allocateGuest`, `linkGuestAllocation`) espelham `allocateVolunteer`/`reassignAllocation` já existentes. UI: `AllocatePicker` ganha opção "pessoa sem conta"; `OccurrenceRow` ganha badge/botão de vínculo e botão de copiar texto (100% client-side, sem novo endpoint).

**Tech Stack:** Next.js 15 App Router, Prisma (Postgres), Vitest, TypeScript strict.

## Global Constraints

- Toda interface em pt-BR (labels, mensagens, badges).
- Erros de domínio = `Error` com mensagem-código maiúscula; tradução pt-BR fica em `MENSAGENS` (`src/lib/actionError.ts`).
- Cores só via tokens do tema (`bg-surface`, `text-text-muted`, `text-primary`, tons de `Badge`) — nunca cor crua do Tailwind.
- Módulo `scheduling` só toca suas próprias entidades; sem acesso cruzado a tabelas de outro módulo.
- Bug/regra de negócio de risco ganha teste que a cobre.
- Nunca gerar allocation infinita nem estado ambíguo: `userId` XOR `guestName` sempre.

---

### Task 1: Schema — `Allocation.userId` opcional + campos de guest

**Files:**
- Modify: `prisma/schema.prisma:174-190` (model `Allocation`)
- Migration: gerada por `npm run db:migrate` em `prisma/migrations/<timestamp>_allocation_guest/migration.sql`

**Interfaces:**
- Produces: `Allocation.userId: string | null`, `Allocation.guestName: string | null`, `Allocation.guestCpf: string | null` no client Prisma gerado — todas as tasks seguintes dependem desses três campos.

- [ ] **Step 1: Editar o model `Allocation`**

Em `prisma/schema.prisma`, substituir o bloco atual do model `Allocation` por:

```prisma
model Allocation {
  id                     String           @id @default(uuid()) @db.Uuid
  slotId                 String           @unique @db.Uuid // 1 pessoa por vaga (FR-008)
  userId                 String?          @db.Uuid
  guestName              String?
  guestCpf               String?
  source                 AllocationSource
  overrideUnavailability Boolean          @default(false)
  status                 AllocationStatus @default(PENDING)
  respondedAt            DateTime?
  checkedInAt            DateTime?
  createdAt              DateTime         @default(now())

  slot        Slot         @relation(fields: [slotId], references: [id], onDelete: Cascade)
  user        User?        @relation(fields: [userId], references: [id], onDelete: Cascade)
  swapRequest SwapRequest?

  @@index([userId, createdAt])
}
```

(Só `userId` virou `String?` e `user` virou `User?`; `guestName`/`guestCpf` são novos. Mantenha o resto do arquivo — enums, outros models — intocado.)

- [ ] **Step 2: Gerar a migration**

Run: `npm run db:migrate` (nomeie quando perguntado: `allocation_guest`)

Expected: comando cria `prisma/migrations/<timestamp>_allocation_guest/migration.sql` com `ALTER TABLE "Allocation" ALTER COLUMN "userId" DROP NOT NULL;` e os dois `ADD COLUMN`.

- [ ] **Step 3: Adicionar o CHECK constraint na migration gerada**

Abrir o arquivo `migration.sql` recém-criado e acrescentar ao final:

```sql
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_user_xor_guest"
  CHECK ((("userId" IS NOT NULL) AND ("guestName" IS NULL))
      OR (("userId" IS NULL) AND ("guestName" IS NOT NULL)));
```

- [ ] **Step 4: Reaplicar a migration com o constraint**

Run: `npm run db:migrate`

Expected: sem diff pendente (a migration já foi aplicada com o SQL editado no passo 3 — se o Prisma reclamar de drift, rode `npx prisma migrate resolve --applied <nome_da_migration>` só se o Step 2 já tiver aplicado antes da edição; caso contrário `db:migrate` aplica direto).

- [ ] **Step 5: Regenerar o client e checar tipos**

Run: `npm run typecheck`

Expected: falhas em `allocateVolunteer.ts`/outros arquivos que assumiam `userId`/`user` não-nulos aparecem aqui — são esperadas e corrigidas nas próximas tasks. Se a única falha for em código que este plano ainda vai tocar, siga em frente.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(schema): Allocation aceita guest sem userId"
```

---

### Task 2: Serviço `allocateGuest`

**Files:**
- Create: `src/modules/scheduling/services/allocateGuest.ts`
- Test: `tests/unit/allocateGuestOutcome.test.ts`

**Interfaces:**
- Consumes: `requireLeaderOf(ministryId: string): Promise<User>` de `@/modules/identity/services/authz`; `SlotTaken` (classe já exportada por `@/modules/scheduling/services/allocateVolunteer`).
- Produces: `allocateGuest(params: { slotId: string; guestName: string; guestCpf?: string }): Promise<Allocation>`; `decideAllocateGuest(params: { hasAllocation: boolean }): "OK" | "SLOT_TAKEN"` — usado por `allocateGuest` e testado isoladamente.

- [ ] **Step 1: Escrever o teste da função pura de decisão**

Criar `tests/unit/allocateGuestOutcome.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { decideAllocateGuest } from "@/modules/scheduling/services/allocateGuest";

describe("decideAllocateGuest", () => {
  it("OK quando a vaga esta vazia", () => {
    expect(decideAllocateGuest({ hasAllocation: false })).toBe("OK");
  });
  it("SLOT_TAKEN quando a vaga ja tem alocacao", () => {
    expect(decideAllocateGuest({ hasAllocation: true })).toBe("SLOT_TAKEN");
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm run test -- tests/unit/allocateGuestOutcome.test.ts`
Expected: FAIL — `Cannot find module '@/modules/scheduling/services/allocateGuest'`

- [ ] **Step 3: Implementar `allocateGuest.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { SlotTaken } from "./allocateVolunteer";

export function decideAllocateGuest(params: { hasAllocation: boolean }): "OK" | "SLOT_TAKEN" {
  if (params.hasAllocation) return "SLOT_TAKEN";
  return "OK";
}

// Lider escala alguem sem conta (guestName + CPF opcional). Sem checagem de
// indisponibilidade (nao ha usuario) e sem notifyUser (guest nao tem push) —
// vira notificacao real so quando linkGuestAllocation vincular a um usuario.
export async function allocateGuest(params: { slotId: string; guestName: string; guestCpf?: string }) {
  const slot = await prisma.slot.findUniqueOrThrow({
    where: { id: params.slotId },
    include: { occurrence: { include: { schedule: true } }, allocation: true },
  });
  await requireLeaderOf(slot.occurrence.schedule.ministryId);

  if (decideAllocateGuest({ hasAllocation: !!slot.allocation }) === "SLOT_TAKEN") {
    throw new SlotTaken();
  }

  try {
    return await prisma.allocation.create({
      data: {
        slotId: params.slotId,
        guestName: params.guestName,
        guestCpf: params.guestCpf ?? null,
        source: "LEADER",
        status: "PENDING",
      },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") throw new SlotTaken();
    throw e;
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm run test -- tests/unit/allocateGuestOutcome.test.ts`
Expected: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add src/modules/scheduling/services/allocateGuest.ts tests/unit/allocateGuestOutcome.test.ts
git commit -m "feat(scheduling): servico allocateGuest pra escalar pessoa sem conta"
```

---

### Task 3: Serviço `linkGuestAllocation`

**Files:**
- Create: `src/modules/scheduling/services/linkGuestAllocation.ts`
- Test: `tests/unit/linkGuestAllocation.test.ts`

**Interfaces:**
- Consumes: `requireLeaderOf`, `hasUnavailabilityConflict(userId: string, occurrenceDate: Date): Promise<boolean>` de `@/modules/availability/services/checkConflict`, `notifyUser` de `@/modules/notifications/services/notify`, `fmtDateTime` de `@/lib/time`, `UnavailabilityBlocked` (classe já exportada por `@/modules/scheduling/services/allocateVolunteer`).
- Produces: `linkGuestAllocation(params: { allocationId: string; userId: string; override?: boolean }): Promise<Allocation>`; `decideLinkGuest(params: { hasUserId: boolean; hasConflict: boolean; override: boolean }): "OK" | "NOT_GUEST" | "UNAVAILABILITY_BLOCKED"`; `NotGuest` (nova classe de erro, mensagem `"NOT_GUEST"`).

- [ ] **Step 1: Escrever o teste da função pura de decisão**

Criar `tests/unit/linkGuestAllocation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { decideLinkGuest } from "@/modules/scheduling/services/linkGuestAllocation";

describe("decideLinkGuest", () => {
  it("OK quando a alocacao e guest e sem conflito", () => {
    expect(decideLinkGuest({ hasUserId: false, hasConflict: false, override: false })).toBe("OK");
  });
  it("NOT_GUEST quando a alocacao ja e de um usuario real", () => {
    expect(decideLinkGuest({ hasUserId: true, hasConflict: false, override: false })).toBe("NOT_GUEST");
  });
  it("UNAVAILABILITY_BLOCKED quando o usuario a linkar tem conflito sem override", () => {
    expect(decideLinkGuest({ hasUserId: false, hasConflict: true, override: false })).toBe(
      "UNAVAILABILITY_BLOCKED",
    );
  });
  it("OK quando ha conflito mas com override", () => {
    expect(decideLinkGuest({ hasUserId: false, hasConflict: true, override: true })).toBe("OK");
  });
  it("NOT_GUEST tem prioridade sobre conflito", () => {
    expect(decideLinkGuest({ hasUserId: true, hasConflict: true, override: true })).toBe("NOT_GUEST");
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm run test -- tests/unit/linkGuestAllocation.test.ts`
Expected: FAIL — módulo não existe

- [ ] **Step 3: Implementar `linkGuestAllocation.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { hasUnavailabilityConflict } from "@/modules/availability/services/checkConflict";
import { notifyUser } from "@/modules/notifications/services/notify";
import { fmtDateTime } from "@/lib/time";
import { UnavailabilityBlocked } from "./allocateVolunteer";

export class NotGuest extends Error {
  constructor() {
    super("NOT_GUEST");
  }
}

export function decideLinkGuest(params: {
  hasUserId: boolean;
  hasConflict: boolean;
  override: boolean;
}): "OK" | "NOT_GUEST" | "UNAVAILABILITY_BLOCKED" {
  if (params.hasUserId) return "NOT_GUEST";
  if (params.hasConflict && !params.override) return "UNAVAILABILITY_BLOCKED";
  return "OK";
}

// Lider vincula manualmente uma alocacao guest a um usuario real (depois que
// a pessoa criou conta). Mantem status PENDING — o usuario ainda precisa
// confirmar pelo app, agora que passa a receber notificacao.
export async function linkGuestAllocation(params: {
  allocationId: string;
  userId: string;
  override?: boolean;
}) {
  const allocation = await prisma.allocation.findUniqueOrThrow({
    where: { id: params.allocationId },
    include: {
      slot: { include: { occurrence: { include: { schedule: true } }, role: true } },
    },
  });
  await requireLeaderOf(allocation.slot.occurrence.schedule.ministryId);

  const conflict = await hasUnavailabilityConflict(params.userId, allocation.slot.occurrence.date);
  const decision = decideLinkGuest({
    hasUserId: allocation.userId !== null,
    hasConflict: conflict,
    override: !!params.override,
  });
  if (decision === "NOT_GUEST") throw new NotGuest();
  if (decision === "UNAVAILABILITY_BLOCKED") throw new UnavailabilityBlocked();

  const updated = await prisma.allocation.update({
    where: { id: params.allocationId },
    data: {
      userId: params.userId,
      guestName: null,
      guestCpf: null,
      overrideUnavailability: conflict && !!params.override,
    },
  });

  await notifyUser({
    userId: params.userId,
    type: "ASSIGNMENT",
    dedupeKey: `assign:${updated.id}`,
    title: "Você foi escalado",
    body: `${allocation.slot.role.name} · ${fmtDateTime(allocation.slot.occurrence.date)}`,
    url: "/",
    occurrenceId: allocation.slot.occurrenceId,
  });

  return updated;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm run test -- tests/unit/linkGuestAllocation.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add src/modules/scheduling/services/linkGuestAllocation.ts tests/unit/linkGuestAllocation.test.ts
git commit -m "feat(scheduling): servico linkGuestAllocation pra vincular guest a usuario"
```

---

### Task 4: Código de erro `NOT_GUEST` em `actionError.ts`

**Files:**
- Modify: `src/lib/actionError.ts:3-24`

**Interfaces:**
- Consumes: nada novo.
- Produces: `ActionCode` inclui `"NOT_GUEST"`; `MENSAGENS.NOT_GUEST` — Task 5 (`linkGuestAction`) depende deste código já existir em `handleActionError`.

- [ ] **Step 1: Adicionar `NOT_GUEST` ao union type e ao dicionário**

Em `src/lib/actionError.ts`, editar:

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
  | "NOT_GUEST"
  | "UNKNOWN";

export const MENSAGENS: Record<ActionCode, string> = {
  FORBIDDEN: "Você não tem permissão para essa ação.",
  SLOT_TAKEN: "Vaga já preenchida.",
  NOT_ELIGIBLE: "Você não é membro ativo desse ministério.",
  NOT_OWNER: "Essa escala não é sua.",
  UNAVAILABILITY_BLOCKED: "Indisponível nesse horário.",
  NO_ALLOCATION: "Essa vaga não tem ninguém alocado.",
  ALREADY_REQUESTED: "Você já pediu pra entrar nesse ministério.",
  ALREADY_REVIEWED: "Esse pedido já foi analisado.",
  NOT_GUEST: "Essa vaga já está com um usuário cadastrado.",
  UNKNOWN: "Não deu para completar agora. Tente de novo.",
};
```

- [ ] **Step 2: Checar tipos**

Run: `npm run typecheck`
Expected: sem novos erros vindos deste arquivo.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actionError.ts
git commit -m "feat(actionError): codigo NOT_GUEST pra vinculo de guest invalido"
```

---

### Task 5: Server Actions `allocateGuestAction` e `linkGuestAction`

**Files:**
- Modify: `app/(app)/escalas/actions.ts`

**Interfaces:**
- Consumes: `allocateGuest` (Task 2), `linkGuestAllocation` (Task 3), `handleActionError` (já existente, agora reconhece `NOT_GUEST` via Task 4).
- Produces: `allocateGuestAction(slotId: string, guestName: string, guestCpf?: string)`; `linkGuestAction(allocationId: string, userId: string, override?: boolean)` — ambas retornam `{ ok: true; allocation: { id: string; status: AllocationStatus } } | { ok: false; code: ActionCode; ref: string }`. Task 8 (UI) consome essas duas funções.

- [ ] **Step 1: Adicionar os imports e as duas actions**

Em `app/(app)/escalas/actions.ts`, adicionar ao import existente de `allocateVolunteer`:

```ts
import { allocateVolunteer, reassignAllocation } from "@/modules/scheduling/services/allocateVolunteer";
import { allocateGuest } from "@/modules/scheduling/services/allocateGuest";
import { linkGuestAllocation } from "@/modules/scheduling/services/linkGuestAllocation";
```

E, logo após `reassignAllocationAction` (antes de `deleteOccurrenceAction`), adicionar:

```ts
export async function allocateGuestAction(
  slotId: string,
  guestName: string,
  guestCpf?: string,
): Promise<
  | { ok: true; allocation: { id: string; status: AllocationStatus } }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const allocation = await allocateGuest({ slotId, guestName, guestCpf });
    revalidatePath("/escalas");
    return { ok: true, allocation: { id: allocation.id, status: allocation.status } };
  } catch (e) {
    return handleActionError("escalas.allocateGuest", e, { slotId });
  }
}

export async function linkGuestAction(
  allocationId: string,
  userId: string,
  override = false,
): Promise<
  | { ok: true; allocation: { id: string; status: AllocationStatus } }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const allocation = await linkGuestAllocation({ allocationId, userId, override });
    revalidatePath("/escalas");
    revalidatePath("/");
    return { ok: true, allocation: { id: allocation.id, status: allocation.status } };
  } catch (e) {
    return handleActionError("escalas.linkGuest", e, { allocationId, userId });
  }
}
```

- [ ] **Step 2: Checar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/escalas/actions.ts"
git commit -m "feat(escalas): actions allocateGuestAction e linkGuestAction"
```

---

### Task 6: `listMonthOccurrences` expõe `isGuest` e nome do guest

**Files:**
- Modify: `src/modules/scheduling/services/listMonthOccurrences.ts:10-69`

**Interfaces:**
- Consumes: nada novo (mesmo Prisma client, agora com `user` opcional em `allocation`).
- Produces: `MonthOccurrenceItem.slots[].isGuest: boolean` — Task 7 (`occurrenceCache.ts`) e Task 9 (`OccurrenceRow.tsx`) dependem deste campo.

- [ ] **Step 1: Atualizar o tipo `MonthOccurrenceItem`**

Em `listMonthOccurrences.ts`, adicionar `isGuest` ao tipo de slot:

```ts
export type MonthOccurrenceItem = {
  occurrenceId: string;
  scheduleId: string;
  ministryId: string;
  dayKey: string; // yyyy-MM-dd
  title: string;
  when: string;
  slots: {
    slotId: string;
    role: string;
    allocatedUserId: string | null;
    allocatedName: string | null;
    allocationId: string | null;
    allocatedStatus: AllocationStatus | null;
    checkedIn: boolean;
    isGuest: boolean;
  }[];
};
```

- [ ] **Step 2: Atualizar o mapeamento**

No `return occurrences.map(...)`, trocar o `slots.map` por:

```ts
slots: o.slots.map((s) => ({
  slotId: s.id,
  role: s.role.name,
  allocatedUserId: s.allocation?.userId ?? null,
  allocatedName: s.allocation?.user?.name ?? s.allocation?.guestName ?? null,
  allocationId: s.allocation?.id ?? null,
  allocatedStatus: s.allocation?.status ?? null,
  checkedIn: !!s.allocation?.checkedInAt,
  isGuest: !!s.allocation && s.allocation.userId === null,
})),
```

(`allocation.user` já vem incluído pela query existente — `allocation: { include: { user: true } }` — não precisa mexer no `include`.)

- [ ] **Step 3: Checar tipos**

Run: `npm run typecheck`
Expected: sem erros neste arquivo. Se `s.allocation.user` reclamar de possivelmente `null`, confirme que o encadeamento usa `?.` como acima.

- [ ] **Step 4: Commit**

```bash
git add src/modules/scheduling/services/listMonthOccurrences.ts
git commit -m "feat(scheduling): listMonthOccurrences expoe isGuest por vaga"
```

---

### Task 7: `occurrenceCache.ts` — tipos `Slot`/`SlotPatch` com `isGuest`

**Files:**
- Modify: `app/(app)/escalas/occurrenceCache.ts`
- Test: `tests/unit/patchOccurrenceSlot.test.ts` (modificar — arquivo já existe)

**Interfaces:**
- Consumes: nada novo.
- Produces: `Slot.isGuest: boolean`; `SlotPatch.allocatedUserId: string | null` (era `string`, agora aceita `null` pra refletir patch de guest); `SlotPatch.isGuest: boolean` — Task 8/9 (UI) dependem desses tipos.

- [ ] **Step 1: Atualizar o teste existente com o campo novo**

Em `tests/unit/patchOccurrenceSlot.test.ts`, atualizar `makeItem` e `PATCH` pra incluir `isGuest`, e adicionar um caso de patch guest:

```ts
function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    occurrenceId: "occ-1",
    scheduleId: "sched-1",
    ministryId: "min-1",
    dayKey: "2026-07-27",
    title: "Culto",
    when: "27/07 10:00",
    slots: [
      {
        slotId: "slot-1",
        role: "Vocal",
        allocatedUserId: null,
        allocatedName: null,
        allocationId: null,
        allocatedStatus: null,
        checkedIn: false,
        isGuest: false,
      },
      {
        slotId: "slot-2",
        role: "Bateria",
        allocatedUserId: null,
        allocatedName: null,
        allocationId: null,
        allocatedStatus: null,
        checkedIn: false,
        isGuest: false,
      },
    ],
    ...overrides,
  };
}

const PATCH = {
  allocatedUserId: "u1",
  allocatedName: "Ana",
  allocationId: "alloc-1",
  allocatedStatus: "PENDING" as const,
  checkedIn: false,
  isGuest: false,
};

const GUEST_PATCH = {
  allocatedUserId: null,
  allocatedName: "Fulano (visitante)",
  allocationId: "alloc-2",
  allocatedStatus: "PENDING" as const,
  checkedIn: false,
  isGuest: true,
};
```

E adicionar, dentro do `describe("patchOccurrenceSlot", ...)`, existente:

```ts
  it("aceita patch de guest sem userId", () => {
    const items = [makeItem()];
    const result = patchOccurrenceSlot(items, "occ-1", "slot-1", GUEST_PATCH);
    expect(result[0].slots[0]).toMatchObject(GUEST_PATCH);
  });
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm run test -- tests/unit/patchOccurrenceSlot.test.ts`
Expected: FAIL — erro de tipo/`toMatchObject` batendo com shape antigo sem `isGuest`, ou erro de compilação `isGuest` não existe em `Slot`/`SlotPatch`.

- [ ] **Step 3: Atualizar `occurrenceCache.ts`**

```ts
import type { AllocationStatus } from "@prisma/client";

export type Slot = {
  slotId: string;
  role: string;
  allocatedUserId: string | null;
  allocatedName: string | null;
  allocationId: string | null;
  allocatedStatus: AllocationStatus | null;
  checkedIn: boolean;
  isGuest: boolean;
};

export type Item = {
  occurrenceId: string;
  scheduleId: string;
  ministryId: string;
  dayKey: string; // yyyy-MM-dd
  title: string;
  when: string;
  slots: Slot[];
};

export type SlotPatch = {
  allocatedUserId: string | null;
  allocatedName: string;
  allocationId: string;
  allocatedStatus: AllocationStatus;
  checkedIn: boolean;
  isGuest: boolean;
};

// Atualiza uma vaga especifica dentro da lista de ocorrencias do mes, sem
// tocar o banco — usado apos allocate/reassign/link pra refletir 1 vaga na
// tela sem re-buscar o mes inteiro (que era a 2a requisicao por selecao).
export function patchOccurrenceSlot(
  items: Item[],
  occurrenceId: string,
  slotId: string,
  patch: SlotPatch,
): Item[] {
  return items.map((item) => {
    if (item.occurrenceId !== occurrenceId) return item;
    return {
      ...item,
      slots: item.slots.map((slot) => (slot.slotId === slotId ? { ...slot, ...patch } : slot)),
    };
  });
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm run test -- tests/unit/patchOccurrenceSlot.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 5: Checar tipos do projeto inteiro**

Run: `npm run typecheck`
Expected: erros restantes, se houver, só em `OccurrenceRow.tsx`/`EscalaCalendar.tsx` por causa do `SlotPatch.allocatedUserId` agora nullable — serão corrigidos na Task 9. Se este for o único ponto de erro, prossiga.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/escalas/occurrenceCache.ts" tests/unit/patchOccurrenceSlot.test.ts
git commit -m "feat(escalas): Slot/SlotPatch ganham isGuest e allocatedUserId nullable"
```

---

### Task 8: `AllocatePicker` — opção "Pessoa sem conta"

**Files:**
- Modify: `app/(app)/escalas/AllocatePicker.tsx`

**Interfaces:**
- Consumes: nada novo (componente client puro).
- Produces: novo prop opcional `onPickGuest?: (name: string, cpf?: string) => void` — Task 9 (`OccurrenceRow.tsx`) passa esse callback ao usar o picker em modo "alocar" (não em modo "vincular", onde `onPickGuest` fica `undefined` e o item some da lista).

- [ ] **Step 1: Reescrever o componente com o formulário inline de guest**

Substituir todo o conteúdo de `app/(app)/escalas/AllocatePicker.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/ui/Badge";
import type { AllocationCandidate } from "./actions";

export function AllocatePicker(props: {
  disabled?: boolean;
  autoOpen?: boolean;
  excludeUserId?: string;
  candidates: AllocationCandidate[] | null;
  loading: boolean;
  failed: boolean;
  failedRef?: string | null;
  onOpen: () => void;
  onRetry: () => void;
  onPick: (userId: string) => void;
  onPickGuest?: (name: string, cpf?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestCpf, setGuestCpf] = useState("");
  const isOpen = props.autoOpen || open;

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    props.onOpen();
  }

  function submitGuest() {
    const name = guestName.trim();
    if (!name || !props.onPickGuest) return;
    props.onPickGuest(name, guestCpf.trim() || undefined);
    setAddingGuest(false);
    setGuestName("");
    setGuestCpf("");
    setOpen(false);
  }

  const candidates = props.excludeUserId
    ? props.candidates?.filter((c) => c.userId !== props.excludeUserId)
    : props.candidates;

  const guestForm = (
    <div className="px-3 py-2 flex flex-col gap-2">
      <input
        type="text"
        placeholder="Nome da pessoa"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        className="field !py-1.5 text-sm w-full"
        autoFocus
      />
      <input
        type="text"
        inputMode="numeric"
        placeholder="CPF (opcional)"
        value={guestCpf}
        onChange={(e) => setGuestCpf(e.target.value.replace(/\D/g, ""))}
        className="field !py-1.5 text-sm w-full"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submitGuest}
          disabled={!guestName.trim()}
          className="text-xs text-primary font-medium disabled:opacity-40"
        >
          Adicionar
        </button>
        <button type="button" onClick={() => setAddingGuest(false)} className="text-xs text-text-muted">
          cancelar
        </button>
      </div>
    </div>
  );

  const list = (
    <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl bg-surface ring-1 ring-border shadow-lg">
      {props.loading && <p className="px-3 py-2 text-xs text-text-muted">Carregando…</p>}
      {props.failed && (
        <div className="px-3 py-2 text-xs text-text-muted">
          Não deu pra carregar{props.failedRef && ` · cód. ${props.failedRef}`}.{" "}
          <button className="underline underline-offset-2 text-primary" onClick={props.onRetry}>
            Tentar de novo
          </button>
        </div>
      )}
      {!props.loading && !props.failed && candidates?.length === 0 && !props.onPickGuest && (
        <p className="px-3 py-2 text-xs text-text-muted">Nenhum voluntário neste ministério.</p>
      )}
      {!props.loading &&
        !props.failed &&
        candidates?.map((c) => (
          <button
            key={c.userId}
            type="button"
            onClick={() => {
              setOpen(false);
              props.onPick(c.userId);
            }}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
          >
            <span className="flex items-center gap-1.5 flex-wrap">
              {c.name}
              {c.unavailable && (
                <Badge tone="danger" className="text-[10px]">
                  Indisponível
                </Badge>
              )}
            </span>
            <span className="text-xs text-text-muted shrink-0">{c.count30d}x/30d</span>
          </button>
        ))}
      {props.onPickGuest &&
        (addingGuest ? (
          guestForm
        ) : (
          <button
            type="button"
            onClick={() => setAddingGuest(true)}
            className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-surface-2 border-t border-border"
          >
            + Pessoa sem conta
          </button>
        ))}
    </div>
  );

  if (props.autoOpen) {
    return (
      <div className="relative flex-1" data-no-swipe>
        {list}
      </div>
    );
  }

  return (
    <div className="relative flex-1" data-no-swipe>
      <button
        type="button"
        disabled={props.disabled}
        onClick={toggle}
        className="field flex-1 !py-1.5 text-sm w-full flex items-center justify-between disabled:opacity-40"
      >
        Alocar…
        <ChevronDown size={14} strokeWidth={2} />
      </button>

      {isOpen && list}
    </div>
  );
}
```

- [ ] **Step 2: Checar tipos**

Run: `npm run typecheck`
Expected: sem erros neste arquivo (uso em `OccurrenceRow.tsx` ainda não passa `onPickGuest` — prop é opcional, não quebra).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/escalas/AllocatePicker.tsx"
git commit -m "feat(escalas): AllocatePicker ganha opcao pessoa sem conta"
```

---

### Task 9: `OccurrenceRow` — badge guest, vincular, copiar WhatsApp

**Files:**
- Modify: `app/(app)/escalas/OccurrenceRow.tsx`

**Interfaces:**
- Consumes: `allocateGuestAction`, `linkGuestAction` (Task 5); `AllocatePicker` com `onPickGuest` (Task 8); `Slot`/`SlotPatch` com `isGuest` (Task 7).
- Produces: componente final da feature — nenhuma task depende dele.

- [ ] **Step 1: Atualizar os imports**

Em `app/(app)/escalas/OccurrenceRow.tsx`, trocar o bloco de import de actions:

```tsx
import {
  allocateAction,
  reassignAllocationAction,
  allocateGuestAction,
  linkGuestAction,
  deleteOccurrenceAction,
  getOccurrenceCandidatesAction,
  type AllocationCandidate,
} from "./actions";
```

- [ ] **Step 2: Adicionar estado de "vincular" e a função `buildWhatsAppText`**

Logo abaixo de `const [reassigningSlotId, setReassigningSlotId] = useState<string | null>(null);`, adicionar:

```tsx
const [linkingSlotId, setLinkingSlotId] = useState<string | null>(null);
const [copyNote, setCopyNote] = useState(false);
```

E, antes do `return (`, adicionar a função de montar o texto (fora do componente, no topo do arquivo, junto aos outros helpers de módulo — colocar logo abaixo de `type Note = {...}`):

```tsx
function buildWhatsAppText(title: string, when: string, slots: Slot[]): string {
  const linhas = slots.map((s) => `- ${s.role}: ${s.allocatedName ?? "— vaga aberta"}`);
  return `*${title}*\n${when}\n\n${linhas.join("\n")}`;
}
```

- [ ] **Step 3: Adicionar `allocateGuest`/`linkGuest` e o handler de copiar, junto às funções existentes do componente**

Logo após a função `allocate` (que chama `runAllocation("assign", ...)`), adicionar:

```tsx
function allocateGuestHandler(slotId: string, name: string, cpf?: string) {
  start(async () => {
    const res = await allocateGuestAction(slotId, name, cpf);
    if (!res.ok) {
      setNote({ slotId, message: `${MENSAGENS[res.code]} · cód. ${res.ref}`, mode: "assign" });
      return;
    }
    props.onAllocated(slotId, {
      allocatedUserId: null,
      allocatedName: name,
      allocationId: res.allocation.id,
      allocatedStatus: res.allocation.status,
      checkedIn: false,
      isGuest: true,
    });
    setNote(null);
  });
}

function linkGuest(slotId: string, allocationId: string, userId: string, override = false) {
  start(async () => {
    const res = await linkGuestAction(allocationId, userId, override);
    if (!res.ok) {
      if (res.code === "UNAVAILABILITY_BLOCKED") {
        setNote({
          slotId,
          message: `${MENSAGENS.UNAVAILABILITY_BLOCKED} Vincular mesmo assim?`,
          retryUserId: userId,
          mode: "reassign",
        });
      } else {
        setNote({ slotId, message: `${MENSAGENS[res.code]} · cód. ${res.ref}`, mode: "reassign" });
      }
      return;
    }
    const name = candidates?.find((c) => c.userId === userId)?.name ?? "Alguém";
    props.onAllocated(slotId, {
      allocatedUserId: userId,
      allocatedName: name,
      allocationId: res.allocation.id,
      allocatedStatus: res.allocation.status,
      checkedIn: false,
      isGuest: false,
    });
    setNote(null);
    setLinkingSlotId(null);
  });
}

function copyWhatsAppText() {
  const text = buildWhatsAppText(props.title, props.when, props.slots);
  navigator.clipboard.writeText(text);
  setCopyNote(true);
  setTimeout(() => setCopyNote(false), 2000);
}
```

- [ ] **Step 4: Atualizar o retry do `noteFor` (que hoje sempre chama `runAllocation`) pra rotear vínculo de guest também**

O bloco existente:

```tsx
{noteFor.retryUserId && (
  <button
    className="underline underline-offset-2 ml-1"
    onClick={() => runAllocation(noteFor.mode, s.slotId, noteFor.retryUserId!, true)}
  >
    Sim
  </button>
)}
```

vira, dentro do `.map` de `props.slots` (onde `s` já está em escopo):

```tsx
{noteFor.retryUserId && (
  <button
    className="underline underline-offset-2 ml-1"
    onClick={() =>
      s.isGuest && s.allocationId
        ? linkGuest(s.slotId, s.allocationId, noteFor.retryUserId!, true)
        : runAllocation(noteFor.mode, s.slotId, noteFor.retryUserId!, true)
    }
  >
    Sim
  </button>
)}
```

- [ ] **Step 5: Adicionar o botão "Copiar p/ WhatsApp" no cabeçalho do card**

No bloco `{props.canManage && (<div className="flex items-center gap-3">...)}`, adicionar um botão antes do `Pencil`:

```tsx
{props.canManage && (
  <div className="flex items-center gap-3">
    <button
      type="button"
      className="text-xs text-text-muted hover:text-text"
      onClick={copyWhatsAppText}
    >
      {copyNote ? "Copiado!" : "Copiar p/ WhatsApp"}
    </button>
    <Link href={`/escalas/${props.scheduleId}/editar`} className="text-text-muted hover:text-text">
      <Pencil size={14} strokeWidth={1.8} />
    </Link>
    ...
```

(mantém o resto do bloco — `Excluir esta`/`Daqui em diante` — como está).

- [ ] **Step 6: Atualizar a renderização de cada vaga: badge guest, botão vincular, picker de guest**

O bloco `{reassigningSlotId === s.slotId ? (...) : s.allocatedName ? (...) : props.canManage ? (...) : (...)}` vira:

```tsx
{reassigningSlotId === s.slotId ? (
  <div className="flex-1 flex items-center gap-2">
    <AllocatePicker
      autoOpen
      excludeUserId={s.allocatedUserId ?? undefined}
      disabled={pending}
      candidates={candidates}
      loading={candidatesLoading}
      failed={candidatesFailed}
      failedRef={candidatesRef}
      onOpen={ensureCandidates}
      onRetry={ensureCandidates}
      onPick={(userId) => reassign(s.slotId, s.allocatedName, userId)}
    />
    <button
      type="button"
      className="text-xs text-text-muted shrink-0"
      onClick={() => setReassigningSlotId(null)}
    >
      cancelar
    </button>
  </div>
) : linkingSlotId === s.slotId ? (
  <div className="flex-1 flex items-center gap-2">
    <AllocatePicker
      autoOpen
      disabled={pending}
      candidates={candidates}
      loading={candidatesLoading}
      failed={candidatesFailed}
      failedRef={candidatesRef}
      onOpen={ensureCandidates}
      onRetry={ensureCandidates}
      onPick={(userId) => s.allocationId && linkGuest(s.slotId, s.allocationId, userId)}
    />
    <button
      type="button"
      className="text-xs text-text-muted shrink-0"
      onClick={() => setLinkingSlotId(null)}
    >
      cancelar
    </button>
  </div>
) : s.allocatedName ? (
  <span className="text-sm text-text flex-1 flex items-center gap-1.5 flex-wrap">
    {s.allocatedName}
    {s.isGuest && (
      <Badge tone="info" className="text-[10px]">
        sem conta
      </Badge>
    )}
    {!s.isGuest && s.allocatedStatus === "PENDING" && (
      <Badge tone="info" className="text-[10px]">
        aguardando confirmação
      </Badge>
    )}
    {props.isToday && s.checkedIn && (
      <CheckCircle2 size={14} className="text-primary" strokeWidth={1.8} />
    )}
    {props.canManage && s.isGuest && (
      <button
        type="button"
        className="text-xs text-primary underline underline-offset-2"
        disabled={pending}
        onClick={() => {
          setLinkingSlotId(s.slotId);
          ensureCandidates();
        }}
      >
        vincular
      </button>
    )}
    {props.canManage && (
      <button
        type="button"
        className="text-xs text-primary underline underline-offset-2"
        disabled={pending}
        onClick={() => {
          setReassigningSlotId(s.slotId);
          ensureCandidates();
        }}
      >
        trocar
      </button>
    )}
  </span>
) : props.canManage ? (
  <AllocatePicker
    disabled={pending}
    candidates={candidates}
    loading={candidatesLoading}
    failed={candidatesFailed}
    onOpen={ensureCandidates}
    onRetry={ensureCandidates}
    onPick={(userId) => allocate(s.slotId, userId)}
    onPickGuest={(name, cpf) => allocateGuestHandler(s.slotId, name, cpf)}
  />
) : (
  <span className="text-sm text-text-muted flex-1">— vaga aberta</span>
)}
```

- [ ] **Step 7: Checar tipos**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 8: Rodar toda a suíte unitária**

Run: `npm run test`
Expected: PASS em todos os arquivos, incluindo os novos das Tasks 2, 3 e 7.

- [ ] **Step 9: Testar manualmente**

Run: `npm run dev`, abrir `/escalas` como líder de um ministério, numa vaga vazia clicar "Alocar…" → "+ Pessoa sem conta" → preencher nome (e CPF opcional) → "Adicionar". Confirmar que a vaga mostra o nome com badge "sem conta" e os botões "vincular"/"trocar". Clicar "vincular", escolher um voluntário real da lista, confirmar que o nome troca, o badge some (ou vira "aguardando confirmação" se PENDING) e some o botão "vincular". Clicar "Copiar p/ WhatsApp" no cabeçalho do card, colar em algum lugar e conferir o texto formatado.

- [ ] **Step 10: Commit**

```bash
git add "app/(app)/escalas/OccurrenceRow.tsx"
git commit -m "feat(escalas): badge/vinculo de guest e copiar texto pro WhatsApp"
```
