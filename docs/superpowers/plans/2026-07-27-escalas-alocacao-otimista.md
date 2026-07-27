# Alocação Otimista em Escalas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar a 2ª requisição (refetch do mês inteiro) que hoje dispara a cada alocação/reatribuição de vaga em Escalas, atualizando o estado local do calendário direto com o retorno da Server Action.

**Architecture:** `allocateAction`/`reassignAllocationAction` passam a devolver `{ id, status }` da alocação criada. Um novo módulo puro (`occurrenceCache.ts`) recebe esse retorno e devolve uma nova lista de ocorrências com só a vaga afetada atualizada — sem tocar o banco. `EscalaCalendar` usa essa função pra atualizar seu `cache` local; `OccurrenceRow` para de chamar `onChanged()` (full refetch) no sucesso e passa a chamar o novo callback `onAllocated`.

**Tech Stack:** Next.js 15 App Router, React 19 (client component + `useTransition`), TypeScript strict, Vitest.

## Global Constraints

- Toda a interface é em pt-BR (labels, mensagens) — CLAUDE.md.
- Cores só via tokens do tema (`bg-surface`, `text-text-muted`...) — nenhuma mudança de cor nesta feature, mas não introduzir nenhuma.
- Testes unitários cobrem regra de negócio de risco com função **pura**, sem DB, sem mock — padrão de `tests/unit/*.test.ts` (ver `swap.test.ts`).
- Aliases: `@/*` → `src/*`, `@app/*` → `app/*` (mesmo mapeamento em `tsconfig.json` e `vitest.config.ts`).
- Server Actions retornam `{ ok, ... } | { ok: false, code, ref }` — padrão já estabelecido em `src/lib/actionError.ts` (`handleActionError`).
- Rodar `npm run test`, `npm run typecheck`, `npm run lint` ao final de cada task — todos verdes antes de comitar.
- Comentários no código só quando o "porquê" não é óbvio, em português, uma linha.

---

### Task 1: Módulo puro `occurrenceCache` — tipos compartilhados + patch de vaga

**Files:**
- Create: `app/(app)/escalas/occurrenceCache.ts`
- Create: `tests/unit/patchOccurrenceSlot.test.ts`

**Interfaces:**
- Produces: `type Slot`, `type Item`, `type SlotPatch`, `function patchOccurrenceSlot(items: Item[], occurrenceId: string, slotId: string, patch: SlotPatch): Item[]`. Tasks 2 e 3 importam esses 4 nomes de `./occurrenceCache` (relativo a `app/(app)/escalas/`) ou `@app/(app)/escalas/occurrenceCache` (nos testes).

- [ ] **Step 1: Escrever o teste que falha**

Cria `tests/unit/patchOccurrenceSlot.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { patchOccurrenceSlot, type Item } from "@app/(app)/escalas/occurrenceCache";

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
      },
      {
        slotId: "slot-2",
        role: "Bateria",
        allocatedUserId: null,
        allocatedName: null,
        allocationId: null,
        allocatedStatus: null,
        checkedIn: false,
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
};

describe("patchOccurrenceSlot", () => {
  it("atualiza so a vaga certa dentro da ocorrencia certa", () => {
    const items = [makeItem()];
    const result = patchOccurrenceSlot(items, "occ-1", "slot-1", PATCH);
    expect(result[0].slots[0]).toMatchObject(PATCH);
    expect(result[0].slots[1].allocatedUserId).toBeNull();
  });

  it("nao mexe em ocorrencias diferentes (mesma referencia)", () => {
    const outraOcorrencia = makeItem({ occurrenceId: "occ-2" });
    const items = [makeItem(), outraOcorrencia];
    const result = patchOccurrenceSlot(items, "occ-1", "slot-1", PATCH);
    expect(result[1]).toBe(outraOcorrencia);
  });

  it("nao muta a lista original", () => {
    const items = [makeItem()];
    const result = patchOccurrenceSlot(items, "occ-1", "slot-1", PATCH);
    expect(result).not.toBe(items);
    expect(items[0].slots[0].allocatedUserId).toBeNull();
  });

  it("ignora slotId inexistente sem quebrar", () => {
    const items = [makeItem()];
    const result = patchOccurrenceSlot(items, "occ-1", "slot-inexistente", PATCH);
    expect(result[0].slots.every((s) => s.allocatedUserId === null)).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha pelo motivo certo**

Run: `npm run test -- tests/unit/patchOccurrenceSlot.test.ts`
Expected: FAIL com `Cannot find module '@app/(app)/escalas/occurrenceCache'` (o módulo ainda não existe — não é falha de asserção).

- [ ] **Step 3: Implementar o módulo**

Cria `app/(app)/escalas/occurrenceCache.ts`:

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
  allocatedUserId: string;
  allocatedName: string;
  allocationId: string;
  allocatedStatus: AllocationStatus;
  checkedIn: boolean;
};

// Atualiza uma vaga especifica dentro da lista de ocorrencias do mes, sem
// tocar o banco — usado apos allocate/reassign pra refletir 1 vaga na tela
// sem re-buscar o mes inteiro (que era a 2a requisicao por selecao).
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
Expected: PASS, 4 testes.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/escalas/occurrenceCache.ts tests/unit/patchOccurrenceSlot.test.ts
git commit -m "feat: modulo puro pra atualizar 1 vaga do calendario sem refetch"
```

