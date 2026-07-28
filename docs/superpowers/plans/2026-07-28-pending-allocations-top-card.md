# Pending Allocations Top Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dedicated top card na tela home para confirmações de escalas pendentes, separando-as das escalas confirmadas.

**Architecture:** Um novo Client Component `PendingConfirmationsCard` gerenciará a interface e as ações para os itens pendentes (com paginação/swipe se houver múltiplos). A página principal (`page.tsx`) filtrará a lista de escalas em `pendingItems` e `confirmedItems`. Componentes existentes (`AllocationActions`, `UpcomingCarousel`) serão simplificados para não precisarem mais tratar o estado visual PENDING.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS.

## Global Constraints

- Design UX: O card de pendência deve estar no topo, destacado, usando botões balanceados ("Confirmar" como primary e "Não posso" como secondary).
- Nomenclatura: Componentes e tipos já existentes (`UpcomingItem`, `AllocationActions`, `fmtDate`) devem ser usados sem alteração de assinaturas.
- Componentes Base: Usar `<Card>`, `<Button>` e `<Badge>` da pasta `@/ui`.
- Estabilidade: Manter o fallback gracefully caso o usuário rejeite a última escala e haja mudanças no índice do carrossel.

---

### Task 1: Create `PendingConfirmationsCard` Component

**Files:**
- Create: `app/(app)/PendingConfirmationsCard.tsx`

**Interfaces:**
- Consumes: `UpcomingItem` from `@/modules/scheduling/services/getMySchedule`
- Consumes: `confirmAllocationAction`, `declineAllocationAction` from `./respondAllocationActions`
- Produces: `PendingConfirmationsCard` React component taking `{ items: UpcomingItem[] }`

- [ ] **Step 1: Criar o arquivo base e imports**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { useConfirm } from "@/ui/ConfirmDialog";
import { confirmAllocationAction, declineAllocationAction } from "./respondAllocationActions";
import { fmtDate, fmtTime } from "@/lib/time";
import type { UpcomingItem } from "@/modules/scheduling/services/getMySchedule";

