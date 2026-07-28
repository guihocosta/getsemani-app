# Agrupamento de Pessoas sem Conta + Login OTP E-mail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agrupar pessoas sem conta pelo nome no admin (`/admin/convidados`), permitir o vínculo em lote de todas as suas alocações a um voluntário em uma única ação, e melhorar a higienização e tratamento de erros do login por código OTP via e-mail.

**Architecture:** Modificar `listGuestAllocations` para agrupar as alocações ativas por `guestName` (case-insensitive); criar o serviço `linkAllGuestAllocations` que efetua o vínculo em lote dentro de uma transação do Prisma com checagem de indisponibilidade; expor a Server Action `linkAllGuestAction`; atualizar a UI de `/admin/convidados/` para exibir cards agrupados; e sanitizar entradas (`trim()`) no login OTP.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Prisma, Supabase Auth, Vitest.

## Global Constraints

- Manter toda a interface em pt-BR.
- Respeitar os aliases de importação (`@/*` e `@app/*`).
- Manter regras de autorização no gate de Server Actions (`requireLeaderOf` / `ledMinistryIds`).

---

### Task 1: Atualizar `listGuestAllocations` para agrupar por nome do convidado

**Files:**
- Modify: `src/modules/scheduling/services/listGuestAllocations.ts`
- Test: `tests/unit/listGuestAllocations.test.ts`

**Interfaces:**
- Consumes: `prisma.allocation`, `fmtDateTime`
- Produces: `listGuestAllocations(ministryIds: string[]): Promise<GroupedGuestItem[]>`, `GroupedGuestItem`, `GuestOccurrenceDetail`

- [ ] **Step 1: Escrever teste unitário falho para `listGuestAllocations`**

Criar `tests/unit/listGuestAllocations.test.ts` que testa a ordenação e o agrupamento por nome (case-insensitive/trimmed).

```ts
import { describe, it, expect } from "vitest";
import { groupGuestAllocations } from "@/modules/scheduling/services/listGuestAllocations";

describe("groupGuestAllocations", () => {
  it("agrupa alocações com mesmo guestName e ordena por data", () => {
    const rawAllocations = [
      {
        allocationId: "alloc-1",
        slotId: "slot-1",
        occurrenceId: "occ-1",
        guestName: "Maria Silva",
        role: "Som",
        ministryName: "Mídia",
        when: "08/08/2026 19:00",
        date: new Date("2026-08-08T19:00:00Z"),
      },
      {
        allocationId: "alloc-2",
        slotId: "slot-2",
        occurrenceId: "occ-2",
        guestName: "maria silva ",
        role: "Projeção",
        ministryName: "Mídia",
        when: "01/08/2026 19:00",
        date: new Date("2026-08-01T19:00:00Z"),
      },
      {
        allocationId: "alloc-3",
        slotId: "slot-3",
        occurrenceId: "occ-3",
        guestName: "João Santos",
        role: "Violão",
        ministryName: "Louvor",
        when: "02/08/2026 10:00",
        date: new Date("2026-08-02T10:00:00Z"),
      },
    ];

    const result = groupGuestAllocations(rawAllocations);

    expect(result).toHaveLength(2);
    // Maria Silva deve ter 2 alocações, a primeira em 01/08
    const maria = result.find((g) => g.guestName.toLowerCase().includes("maria"));
    expect(maria).toBeDefined();
    expect(maria?.totalAllocations).toBe(2);
    expect(maria?.allocations[0].allocationId).toBe("alloc-2");
    expect(maria?.allocations[1].allocationId).toBe("alloc-1");
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `npm run test -- tests/unit/listGuestAllocations.test.ts`
Expected: FAIL (`groupGuestAllocations` não exportado)

- [ ] **Step 3: Implementar a função pura e atualizar `listGuestAllocations.ts`**

Atualizar `src/modules/scheduling/services/listGuestAllocations.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/time";

export type GuestOccurrenceDetail = {
  allocationId: string;
  slotId: string;
  occurrenceId: string;
  role: string;
  ministryName: string;
  when: string;
  date: Date;
};

export type GroupedGuestItem = {
  guestName: string;
  totalAllocations: number;
  allocations: GuestOccurrenceDetail[];
};