---

### Task 2: Server Actions devolvem `id`/`status` da alocação

**Files:**
- Modify: `app/(app)/escalas/actions.ts:81-108`

**Interfaces:**
- Consumes: `allocateVolunteer`/`reassignAllocation` de `@/modules/scheduling/services/allocateVolunteer` — ambas já devolvem o registro `Allocation` do Prisma (`{ id, status, ... }`), nenhuma mudança nesse módulo.
- Produces: `allocateAction` e `reassignAllocationAction` agora retornam `Promise<{ ok: true; allocation: { id: string; status: AllocationStatus } } | { ok: false; code: ActionCode; ref: string }>`. Task 4 (`OccurrenceRow.tsx`) consome `res.allocation.id` e `res.allocation.status` no branch de sucesso.

Não há lógica pura nova aqui (é só repassar o retorno que a service já dá) — sem novo teste unitário; a garantia vem do `typecheck` e da suíte completa continuar verde.

- [ ] **Step 1: Editar `allocateAction`**

Em `app/(app)/escalas/actions.ts`, troca:

```ts
export async function allocateAction(
  slotId: string,
  userId: string,
  override = false,
): Promise<{ ok: true } | { ok: false; code: ActionCode; ref: string }> {
  try {
    await allocateVolunteer({ slotId, userId, override });
    revalidatePath("/escalas");
    return { ok: true };
  } catch (e) {
    return handleActionError("escalas.allocate", e, { slotId, userId });
  }
}
```

por:

```ts
export async function allocateAction(
  slotId: string,
  userId: string,
  override = false,
): Promise<
  | { ok: true; allocation: { id: string; status: AllocationStatus } }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const allocation = await allocateVolunteer({ slotId, userId, override });
    revalidatePath("/escalas");
    return { ok: true, allocation: { id: allocation.id, status: allocation.status } };
  } catch (e) {
    return handleActionError("escalas.allocate", e, { slotId, userId });
  }
}
```

- [ ] **Step 2: Editar `reassignAllocationAction`** com o mesmo padrão

Troca:

```ts
export async function reassignAllocationAction(
  slotId: string,
  userId: string,
  override = false,
): Promise<{ ok: true } | { ok: false; code: ActionCode; ref: string }> {
  try {
    await reassignAllocation({ slotId, userId, override });
    revalidatePath("/escalas");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return handleActionError("escalas.reassign", e, { slotId, userId });
  }
}
```

por:

```ts
export async function reassignAllocationAction(
  slotId: string,
  userId: string,
  override = false,
): Promise<
  | { ok: true; allocation: { id: string; status: AllocationStatus } }
  | { ok: false; code: ActionCode; ref: string }
> {
  try {
    const allocation = await reassignAllocation({ slotId, userId, override });
    revalidatePath("/escalas");
    revalidatePath("/");
    return { ok: true, allocation: { id: allocation.id, status: allocation.status } };
  } catch (e) {
    return handleActionError("escalas.reassign", e, { slotId, userId });
  }
}
```

