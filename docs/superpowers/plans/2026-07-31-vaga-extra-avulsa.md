# Vaga Extra Avulsa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to add ad-hoc slots (from existing ministry roles) to a specific occurrence without altering the schedule template.

**Architecture:** 
- Backend: Two new services (`getAvailableRoles`, `addExtraSlot`) with unit tests, exposed via Server Actions.
- Frontend: A new `AddExtraSlotSheet` component integrated into `OccurrenceRow` and triggered via `OccurrenceMenu`.

**Tech Stack:** Next.js App Router, Prisma, React Server Components, Vitest, Tailwind CSS, Lucide React.

## Global Constraints

- Database enforces `@@unique([occurrenceId, roleId])` on the `Slot` model.
- Authorization: `requireLeaderOf` must be enforced before mutating slots or reading ministry roles for scheduling.
- UI elements must follow the existing design system (e.g., `Sheet` from `@/ui/Sheet`, buttons with `Button` or standard styling as seen in `OccurrenceRow`).

---

### Task 1: Create `getAvailableRoles` service

**Files:**
- Create: `src/modules/scheduling/services/getAvailableRoles.ts`
- Create: `tests/unit/getAvailableRoles.test.ts`

**Interfaces:**
- Produces: `async function getAvailableRoles(occurrenceId: string)` returning `Array<{ id: string, name: string }>` (roles from the ministry that do NOT currently have an active slot on this occurrence).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/getAvailableRoles.test.ts
import { describe, it, expect, vi } from "vitest";
import { getAvailableRoles } from "../../src/modules/scheduling/services/getAvailableRoles";
import { prisma } from "../../src/lib/prisma";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    occurrence: { findUniqueOrThrow: vi.fn() },
    role: { findMany: vi.fn() }
  }
}));