export function groupGuestAllocations(
  rawAllocations: GuestOccurrenceDetail[]
): GroupedGuestItem[] {
  const groupsMap = new Map<string, { guestName: string; allocations: GuestOccurrenceDetail[] }>();

  for (const item of rawAllocations) {
    const key = item.guestName.trim().toLowerCase();
    if (!groupsMap.has(key)) {
      groupsMap.set(key, { guestName: item.guestName.trim(), allocations: [] });
    }
    groupsMap.get(key)!.allocations.push(item);
  }

  const result: GroupedGuestItem[] = [];
  for (const group of groupsMap.values()) {
    group.allocations.sort((a, b) => a.date.getTime() - b.date.getTime());
    result.push({
      guestName: group.guestName,
      totalAllocations: group.allocations.length,
      allocations: group.allocations,
    });
  }

  // Ordenar grupos em ordem alfabética pelo nome do convidado
  return result.sort((a, b) => a.guestName.localeCompare(b.guestName, "pt-BR"));
}

export async function listGuestAllocations(ministryIds: string[]): Promise<GroupedGuestItem[]> {
  if (ministryIds.length === 0) return [];

  const allocations = await prisma.allocation.findMany({
    where: {
      userId: null,
      guestName: { not: null },
      slot: {
        occurrence: {
          status: "ACTIVE",
          schedule: { ministryId: { in: ministryIds } },
        },
      },
    },
    include: {
      slot: {
        include: {
          role: true,
          occurrence: { include: { schedule: { include: { ministry: true } } } },
        },
      },
    },
  });

  const rawDetails: GuestOccurrenceDetail[] = allocations.map((a) => ({
    allocationId: a.id,
    slotId: a.slotId,
    occurrenceId: a.slot.occurrenceId,
    role: a.slot.role.name,
    ministryName: a.slot.occurrence.schedule.ministry.name,
    when: fmtDateTime(a.slot.occurrence.date),
    date: a.slot.occurrence.date,
  }));

  return groupGuestAllocations(rawDetails);
}
```

- [ ] **Step 4: Rodar teste para confirmar sucesso**

Run: `npm run test -- tests/unit/listGuestAllocations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/scheduling/services/listGuestAllocations.ts tests/unit/listGuestAllocations.test.ts
git commit -m "feat(scheduling): agrupa pessoas sem conta por nome em listGuestAllocations"
```

---

### Task 2: Serviço `linkAllGuestAllocations` com Vínculo em Lote

**Files:**
- Create: `src/modules/scheduling/services/linkAllGuestAllocations.ts`
- Create: `tests/unit/linkAllGuestAllocations.test.ts`

**Interfaces:**
- Consumes: `prisma`, `usersUnavailableAt` (do `availability`)
- Produces: `linkAllGuestAllocations(params: { guestName: string; userId: string; ministryIds: string[]; override?: boolean }): Promise<{ count: number }>`

- [ ] **Step 1: Criar teste de unidade para a lógica pura de decisão de vínculo em lote**

Criar `tests/unit/linkAllGuestAllocations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { decideLinkAllGuests } from "@/modules/scheduling/services/linkAllGuestAllocations";