- [ ] **Step 3: Adicionar o import de `AllocationStatus`**

No topo de `app/(app)/escalas/actions.ts`, junto dos outros imports:

```ts
import type { AllocationStatus } from "@prisma/client";
```

- [ ] **Step 4: Rodar typecheck**

Run: `npm run typecheck`
Expected: sem erros. Se `OccurrenceRow.tsx` (ainda não mudado nesta task) reclamar de tipo no `.then`/uso do retorno de `allocateAction`, é esperado — a Task 4 corrige o consumidor. Se o erro aparecer em outro arquivo, investigar antes de seguir.

- [ ] **Step 5: Rodar a suite inteira pra garantir que nada quebrou**

Run: `npm run test`
Expected: todos os testes existentes continuam PASS (nenhum teste unitário toca `allocateAction` diretamente — é Server Action, não função pura — então essa mudança não tem teste dedicado, só a garantia de tipo).

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/escalas/actions.ts
git commit -m "feat: allocateAction e reassignAllocationAction devolvem id/status da alocacao"
```

---

### Task 3: `EscalaCalendar` usa `occurrenceCache` e ganha `patchSlot`

**Files:**
- Modify: `app/(app)/escalas/EscalaCalendar.tsx`

**Interfaces:**
- Consumes: `patchOccurrenceSlot`, `type Item`, `type Slot`, `type SlotPatch` de `./occurrenceCache` (Task 1).
- Produces: `OccurrenceRow` (consumido na Task 4) recebe uma nova prop `onAllocated: (slotId: string, patch: SlotPatch) => void`, além da já existente `onChanged: () => void`.

- [ ] **Step 1: Remover os tipos locais duplicados e importar de `occurrenceCache`**

Em `app/(app)/escalas/EscalaCalendar.tsx`, troca:

```tsx
import { EmptyState } from "@/ui/EmptyState";
import { OccurrenceRow } from "./OccurrenceRow";
import { loadMonthAction } from "./actions";
import type { AllocationStatus } from "@prisma/client";

type Slot = {
  slotId: string;
  role: string;
  allocatedUserId: string | null;
  allocatedName: string | null;
  allocationId: string | null;
  allocatedStatus: AllocationStatus | null;
  checkedIn: boolean;
};
type Item = {
  occurrenceId: string;
  scheduleId: string;
  ministryId: string;
  dayKey: string; // yyyy-MM-dd
  title: string;
  when: string;
  slots: Slot[];
};
```

por:

```tsx
import { EmptyState } from "@/ui/EmptyState";
import { OccurrenceRow } from "./OccurrenceRow";
import { loadMonthAction } from "./actions";
import { patchOccurrenceSlot, type Item, type SlotPatch } from "./occurrenceCache";
```

(o tipo `Slot` não é usado diretamente neste arquivo — só `Item`, que já inclui `slots: Slot[]` internamente.)

- [ ] **Step 2: Adicionar `patchSlot` ao lado de `refreshCurrentMonth`**

Depois de:

```tsx
  async function refreshCurrentMonth() {
    const items = await loadMonthAction(year, month);
    setCache((prev) => new Map(prev).set(key, items));
  }
```

adiciona:

```tsx
  // Atualiza 1 vaga no cache local sem re-buscar o mes — usado apos
  // allocate/reassign, que ja devolvem o resultado da propria Server Action.
  function patchSlot(occurrenceId: string, slotId: string, patch: SlotPatch) {
    setCache((prev) => {
      const items = prev.get(key);
      if (!items) return prev;
      return new Map(prev).set(key, patchOccurrenceSlot(items, occurrenceId, slotId, patch));
    });
  }
```

- [ ] **Step 3: Passar `onAllocated` pro `OccurrenceRow`**

Troca:

```tsx
            <OccurrenceRow
              key={o.occurrenceId}
              occurrenceId={o.occurrenceId}
              scheduleId={o.scheduleId}
              title={o.title}
              when={o.when}
              slots={o.slots}
              canManage={manageableMinistryIds.includes(o.ministryId)}
              isToday={o.dayKey === todayKey}
              onChanged={refreshCurrentMonth}
            />