describe("getAvailableRoles", () => {
  it("returns active roles not currently active in the occurrence", async () => {
    vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue({
      id: "occ-1", schedule: { ministryId: "min-1" },
      slots: [{ roleId: "role-1", active: true }, { roleId: "role-2", active: false }]
    } as any);

    vi.mocked(prisma.role.findMany).mockResolvedValue([
      { id: "role-1", name: "Singer" },
      { id: "role-2", name: "Guitar" },
      { id: "role-3", name: "Drums" }
    ] as any);

    const roles = await getAvailableRoles("occ-1");
    // role-1 is active, so it should be excluded
    // role-2 is inactive in slot, so it should be available
    // role-3 has no slot, so it should be available
    expect(roles.map(r => r.id)).toEqual(["role-2", "role-3"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest tests/unit/getAvailableRoles.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/modules/scheduling/services/getAvailableRoles.ts
import { prisma } from "@/lib/prisma";

export async function getAvailableRoles(occurrenceId: string) {
  const occurrence = await prisma.occurrence.findUniqueOrThrow({
    where: { id: occurrenceId },
    include: { schedule: true, slots: true },
  });

  const activeRoleIds = new Set(
    occurrence.slots.filter((s) => s.active).map((s) => s.roleId)
  );

  const ministryRoles = await prisma.role.findMany({
    where: { ministryId: occurrence.schedule.ministryId, active: true },
    orderBy: { name: "asc" },
  });

  return ministryRoles.filter((r) => !activeRoleIds.has(r.id));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest tests/unit/getAvailableRoles.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/scheduling/services/getAvailableRoles.ts tests/unit/getAvailableRoles.test.ts
git commit -m "feat: add getAvailableRoles service"
```

---

### Task 2: Create `addExtraSlot` service

**Files:**
- Create: `src/modules/scheduling/services/addExtraSlot.ts`
- Create: `tests/unit/addExtraSlot.test.ts`

**Interfaces:**
- Produces: `async function addExtraSlot(occurrenceId: string, roleId: string)` returning the `Slot`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/addExtraSlot.test.ts
import { describe, it, expect, vi } from "vitest";
import { addExtraSlot } from "../../src/modules/scheduling/services/addExtraSlot";
import { prisma } from "../../src/lib/prisma";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    slot: { upsert: vi.fn() }
  }
}));

describe("addExtraSlot", () => {
  it("upserts the slot to be active", async () => {
    vi.mocked(prisma.slot.upsert).mockResolvedValue({ id: "slot-1", active: true } as any);

    const slot = await addExtraSlot("occ-1", "role-1");
    
    expect(prisma.slot.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { occurrenceId_roleId: { occurrenceId: "occ-1", roleId: "role-1" } },
      create: { occurrenceId: "occ-1", roleId: "role-1", active: true },
      update: { active: true },
    }));
    expect(slot.id).toBe("slot-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest tests/unit/addExtraSlot.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/modules/scheduling/services/addExtraSlot.ts
import { prisma } from "@/lib/prisma";

export async function addExtraSlot(occurrenceId: string, roleId: string) {
  return prisma.slot.upsert({
    where: {
      occurrenceId_roleId: {
        occurrenceId,
        roleId,
      },
    },
    create: {
      occurrenceId,
      roleId,
      active: true,
    },
    update: {
      active: true,
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest tests/unit/addExtraSlot.test.ts --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/scheduling/services/addExtraSlot.ts tests/unit/addExtraSlot.test.ts
git commit -m "feat: add addExtraSlot service"
```

---

### Task 3: Expose Server Actions

**Files:**
- Modify: `app/(app)/escalas/actions.ts`

**Interfaces:**
- Consumes: `getAvailableRoles` and `addExtraSlot`.
- Produces: `getAvailableRolesAction` and `addExtraSlotAction`.

- [ ] **Step 1: Implement actions**

Add the following to the end of `app/(app)/escalas/actions.ts`:

```typescript
import { getAvailableRoles } from "@/modules/scheduling/services/getAvailableRoles";
import { addExtraSlot } from "@/modules/scheduling/services/addExtraSlot";

export async function getAvailableRolesAction(occurrenceId: string): Promise<
  | { ok: true; roles: { id: string; name: string }[] }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const occurrence = await prisma.occurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
      include: { schedule: true },
    });
    await requireLeaderOf(occurrence.schedule.ministryId);

    const roles = await getAvailableRoles(occurrenceId);
    return { ok: true, roles };
  } catch (e) {
    return handleActionError("escalas.getAvailableRoles", e, { occurrenceId });
  }
}

export async function addExtraSlotAction(occurrenceId: string, roleId: string): Promise<
  | { ok: true }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const occurrence = await prisma.occurrence.findUniqueOrThrow({
      where: { id: occurrenceId },
      include: { schedule: true },
    });
    await requireLeaderOf(occurrence.schedule.ministryId);

    await addExtraSlot(occurrenceId, roleId);
    revalidatePath("/escalas");
    return { ok: true };
  } catch (e) {
    return handleActionError("escalas.addExtraSlot", e, { occurrenceId, roleId });
  }
}
```

- [ ] **Step 2: Check compiler**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/escalas/actions.ts
git commit -m "feat: expose addExtraSlot server actions"
```

---

### Task 4: Create `AddExtraSlotSheet` Component

**Files:**
- Create: `app/(app)/escalas/AddExtraSlotSheet.tsx`

**Interfaces:**
- Consumes: `getAvailableRolesAction`, `addExtraSlotAction`
- Produces: `AddExtraSlotSheet` component to be used in `OccurrenceRow`.

- [ ] **Step 1: Write component code**

```tsx
// app/(app)/escalas/AddExtraSlotSheet.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { Sheet } from "@/ui/Sheet";
import { Button } from "@/ui/Button";
import { Loader2 } from "lucide-react";
import { getAvailableRolesAction, addExtraSlotAction } from "./actions";

export function AddExtraSlotSheet(props: {
  open: boolean;
  onClose: () => void;
  occurrenceId: string;
  onAdded: () => void;
}) {
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (props.open) {
      setLoading(true);
      getAvailableRolesAction(props.occurrenceId)
        .then((res) => {
          if (res.ok) setRoles(res.roles);
        })
        .finally(() => setLoading(false));
    }
  }, [props.open, props.occurrenceId]);

  function handleAdd(roleId: string) {
    start(async () => {
      const res = await addExtraSlotAction(props.occurrenceId, roleId);
      if (res.ok) {
        props.onAdded();
        props.onClose();
      } else {
        alert("Erro ao adicionar vaga.");
      }
    });
  }

  return (
    <Sheet open={props.open} onClose={props.onClose} title="Adicionar Vaga Extra">
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : roles.length === 0 ? (
          <p className="text-sm text-text-muted text-center p-4">
            Não há funções disponíveis para adicionar (todas já estão ativas nesta data).
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {roles.map((r) => (
              <li key={r.id}>
                <Button
                  type="button"
                  tone="neutral"
                  className="w-full justify-start"
                  disabled={pending}
                  onClick={() => handleAdd(r.id)}
                >
                  {r.name}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 2: Check compiler**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/escalas/AddExtraSlotSheet.tsx
git commit -m "feat: add AddExtraSlotSheet component"
```

---

### Task 5: Integrate UI into `OccurrenceRow`

**Files:**
- Modify: `app/(app)/escalas/OccurrenceMenu.tsx`
- Modify: `app/(app)/escalas/OccurrenceRow.tsx`

**Interfaces:**
- Consumes: `AddExtraSlotSheet`

- [ ] **Step 1: Modify `OccurrenceMenu.tsx`**

Add `onAddExtra: () => void;` to props.
Add the button inside the dropdown (above "Excluir esta"):

```tsx
// in props type:
onAddExtra: () => void;

// in the menu JSX before the delete buttons:
<button
  type="button"
  disabled={props.disabled}
  onClick={() => {
    setOpen(false);
    props.onAddExtra();
  }}
  className="w-full min-h-11 text-left px-4 py-3 text-sm text-text hover:bg-surface-2 disabled:opacity-40"
>
  Adicionar vaga extra
</button>
```

- [ ] **Step 2: Modify `OccurrenceRow.tsx`**

Import the new sheet:
```tsx
import { AddExtraSlotSheet } from "./AddExtraSlotSheet";
```

Add state:
```tsx
const [addExtraOpen, setAddExtraOpen] = useState(false);
```

Pass `onAddExtra` to `OccurrenceMenu`:
```tsx
<OccurrenceMenu
  scheduleId={props.scheduleId}
  copyLabel={copyNote ? "Copiado!" : "Copiar p/ WhatsApp"}
  onCopy={copyWhatsAppText}
  onAddExtra={() => setAddExtraOpen(true)}
  onDeleteSingle={() => del("SINGLE")}
  onDeleteFromHere={() => del("FROM_HERE")}
  disabled={pending}
/>
```

Render `AddExtraSlotSheet` below `SlotDetailSheet`:
```tsx
<AddExtraSlotSheet
  open={addExtraOpen}
  onClose={() => setAddExtraOpen(false)}
  occurrenceId={props.occurrenceId}
  onAdded={() => props.onChanged()}
/>
```

- [ ] **Step 3: Check compiler**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/escalas/OccurrenceMenu.tsx app/\(app\)/escalas/OccurrenceRow.tsx
git commit -m "feat: integrate extra slots UI into occurrence row"
```