describe("decideLinkAllGuests", () => {
  it("retorna OK quando o usuário não possui indisponibilidade", () => {
    const result = decideLinkAllGuests({
      matchingCount: 3,
      hasConflict: false,
      override: false,
    });
    expect(result).toBe("OK");
  });

  it("retorna NO_GUESTS_FOUND quando nenhuma alocação for encontrada", () => {
    const result = decideLinkAllGuests({
      matchingCount: 0,
      hasConflict: false,
      override: false,
    });
    expect(result).toBe("NO_GUESTS_FOUND");
  });

  it("retorna UNAVAILABILITY_BLOCKED quando houver conflito sem override", () => {
    const result = decideLinkAllGuests({
      matchingCount: 2,
      hasConflict: true,
      override: false,
    });
    expect(result).toBe("UNAVAILABILITY_BLOCKED");
  });

  it("retorna OK quando houver conflito mas override for true", () => {
    const result = decideLinkAllGuests({
      matchingCount: 2,
      hasConflict: true,
      override: true,
    });
    expect(result).toBe("OK");
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `npm run test -- tests/unit/linkAllGuestAllocations.test.ts`
Expected: FAIL (`decideLinkAllGuests` não encontrado)

- [ ] **Step 3: Implementar `src/modules/scheduling/services/linkAllGuestAllocations.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { usersUnavailableAt } from "@/modules/availability/services/usersUnavailableAt";

export type DecideLinkAllParam = {
  matchingCount: number;
  hasConflict: boolean;
  override: boolean;
};

export type LinkAllDecision = "OK" | "NO_GUESTS_FOUND" | "UNAVAILABILITY_BLOCKED";

export function decideLinkAllGuests(params: DecideLinkAllParam): LinkAllDecision {
  if (params.matchingCount === 0) return "NO_GUESTS_FOUND";
  if (params.hasConflict && !params.override) return "UNAVAILABILITY_BLOCKED";
  return "OK";
}

export class NoGuestsFoundError extends Error {
  constructor() {
    super("NO_GUESTS_FOUND");
    this.name = "NoGuestsFoundError";
  }
}

export class UnavailabilityBlockedError extends Error {
  constructor() {
    super("UNAVAILABILITY_BLOCKED");
    this.name = "UnavailabilityBlockedError";
  }
}

export async function linkAllGuestAllocations(params: {
  guestName: string;
  userId: string;
  ministryIds: string[];
  override?: boolean;
}): Promise<{ count: number }> {
  if (params.ministryIds.length === 0) {
    throw new NoGuestsFoundError();
  }

  // Buscar todas as alocações ativas do convidado nos ministérios informados
  const targetKey = params.guestName.trim().toLowerCase();

  const activeAllocations = await prisma.allocation.findMany({
    where: {
      userId: null,
      guestName: { not: null },
      slot: {
        occurrence: {
          status: "ACTIVE",
          schedule: { ministryId: { in: params.ministryIds } },
        },
      },
    },
    include: {
      slot: {
        include: { occurrence: true },
      },
    },
  });

  const matching = activeAllocations.filter(
    (a) => a.guestName?.trim().toLowerCase() === targetKey
  );

  const decision = decideLinkAllGuests({
    matchingCount: matching.length,
    hasConflict: false, // será avaliado abaixo caso existam alocações
    override: !!params.override,
  });

  if (decision === "NO_GUESTS_FOUND") {
    throw new NoGuestsFoundError();
  }

  // Checar indisponibilidades para cada data de ocorrência
  const dates = matching.map((m) => m.slot.occurrence.date);
  let hasConflict = false;

  for (const date of dates) {
    const unavail = await usersUnavailableAt([params.userId], date);
    if (unavail.includes(params.userId)) {
      hasConflict = true;
      break;
    }
  }

  if (hasConflict && !params.override) {
    throw new UnavailabilityBlockedError();
  }

  // Atualização atômica em lote no banco
  const matchingIds = matching.map((m) => m.id);

  const result = await prisma.allocation.updateMany({
    where: { id: { in: matchingIds } },
    data: {
      userId: params.userId,
      guestName: null,
      guestCpf: null,
    },
  });

  return { count: result.count };
}
```

- [ ] **Step 4: Rodar teste para confirmar sucesso**

Run: `npm run test -- tests/unit/linkAllGuestAllocations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/scheduling/services/linkAllGuestAllocations.ts tests/unit/linkAllGuestAllocations.test.ts
git commit -m "feat(scheduling): servico linkAllGuestAllocations para vincular alocacoes em lote"
```

---

### Task 3: Expor a Server Action `linkAllGuestAction`

**Files:**
- Modify: `app/(app)/escalas/actions.ts`

**Interfaces:**
- Consumes: `linkAllGuestAllocations`, `getSessionUser`, `ledMinistryIds`, `handleActionError`
- Produces: `linkAllGuestAction(guestName: string, userId: string, override?: boolean)`

- [ ] **Step 1: Adicionar tratamento de erro `NO_GUESTS_FOUND` no `handleActionError` se necessário e exportar `linkAllGuestAction`**

Modificar `app/(app)/escalas/actions.ts`:

```ts
import { linkAllGuestAllocations } from "@/modules/scheduling/services/linkAllGuestAllocations";

// ... dentro das actions de escala em app/(app)/escalas/actions.ts ...

export async function linkAllGuestAction(
  guestName: string,
  userId: string,
  override?: boolean
): Promise<
  | { ok: true; count: number }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const user = await getSessionUser();
    if (!user) throw new Error("FORBIDDEN");

    const ministryIds = await ledMinistryIds(user.id, user.isAdmin);
    const result = await linkAllGuestAllocations({
      guestName,
      userId,
      ministryIds,
      override,
    });

    revalidatePath("/admin/convidados");
    revalidatePath("/escalas");

    return { ok: true, count: result.count };
  } catch (e) {
    return handleActionError("escalas.linkAllGuest", e, { guestName, userId });
  }
}
```

(Garantir que `ActionCode` em `src/lib/actionError.ts` trate ou reconheça `NO_GUESTS_FOUND` e `UNAVAILABILITY_BLOCKED` apropriadamente caso ainda não o faça.)

- [ ] **Step 2: Verificar checagem de tipos**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/escalas/actions.ts
git commit -m "feat(escalas): Server Action linkAllGuestAction para vinculo em lote"
```

---

### Task 4: Atualizar Interface em `/admin/convidados` com Cards Agrupados

**Files:**
- Modify: `app/(app)/admin/convidados/page.tsx`
- Modify: `app/(app)/admin/convidados/GuestRow.tsx`

**Interfaces:**
- Consumes: `GroupedGuestItem`, `linkAllGuestAction`
- Produces: UI agrupada de convidados em `/admin/convidados`

- [ ] **Step 1: Atualizar `app/(app)/admin/convidados/GuestRow.tsx` para aceitar `GroupedGuestItem`**

Substituir o conteúdo de `GuestRow.tsx` para exibir o nome do convidado, a badge com a contagem de alocações, a lista de ocorrências e o botão único para vincular em lote:

```tsx
"use client";

import { useState, useTransition } from "react";
import { AllocatePicker } from "@app/(app)/escalas/AllocatePicker";
import {
  getOccurrenceCandidatesAction,
  linkAllGuestAction,
  type AllocationCandidate,
} from "@app/(app)/escalas/actions";
import { Badge } from "@/ui/Badge";
import { MENSAGENS } from "@/lib/actionError";
import type { GroupedGuestItem } from "@/modules/scheduling/services/listGuestAllocations";

export function GuestRow({ guest }: { guest: GroupedGuestItem }) {
  const [pending, start] = useTransition();
  const [linkedCount, setLinkedCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [retryUserId, setRetryUserId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<AllocationCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failedRef, setFailedRef] = useState<string | null>(null);

  const firstOccurrenceId = guest.allocations[0]?.occurrenceId;

  function ensureCandidates() {
    if (candidates || loading || !firstOccurrenceId) return;
    setFailed(false);
    setFailedRef(null);
    setLoading(true);
    getOccurrenceCandidatesAction(firstOccurrenceId)
      .then((res) => {
        if (res.ok) setCandidates(res.candidates);
        else {
          setFailed(true);
          setFailedRef(res.ref);
        }
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }

  function linkAll(userId: string, override = false) {
    start(async () => {
      const res = await linkAllGuestAction(guest.guestName, userId, override);
      if (!res.ok) {
        if (res.code === "UNAVAILABILITY_BLOCKED") {
          setNote(`${MENSAGENS.UNAVAILABILITY_BLOCKED} Vincular mesmo assim?`);
          setRetryUserId(userId);
        } else {
          setNote(`${MENSAGENS[res.code]} · cód. ${res.ref}`);
        }
        return;
      }
      setLinkedCount(res.count);
      setNote(null);
      setOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-text">{guest.guestName}</p>
          <Badge tone="info">{guest.totalAllocations} escalação(ões)</Badge>
        </div>
      </div>

      <ul className="text-xs text-text-muted space-y-1 pl-1 border-l-2 border-border">
        {guest.allocations.map((alloc) => (
          <li key={alloc.allocationId}>
            <span className="font-medium text-text">{alloc.when}</span> — {alloc.ministryName} ({alloc.role})
          </li>
        ))}
      </ul>

      {linkedCount !== null ? (
        <p className="text-sm text-primary font-medium">
          {linkedCount} escalação(ões) vinculadas com sucesso!
        </p>
      ) : open ? (
        <div className="flex items-center gap-2 mt-1">
          <AllocatePicker
            autoOpen
            disabled={pending}
            candidates={candidates}
            loading={loading}
            failed={failed}
            failedRef={failedRef}
            onOpen={ensureCandidates}
            onRetry={ensureCandidates}
            onPick={(userId) => linkAll(userId)}
          />
          <button
            type="button"
            className="text-xs text-text-muted shrink-0 min-h-11"
            onClick={() => setOpen(false)}
          >
            cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="text-xs text-primary underline underline-offset-2 w-fit mt-1 min-h-9"
          onClick={() => {
            setOpen(true);
            ensureCandidates();
          }}
        >
          vincular a um usuário
        </button>
      )}

      {note && (
        <p className="text-xs text-primary mt-1">
          {note}
          {retryUserId && (
            <button className="underline underline-offset-2 ml-1" onClick={() => linkAll(retryUserId, true)}>
              Sim
            </button>
          )}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Atualizar `app/(app)/admin/convidados/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getSessionUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { listGuestAllocations } from "@/modules/scheduling/services/listGuestAllocations";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { GuestRow } from "./GuestRow";

export const dynamic = "force-dynamic";

export default async function ConvidadosAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isLeader = await isLeaderOfAny(user.id);
  if (!user.isAdmin && !isLeader) redirect("/");

  const ministryIds = await ledMinistryIds(user.id, user.isAdmin);
  const guests = await listGuestAllocations(ministryIds);

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Pessoas sem conta</h1>

      {guests.length === 0 ? (
        <EmptyState
          title="Ninguém pendente"
          subtitle="Pessoas escaladas sem conta aparecem aqui agrupadas pra você vincular quando elas se cadastrarem."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {guests.map((g) => (
            <li key={g.guestName}>
              <Card>
                <GuestRow guest={g} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar compilação do TypeScript**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/admin/convidados/
git commit -m "feat(admin): exibe pessoas sem conta agrupadas com vinculo em lote"
```

---

### Task 5: Higienização no Login OTP por E-mail & Mensagens

**Files:**
- Modify: `app/(auth)/login/actions.ts`
- Modify: `app/(auth)/login/LoginForm.tsx`

**Interfaces:**
- Consumes: Supabase auth OTP
- Produces: Tratamento de e-mail/código com `trim()`, log do servidor em falhas.

- [ ] **Step 1: Atualizar `app/(auth)/login/actions.ts` com sanitização**

```ts
"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { ensureProfile } from "@/modules/identity/services/ensureProfile";

export type LoginActionState = { ok: boolean; error?: string };

export async function sendCodeAction(rawEmail: string): Promise<LoginActionState> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return { ok: false, error: "Informe um e-mail válido." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    console.error("[sendCodeAction] Erro no Supabase OTP:", error.message);
    return { ok: false, error: "Não deu para enviar o código. Confira o e-mail." };
  }
  return { ok: true };
}

export async function verifyCodeAction(rawEmail: string, rawToken: string): Promise<LoginActionState> {
  const email = rawEmail.trim().toLowerCase();
  const token = rawToken.trim();

  if (!email || !token) return { ok: false, error: "Código ou e-mail inválido." };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error || !data.user) {
    if (error) console.error("[verifyCodeAction] Erro ao verificar OTP:", error.message);
    return { ok: false, error: "Código inválido ou expirado." };
  }
  await ensureProfile(data.user);
  return { ok: true };
}
```

- [ ] **Step 2: Atualizar `app/(auth)/login/LoginForm.tsx` com sanitização do lado do cliente e ajuda contextual**

No `LoginForm.tsx`, adicionar texto explicativo abaixo da entrada de e-mail e garantir `trim()` nos estados antes de enviar.

```tsx
// Em app/(auth)/login/LoginForm.tsx (trecho no retorno do form de e-mail):
    <div className="flex flex-col gap-3">
      <input
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="field"
      />
      <p className="text-xs text-text-muted">
        Você receberá um código de 6 dígitos no seu e-mail.
      </p>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button onClick={sendCode} disabled={!email.trim() || pending}>
        Entrar com e-mail
      </Button>
      <Button variant="secondary" onClick={signInGoogle}>
        Entrar com Google
      </Button>
    </div>
```

- [ ] **Step 3: Testar compilação e rodar testes unitários da aplicação**

Run: `npm run typecheck && npm run test`
Expected: PASS em todos os testes

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/login/
git commit -m "fix(auth): sanitizacao de email e codigo otp com logs do servidor"
```