```

por:

```tsx
            <OccurrenceRow
              key={o.occurrenceId}
              occurrenceId={o.occurrenceId}
              scheduleId={o.scheduleId}
              title={o.title}
              when={o.when}
              slots={o.slots}
              canManage={manageableMinistryIds.includes(o.ministryId)}
              isToday={o.dayKey === todayKey}
              onChanged={refreshCurrentMonth}
              onAllocated={(slotId, patch) => patchSlot(o.occurrenceId, slotId, patch)}
            />
```

- [ ] **Step 4: Rodar typecheck**

Run: `npm run typecheck`
Expected: erro esperado em `OccurrenceRow.tsx` reclamando que a prop `onAllocated` não existe no tipo — corrigido na Task 4. Nenhum outro erro deve aparecer.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/escalas/EscalaCalendar.tsx
git commit -m "feat: EscalaCalendar aplica patch local de vaga em vez de refetch"
```

---

### Task 4: `OccurrenceRow` para de disparar refetch no sucesso da alocação

**Files:**
- Modify: `app/(app)/escalas/OccurrenceRow.tsx`

**Interfaces:**
- Consumes: `type Slot` de `./occurrenceCache` (Task 1); `props.onAllocated` (Task 3); `res.allocation.{id,status}` de `allocateAction`/`reassignAllocationAction` (Task 2).

- [ ] **Step 1: Importar `Slot` de `occurrenceCache` e remover a definição local**

Troca:

```tsx
import { AllocatePicker } from "./AllocatePicker";
import { MENSAGENS } from "@/lib/actionError";
import type { AllocationStatus } from "@prisma/client";

type Slot = {
  slotId: string;
  role: string;
  allocatedUserId: string | null;
  allocatedName: string | null;
  allocationId: string | null;
  allocatedStatus: AllocationStatus | null;
  checkedIn: boolean;
};

type NoteMode = "assign" | "reassign";
```

por:

```tsx
import { AllocatePicker } from "./AllocatePicker";
import { MENSAGENS } from "@/lib/actionError";
import type { Slot, SlotPatch } from "./occurrenceCache";

type NoteMode = "assign" | "reassign";
```

- [ ] **Step 2: Adicionar a prop `onAllocated`**

Troca:

```tsx
export function OccurrenceRow(props: {
  occurrenceId: string;
  scheduleId: string;
  title: string;
  when: string;
  slots: Slot[];
  canManage: boolean;
  isToday: boolean;
  onChanged: () => void;
}) {
```

por:

```tsx
export function OccurrenceRow(props: {
  occurrenceId: string;
  scheduleId: string;
  title: string;
  when: string;
  slots: Slot[];
  canManage: boolean;
  isToday: boolean;
  onChanged: () => void;
  onAllocated: (slotId: string, patch: SlotPatch) => void;
}) {
```

- [ ] **Step 3: `runAllocation` monta o patch local em vez de chamar `onChanged`**

Troca:

```tsx
  function runAllocation(mode: NoteMode, slotId: string, userId: string, override = false) {
    if (!userId) return;
    start(async () => {
      const action = mode === "assign" ? allocateAction : reassignAllocationAction;
      const res = await action(slotId, userId, override);
      if (!res.ok) {
        if (res.code === "UNAVAILABILITY_BLOCKED") {
          setNote({ slotId, message: `${MENSAGENS.UNAVAILABILITY_BLOCKED} Alocar mesmo assim?`, retryUserId: userId, mode });
        } else {
          setNote({ slotId, message: `${MENSAGENS[res.code]} · cód. ${res.ref}`, mode });
        }
      } else {
        setNote(null);
        setReassigningSlotId(null);
        props.onChanged();
      }
    });
  }
```

por:

```tsx
  function runAllocation(mode: NoteMode, slotId: string, userId: string, override = false) {
    if (!userId) return;
    start(async () => {
      const action = mode === "assign" ? allocateAction : reassignAllocationAction;
      const res = await action(slotId, userId, override);
      if (!res.ok) {
        if (res.code === "UNAVAILABILITY_BLOCKED") {
          setNote({ slotId, message: `${MENSAGENS.UNAVAILABILITY_BLOCKED} Alocar mesmo assim?`, retryUserId: userId, mode });
        } else {
          setNote({ slotId, message: `${MENSAGENS[res.code]} · cód. ${res.ref}`, mode });
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
      });
      setNote(null);
      setReassigningSlotId(null);
    });
  }
```