export function PendingConfirmationsCard({ items }: { items: UpcomingItem[] }) {
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const { confirm, dialog } = useConfirm();

  if (!items || items.length === 0) return null;

  // Garantir que o índice ativo não ultrapasse caso a lista diminua
  const safeActive = Math.min(active, items.length - 1);
  const currentItem = items[safeActive];
```

- [ ] **Step 2: Implementar a ação de recusa**

```tsx
  async function decline(allocationId: string) {
    const ok = await confirm({
      title: "Recusar esta escala?",
      description: "A vaga volta a ficar aberta pros outros voluntários do ministério e o líder é avisado.",
      confirmLabel: "Recusar",
      tone: "danger",
    });
    if (ok) {
      start(async () => {
        await declineAllocationAction(allocationId);
        if (safeActive > 0 && safeActive === items.length - 1) {
          setActive(safeActive - 1);
        }
      });
    }
  }
```

- [ ] **Step 3: Implementar o JSX**

```tsx
  return (
    <div className="mb-8">
      {dialog}
      <div className="flex items-center justify-between mb-3">
        <h2 className="eyebrow">Você foi escalado!</h2>
        {items.length > 1 && (
          <span className="text-xs font-medium text-text-muted">
            {safeActive + 1} de {items.length}
          </span>
        )}
      </div>

      <div 
        className="flex overflow-x-auto snap-x snap-mandatory pb-1 gap-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const index = Math.round(el.scrollLeft / el.offsetWidth);
          setActive(Math.min(items.length - 1, Math.max(0, index)));
        }}
      >
        {items.map((item) => (
          <div key={item.allocationId} className="w-full shrink-0 snap-center">
            <Card className="flex flex-col border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-primary">{item.ministry}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xl font-semibold text-text">{item.role}</p>
                    <Badge tone="info" className="text-[10px] normal-case! tracking-normal! px-1.5 py-0.5">
                      Aguardando confirmação
                    </Badge>
                  </div>
                  <p className="text-sm text-text-muted mt-1">{fmtDate(item.date)}</p>
                </div>
                <p className="font-title text-3xl text-primary">{fmtTime(item.date)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-border/50">
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => decline(item.allocationId)}
                >
                  Não posso
                </Button>
                <Button
                  variant="primary"
                  disabled={pending}
                  onClick={() => start(() => confirmAllocationAction(item.allocationId))}
                >
                  Confirmar
                </Button>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/PendingConfirmationsCard.tsx
git commit -m "feat(home): create PendingConfirmationsCard component"
```

### Task 2: Simplify `AllocationActions`

**Files:**
- Modify: `app/(app)/AllocationActions.tsx`

**Interfaces:**
- Consumes: Existing `AllocationActions` component.
- Produces: Component that no longer processes the `PENDING` state inline, leaving only check-in and swap logic.

- [ ] **Step 1: Remover as importações não mais utilizadas**

No arquivo `app/(app)/AllocationActions.tsx`, remova as linhas:
```tsx
import { useConfirm } from "@/ui/ConfirmDialog";
import { confirmAllocationAction, declineAllocationAction, checkInAllocationAction } from "./respondAllocationActions";
```
E substitua por apenas:
```tsx
import { checkInAllocationAction } from "./respondAllocationActions";
```
Remova também a inicialização do `useConfirm` dentro do componente (`const { confirm, dialog } = useConfirm();`).

- [ ] **Step 2: Remover o bloco PENDING e a função decline**

Remova a função `decline` inteira e remova o seguinte bloco:
```tsx
  if (props.status === "PENDING") {
    return (
      <div className="flex items-center gap-2">
        {dialog}
        <button
          className="text-xs text-danger disabled:opacity-40"
          disabled={pending}
          onClick={decline}
        >
          Não posso
        </button>
        <Button
          className="py-1.5 px-3 text-xs"
          disabled={pending}
          onClick={() => start(() => confirmAllocationAction(props.allocationId))}
        >
          Confirmar
        </Button>
      </div>
    );
  }
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/AllocationActions.tsx
git commit -m "refactor(home): remove pending state logic from AllocationActions"
```

### Task 3: Simplify `UpcomingCarousel`

**Files:**
- Modify: `app/(app)/UpcomingCarousel.tsx`

**Interfaces:**
- Consumes: Existing `UpcomingCarousel` component.
- Produces: Component without the `PENDING` badge check.

- [ ] **Step 1: Remover a renderização da Badge**

No arquivo `app/(app)/UpcomingCarousel.tsx`, remova a checagem de `it.status === "PENDING"` e a Badge.
De:
```tsx
              <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
                <div>
                  {it.status === "PENDING" && (
                    <Badge tone="info" className="normal-case! tracking-normal!">
                      Aguardando confirmação
                    </Badge>
                  )}
                </div>
                <AllocationActions
```
Para:
```tsx
              <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
                <div />
                <AllocationActions
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/UpcomingCarousel.tsx
git commit -m "refactor(home): remove pending badge logic from UpcomingCarousel"
```

### Task 4: Integrate `PendingConfirmationsCard` into `HomePage`

**Files:**
- Modify: `app/(app)/page.tsx`

**Interfaces:**
- Consumes: `PendingConfirmationsCard`
- Consumes: `getMySchedule` results

- [ ] **Step 1: Importar o novo componente**

Adicione no topo de `app/(app)/page.tsx`:
```tsx
import { PendingConfirmationsCard } from "./PendingConfirmationsCard";
```

- [ ] **Step 2: Dividir as listas no corpo do componente**

Logo após `const todayKey = dateKey(new Date());`, faça a separação:
```tsx
  const pendingItems = items.filter(it => it.status === "PENDING");
  const confirmedItems = items.filter(it => it.status !== "PENDING");
```

- [ ] **Step 3: Substituir a renderização da lista principal**

Substitua todo o bloco `{items.length === 0 ? ... : ...}` pelo novo fluxo com `pendingItems` e `confirmedItems`:

```tsx
      {pendingItems.length > 0 && <PendingConfirmationsCard items={pendingItems} />}

      {confirmedItems.length === 0 ? (
        <EmptyState
          title="Nenhuma escala próxima"
          subtitle="Quando você for escalado e confirmar, aparecerá aqui."
        />
      ) : (
        <>
          <h2 className="eyebrow mb-3">Próxima escala</h2>
          <Card className="mb-8 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow text-primary">{confirmedItems[0].ministry}</p>
                <p className="text-xl text-text">{confirmedItems[0].role}</p>
                <p className="text-sm text-text-muted">{fmtDate(confirmedItems[0].date)}</p>
              </div>
              <p className="font-title text-3xl text-primary">{fmtTime(confirmedItems[0].date)}</p>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
              <div />
              <AllocationActions
                allocationId={confirmedItems[0].allocationId}
                status={confirmedItems[0].status}
                isToday={dateKey(confirmedItems[0].date) === todayKey}
                checkedIn={!!confirmedItems[0].checkedInAt}
                hasSwapOpen={confirmedItems[0].hasSwapOpen}
              />
            </div>
          </Card>

          {confirmedItems.length > 1 && (
            <>
              <h2 className="eyebrow mb-3">Depois</h2>
              <UpcomingCarousel items={confirmedItems.slice(1)} todayKey={todayKey} />
            </>
          )}
        </>
      )}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/page.tsx
git commit -m "feat(home): integrate PendingConfirmationsCard and separate schedule lists"
```