`props.onChanged()` continua existindo só em `del()` (exclusão de ocorrência) — essa função não muda nesta task.

- [ ] **Step 4: Rodar typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 5: Rodar a suite inteira**

Run: `npm run test`
Expected: todos os testes PASS (nenhum teste unitário renderiza `OccurrenceRow` — é client component sem lógica pura própria além do que já foi extraído pra `occurrenceCache.ts` na Task 1).

- [ ] **Step 6: Rodar lint**

Run: `npm run lint`
Expected: `No ESLint warnings or errors`.

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/escalas/OccurrenceRow.tsx
git commit -m "fix: aloca vaga sem re-buscar o mes inteiro do calendario"
```

---

### Task 5: Verificação manual end-to-end

**Files:** nenhum (só verificação).

- [ ] **Step 1: Subir o dev server**

Run: `npm run dev`

- [ ] **Step 2: Abrir DevTools → Network, filtrar por Fetch/XHR, ir em `/escalas`**

Abrir uma ocorrência com pelo menos 2 vagas vazias (ou criar uma escala nova em `/escalas/nova` com 2+ funções, esperar materializar).

- [ ] **Step 3: Alocar uma pessoa numa vaga vazia**

Confirmar no Network: **1 única requisição** (a Server Action de allocate) — não deve mais aparecer uma segunda chamada de `loadMonthAction` em seguida. O nome deve aparecer na tela imediatamente, com o badge "aguardando confirmação" (porque toda alocação nova é `PENDING`).

- [ ] **Step 4: Trocar quem está numa vaga já preenchida (reassign)**

Clicar "trocar", escolher outra pessoa, confirmar o diálogo. Confirmar: 1 única requisição, nome atualizado na hora, badge "aguardando confirmação" continua aparecendo (nova alocação também é `PENDING`).

- [ ] **Step 5: Testar o caminho de indisponibilidade**

Alocar alguém marcado como indisponível → aparece "Indisponível. Alocar mesmo assim?" → clicar "Sim" → confirma que aloca e atualiza local igual aos passos anteriores (esse caminho reusa `runAllocation`, então já deveria funcionar, mas confirmar visualmente).

- [ ] **Step 6: Testar exclusão de ocorrência ainda funciona**

"Excluir esta" numa ocorrência → confirma que a ocorrência desaparece da lista (esse caminho ainda usa `onChanged`/refetch, sem mudança).

- [ ] **Step 7: Rodar a verificação completa de código**

Run: `npm run test && npm run typecheck && npm run lint`
Expected: todos os três passam.

- [ ] **Step 8: Encerrar o dev server**

Run: `Ctrl+C` no terminal onde `npm run dev` está rodando (ou matar o processo).

---

## Self-Review

**Cobertura da spec:** o design tinha 4 pontos — (1) action retorna `allocation.{id,status}`, (2) `patchSlot` em `EscalaCalendar`, (3) `OccurrenceRow` usa `onAllocated` em vez de `onChanged` no sucesso, (4) `checkedIn`/`allocatedStatus` fiéis ao que o banco sempre grava numa alocação nova. Tasks 2, 3, 4 cobrem 1-3; o ponto 4 está embutido no patch fixo (`checkedIn: false`, `allocatedStatus: res.allocation.status` vindo do banco, não chutado) na Task 4 Step 3. Escopo de exclusão de ocorrência explicitamente fora — Task 5 Step 6 confirma que não regrediu.

**Placeholder scan:** nenhum "TBD"/"implementar depois" — todo código é literal e completo.

**Consistência de tipos:** `SlotPatch` definido na Task 1 (`allocatedUserId: string`, `allocatedName: string`, `allocationId: string`, `allocatedStatus: AllocationStatus`, `checkedIn: boolean`) é o mesmo shape usado no `props.onAllocated(slotId, { ... })` da Task 4 e no parâmetro de `patchSlot`/`patchOccurrenceSlot` das Tasks 1 e 3 — nomes e tipos batem em todas as tasks.
