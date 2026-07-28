# Alocação de escala — bottom sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a linha de aloação/tags espremida em cada vaga de `OccurrenceRow.tsx` por uma linha resumida tocável que abre um bottom sheet, e colapsar as 4 ações do header do card num menu `⋮`.

**Architecture:** Três componentes novos e reutilizáveis (`BottomSheet` primitivo em `src/ui`, `OccurrenceMenu` e `SlotDetailSheet` específicos de escalas) compostos dentro de `OccurrenceRow.tsx`, que perde toda a lógica de renderização inline de picker/ações e passa a só orquestrar estado (`activeSlotId`, `note`, candidatos) e repassar callbacks.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4 (tokens do tema), `framer-motion` (já usado em `ConfirmDialog.tsx`), `lucide-react`.

## Global Constraints

- Toda UI em pt-BR (labels, mensagens) — sem exceção.
- Cores só via tokens do tema (`bg-surface`, `text-text-muted`, `text-primary`, `text-danger`, `border-border`…) — nunca cor crua do Tailwind.
- Todo elemento tocável dentro do bottom sheet e do menu `⋮` tem área mínima de toque 44×44px (`min-h-11` ou `h-11 w-11`).
- Bottom sheet precisa de handle/botão de fechar visível no topo (não fullscreen, não sem affordance de dispensa) — decisão validada contra NN/G em `docs/superpowers/specs/2026-07-28-ux-escalas-gestao-home-design.md`.
- `AllocatePicker.tsx` (`app/(app)/escalas/AllocatePicker.tsx`) **não é deletado nem alterado** — é usado por `app/(app)/admin/convidados/GuestRow.tsx` (fluxo "vincular a um usuário", não relacionado a esta mudança). Só o uso dele *dentro de* `OccurrenceRow.tsx` é removido.
- Nenhuma mudança em `src/modules/scheduling/**` ou nas Server Actions em `app/(app)/escalas/actions.ts` — essa mudança é só de UI/apresentação sobre lógica já existente e testada.
- Mudança é puramente visual/estrutural (JSX + estado de componente), sem lógica de domínio nova — sem teste unitário novo; cada task verifica com `npm run typecheck` + `npm run lint`, e a task final (Task 4) valida manualmente no `npm run dev`.

---

### Task 1: Primitivo `BottomSheet`

**Files:**
- Create: `src/ui/BottomSheet.tsx`

**Interfaces:**
- Produces: `BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode })` — componente client, default export nomeado `BottomSheet`. Overlay `fixed inset-0`, painel desliza de baixo (`initial={{ y: "100%" }}`), handle no topo (`min-h-11`, `aria-label="Fechar"`) que chama `onClose`. Conteúdo (`children`) fica num `<div className="overflow-y-auto px-4 pb-6">`.

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-no-swipe
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md max-h-[85vh] flex flex-col rounded-t-[2rem] bg-surface ring-1 ring-border shadow-[0_-25px_60px_-15px_rgba(15,23,42,0.35)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="w-full min-h-11 flex items-center justify-center shrink-0"
            >
              <span className="h-1.5 w-10 rounded-full bg-border" />
            </button>
            <div className="overflow-y-auto px-4 pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros novos (componente ainda não tem consumidor — normal não haver warning de "unused").

- [ ] **Step 3: Commit**

```bash
git add src/ui/BottomSheet.tsx
git commit -m "feat(ui): adiciona primitivo BottomSheet"
```

---

### Task 2: `OccurrenceMenu` (menu `⋮` do header)

**Files:**
- Create: `app/(app)/escalas/OccurrenceMenu.tsx`

**Interfaces:**
- Consumes: nada de outras tasks (usa só `next/link` e `lucide-react`).
- Produces: `OccurrenceMenu({ scheduleId, copyLabel, onCopy, onDeleteSingle, onDeleteFromHere, disabled }: { scheduleId: string; copyLabel: string; onCopy: () => void; onDeleteSingle: () => void; onDeleteFromHere: () => void; disabled?: boolean })` — client component com botão `⋮` (`h-11 w-11`) que abre dropdown local (`useState<boolean>`) com 4 itens: copiar (não fecha o menu, pra `copyLabel` poder virar "Copiado!"), editar (`Link` pra `/escalas/{scheduleId}/editar`), excluir esta, excluir daqui em diante.

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical, Pencil } from "lucide-react";

export function OccurrenceMenu(props: {
  scheduleId: string;
  copyLabel: string;
  onCopy: () => void;
  onDeleteSingle: () => void;
  onDeleteFromHere: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" data-no-swipe>
      <button
        type="button"
        aria-label="Mais ações"
        onClick={() => setOpen((v) => !v)}
        className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-text shrink-0"
      >
        <MoreVertical size={18} strokeWidth={1.8} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 rounded-xl bg-surface ring-1 ring-border shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={props.onCopy}
            className="w-full min-h-11 text-left px-4 py-3 text-sm text-text hover:bg-surface-2"
          >
            {props.copyLabel}
          </button>
          <Link
            href={`/escalas/${props.scheduleId}/editar`}
            onClick={() => setOpen(false)}
            className="w-full min-h-11 flex items-center gap-2 px-4 py-3 text-sm text-text hover:bg-surface-2"
          >
            <Pencil size={14} strokeWidth={1.8} />
            Editar
          </Link>
          <button
            type="button"
            disabled={props.disabled}
            onClick={() => {
              setOpen(false);
              props.onDeleteSingle();
            }}
            className="w-full min-h-11 text-left px-4 py-3 text-sm text-danger hover:bg-surface-2 disabled:opacity-40"
          >
            Excluir esta
          </button>
          <button
            type="button"
            disabled={props.disabled}
            onClick={() => {
              setOpen(false);
              props.onDeleteFromHere();
            }}
            className="w-full min-h-11 text-left px-4 py-3 text-sm text-danger hover:bg-surface-2 disabled:opacity-40"
          >
            Excluir daqui em diante
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/escalas/OccurrenceMenu.tsx"
git commit -m "feat(escalas): adiciona menu de acoes do header (OccurrenceMenu)"
```

---

### Task 3: `SlotDetailSheet`

**Files:**
- Create: `app/(app)/escalas/SlotDetailSheet.tsx`
- Test: nenhum automatizado (ver Global Constraints) — verificação manual acontece na Task 4, quando o componente é conectado a dados reais.

**Interfaces:**
- Consumes: `BottomSheet` (Task 1, `src/ui/BottomSheet.tsx`); tipo `Slot` de `./occurrenceCache`; tipo `AllocationCandidate` de `./actions`.
- Produces: `SlotDetailSheet(props)` — client component, default export nomeado. Props exatas:

```ts
type SlotDetailSheetProps = {
  open: boolean;
  slot: Slot | null;
  onClose: () => void;
  candidates: AllocationCandidate[] | null;
  guestNames: string[];
  loading: boolean;
  failed: boolean;
  failedRef: string | null;
  pending: boolean;
  note: { message: string; onOverride?: () => void } | null;
  onRetryCandidates: () => void;
  onPickUser: (userId: string) => void;
  onPickGuest: (name: string) => void;
  onDeactivate: () => void;
};
```

  Task 4 (`OccurrenceRow.tsx`) é responsável por decidir, com base em `slot.allocatedName`, se `onPickUser`/`onPickGuest` disparam alocação ou troca — `SlotDetailSheet` não sabe a diferença, só expõe a interação de escolher alguém.

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { useState } from "react";
import { Badge } from "@/ui/Badge";
import { BottomSheet } from "@/ui/BottomSheet";
import type { AllocationCandidate } from "./actions";
import type { Slot } from "./occurrenceCache";

export function SlotDetailSheet(props: {
  open: boolean;
  slot: Slot | null;
  onClose: () => void;
  candidates: AllocationCandidate[] | null;
  guestNames: string[];
  loading: boolean;
  failed: boolean;
  failedRef: string | null;
  pending: boolean;
  note: { message: string; onOverride?: () => void } | null;
  onRetryCandidates: () => void;
  onPickUser: (userId: string) => void;
  onPickGuest: (name: string) => void;
  onDeactivate: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestName, setGuestName] = useState("");

  const slot = props.slot;
  const filled = !!slot?.allocatedName;
  const showPicker = !filled || picking;

  function submitGuest() {
    const name = guestName.trim();
    if (!name) return;
    props.onPickGuest(name);
    setAddingGuest(false);
    setGuestName("");
  }

  function handleClose() {
    setPicking(false);
    setAddingGuest(false);
    setGuestName("");
    props.onClose();
  }

  return (
    <BottomSheet open={props.open} onClose={handleClose}>
      {slot && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="eyebrow text-text-muted mb-1">{slot.role}</p>
            {!showPicker && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-lg text-text">{slot.allocatedName}</p>
                {slot.isGuest && <Badge tone="info">sem conta</Badge>}
                {!slot.isGuest && slot.allocatedStatus === "PENDING" && (
                  <Badge tone="info">aguardando confirmação</Badge>
                )}
              </div>
            )}
          </div>

          {props.note && (
            <Badge tone="info" className="normal-case! tracking-normal! w-fit">
              {props.note.message}
              {props.note.onOverride && (
                <button
                  className="underline underline-offset-2 ml-1"
                  onClick={props.note.onOverride}
                >
                  Sim
                </button>
              )}
            </Badge>
          )}

          {showPicker ? (
            <div className="flex flex-col gap-1">
              {props.loading && <p className="px-1 py-2 text-sm text-text-muted">Carregando…</p>}
              {props.failed && (
                <div className="px-1 py-2 text-sm text-text-muted">
                  Não deu pra carregar{props.failedRef && ` · cód. ${props.failedRef}`}.{" "}
                  <button
                    className="underline underline-offset-2 text-primary"
                    onClick={props.onRetryCandidates}
                  >
                    Tentar de novo
                  </button>
                </div>
              )}
              {!props.loading && !props.failed && props.candidates?.length === 0 && (
                <p className="px-1 py-2 text-sm text-text-muted">Nenhum voluntário neste ministério.</p>
              )}
              {!props.loading &&
                !props.failed &&
                props.candidates
                  ?.filter((c) => c.userId !== slot.allocatedUserId)
                  .map((c) => (
                    <button
                      key={c.userId}
                      type="button"
                      disabled={props.pending}
                      onClick={() => props.onPickUser(c.userId)}
                      className="w-full min-h-11 flex items-center gap-1.5 px-1 py-2 text-left text-sm text-text hover:bg-surface-2 rounded-lg flex-wrap disabled:opacity-40"
                    >
                      {c.name}
                      {c.unavailable && <Badge tone="danger">Indisponível</Badge>}
                    </button>
                  ))}

              {!!props.guestNames.length && !addingGuest && (
                <div className="border-t border-border pt-1 mt-1">
                  {props.guestNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      disabled={props.pending}
                      onClick={() => props.onPickGuest(name)}
                      className="w-full min-h-11 flex items-center gap-1.5 px-1 py-2 text-left text-sm text-text hover:bg-surface-2 rounded-lg disabled:opacity-40"
                    >
                      {name}
                      <Badge tone="info">sem conta</Badge>
                    </button>
                  ))}
                </div>
              )}

              {addingGuest ? (
                <div className="flex flex-col gap-2 border-t border-border mt-1 pt-3">
                  <input
                    type="text"
                    placeholder="Nome da pessoa"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="field !py-2 text-sm w-full"
                    autoFocus
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={submitGuest}
                      disabled={!guestName.trim() || props.pending}
                      className="min-h-11 text-sm text-primary font-medium disabled:opacity-40"
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingGuest(false)}
                      className="min-h-11 text-sm text-text-muted"
                    >
                      cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingGuest(true)}
                  className="w-full min-h-11 text-left px-1 py-2 text-sm text-primary hover:bg-surface-2 rounded-lg border-t border-border mt-1 pt-3"
                >
                  + Pessoa sem conta
                </button>
              )}

              {filled && (
                <button
                  type="button"
                  onClick={() => setPicking(false)}
                  className="w-full min-h-11 text-center text-sm text-text-muted mt-1"
                >
                  cancelar troca
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4 pt-1">
              <button
                type="button"
                disabled={props.pending}
                onClick={() => setPicking(true)}
                className="min-h-11 text-sm text-primary font-medium disabled:opacity-40"
              >
                Trocar
              </button>
              <button
                type="button"
                disabled={props.pending}
                onClick={props.onDeactivate}
                className="min-h-11 text-sm text-danger disabled:opacity-40"
              >
                Desativar vaga
              </button>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros novos (componente ainda não tem consumidor real).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/escalas/SlotDetailSheet.tsx"
git commit -m "feat(escalas): adiciona SlotDetailSheet (bottom sheet de alocacao de vaga)"
```

---

### Task 4: Conectar tudo em `OccurrenceRow.tsx`

**Files:**
- Modify: `app/(app)/escalas/OccurrenceRow.tsx` (reescrita completa)

**Interfaces:**
- Consumes: `OccurrenceMenu` (Task 2), `SlotDetailSheet` (Task 3), `Slot`/`SlotPatch`/`Item` de `./occurrenceCache`, todas as actions já existentes em `./actions`, `useConfirm` de `@/ui/ConfirmDialog`.
- Produces: mesma assinatura pública de `OccurrenceRow(props)` que `EscalaCalendar.tsx` já consome (`occurrenceId`, `scheduleId`, `title`, `when`, `slots`, `canManage`, `isToday`, `onChanged`, `onAllocated`, `onActiveChanged`) — **sem mudança de interface externa**, `EscalaCalendar.tsx` não precisa ser tocado.

- [ ] **Step 1: Reescrever o arquivo**

```tsx
"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { useConfirm } from "@/ui/ConfirmDialog";
import {
  allocateAction,
  reassignAllocationAction,
  allocateGuestAction,
  reassignGuestAction,
  setSlotActiveAction,
  deleteOccurrenceAction,
  getOccurrenceCandidatesAction,
  type AllocationCandidate,
} from "./actions";
import { OccurrenceMenu } from "./OccurrenceMenu";
import { SlotDetailSheet } from "./SlotDetailSheet";
import { MENSAGENS } from "@/lib/actionError";
import type { Slot, SlotPatch } from "./occurrenceCache";

type NoteMode = "assign" | "reassign";

type Note = {
  message: string;
  retryUserId?: string;
  mode: NoteMode;
};

function buildWhatsAppText(title: string, when: string, slots: Slot[]): string {
  const linhas = slots
    .filter((s) => s.active)
    .map((s) => `- ${s.role}: ${s.allocatedName ?? "— vaga aberta"}`);
  return `*${title}*\n${when}\n\n${linhas.join("\n")}`;
}

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
  onActiveChanged: (slotId: string, active: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<Note | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [copyNote, setCopyNote] = useState(false);
  const { confirm, dialog } = useConfirm();

  // Candidatos sao os mesmos pra todas as vagas desta ocorrencia (mesmo
  // ministerio + data) — busca uma vez so, na primeira vez que algum sheet
  // abre, e reusa pras demais vagas em vez de refazer a query por vaga.
  const [candidates, setCandidates] = useState<AllocationCandidate[] | null>(null);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesFailed, setCandidatesFailed] = useState(false);
  const [candidatesRef, setCandidatesRef] = useState<string | null>(null);

  const activeSlot = props.slots.find((s) => s.slotId === activeSlotId) ?? null;

  function ensureCandidates() {
    if (candidates || candidatesLoading) return;
    setCandidatesFailed(false);
    setCandidatesRef(null);
    setCandidatesLoading(true);
    getOccurrenceCandidatesAction(props.occurrenceId)
      .then((res) => {
        if (res.ok) {
          setCandidates(res.candidates);
          setGuestNames(res.guestNames);
        } else {
          setCandidatesFailed(true);
          setCandidatesRef(res.ref);
        }
      })
      .catch(() => setCandidatesFailed(true))
      .finally(() => setCandidatesLoading(false));
  }

  function openSheet(slotId: string) {
    setActiveSlotId(slotId);
    setNote(null);
    ensureCandidates();
  }

  function closeSheet() {
    setActiveSlotId(null);
    setNote(null);
  }

  function runAllocation(mode: NoteMode, slotId: string, userId: string, override = false) {
    if (!userId) return;
    start(async () => {
      const action = mode === "assign" ? allocateAction : reassignAllocationAction;
      const res = await action(slotId, userId, override);
      if (!res.ok) {
        if (res.code === "UNAVAILABILITY_BLOCKED") {
          setNote({ message: `${MENSAGENS.UNAVAILABILITY_BLOCKED} Alocar mesmo assim?`, retryUserId: userId, mode });
        } else {
          setNote({ message: `${MENSAGENS[res.code]} · cód. ${res.ref}`, mode });
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
      closeSheet();
    });
  }

  async function reassign(slotId: string, currentName: string | null, userId: string) {
    const candidate = candidates?.find((c) => c.userId === userId);
    const ok = await confirm({
      title: "Trocar alocação?",
      description: `Tira ${currentName ?? "quem está alocado"} e coloca ${candidate?.name ?? "a pessoa escolhida"} nesta vaga.`,
      confirmLabel: "Trocar",
    });
    if (!ok) return;
    runAllocation("reassign", slotId, userId);
  }

  function handlePickUser(userId: string) {
    if (!activeSlot) return;
    if (activeSlot.allocatedName) {
      reassign(activeSlot.slotId, activeSlot.allocatedName, userId);
    } else {
      runAllocation("assign", activeSlot.slotId, userId);
    }
  }

  function allocateGuestHandler(slotId: string, name: string) {
    start(async () => {
      const res = await allocateGuestAction(slotId, name);
      if (!res.ok) {
        setNote({ message: `${MENSAGENS[res.code]} · cód. ${res.ref}`, mode: "assign" });
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
      closeSheet();
    });
  }

  function reassignGuestHandler(slotId: string, name: string) {
    start(async () => {
      const res = await reassignGuestAction(slotId, name);
      if (!res.ok) {
        setNote({ message: `${MENSAGENS[res.code]} · cód. ${res.ref}`, mode: "reassign" });
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
      closeSheet();
    });
  }

  async function reassignToGuestHandler(slotId: string, currentName: string | null, name: string) {
    const ok = await confirm({
      title: "Trocar alocação?",
      description: `Tira ${currentName ?? "quem está alocado"} e coloca ${name} (sem conta) nesta vaga.`,
      confirmLabel: "Trocar",
    });
    if (!ok) return;
    reassignGuestHandler(slotId, name);
  }

  function handlePickGuest(name: string) {
    if (!activeSlot) return;
    if (activeSlot.allocatedName) {
      reassignToGuestHandler(activeSlot.slotId, activeSlot.allocatedName, name);
    } else {
      allocateGuestHandler(activeSlot.slotId, name);
    }
  }

  async function deactivateSlot(slot: Slot) {
    const ok = await confirm({
      title: "Desativar vaga?",
      description: slot.allocatedName
        ? `Essa função não existe nesse culto. Some da lista e tira ${slot.allocatedName} dela.`
        : "Essa função não existe nesse culto. Some da lista até você reativar.",
      confirmLabel: "Desativar",
      tone: "danger",
    });
    if (!ok) return;
    start(async () => {
      const res = await setSlotActiveAction(slot.slotId, false);
      if (!res.ok) {
        setNote({ message: `${MENSAGENS[res.code]} · cód. ${res.ref}`, mode: "assign" });
        return;
      }
      props.onActiveChanged(slot.slotId, false);
      closeSheet();
    });
  }

  function reactivateSlot(slotId: string) {
    start(async () => {
      const res = await setSlotActiveAction(slotId, true);
      if (!res.ok) return;
      props.onActiveChanged(slotId, true);
    });
  }

  function copyWhatsAppText() {
    const text = buildWhatsAppText(props.title, props.when, props.slots);
    navigator.clipboard.writeText(text);
    setCopyNote(true);
    setTimeout(() => setCopyNote(false), 2000);
  }

  async function del(scope: "SINGLE" | "FROM_HERE") {
    const ok = await confirm(
      scope === "SINGLE"
        ? {
            title: "Excluir esta escala?",
            description: `Remove só a ocorrência de "${props.title}" em ${props.when}. Não afeta as próximas.`,
            confirmLabel: "Excluir",
            tone: "danger",
          }
        : {
            title: "Excluir daqui em diante?",
            description: `Cancela "${props.title}" a partir de ${props.when} e todas as ocorrências futuras da série. Não afeta datas passadas.`,
            confirmLabel: "Excluir todas",
            tone: "danger",
          },
    );
    if (!ok) return;
    start(async () => {
      await deleteOccurrenceAction(props.occurrenceId, scope);
      props.onChanged();
    });
  }

  return (
    <li>
      {dialog}
      <SlotDetailSheet
        open={activeSlotId !== null}
        slot={activeSlot}
        onClose={closeSheet}
        candidates={candidates}
        guestNames={guestNames}
        loading={candidatesLoading}
        failed={candidatesFailed}
        failedRef={candidatesRef}
        pending={pending}
        note={
          note
            ? {
                message: note.message,
                onOverride:
                  note.retryUserId && activeSlot
                    ? () => runAllocation(note.mode, activeSlot.slotId, note.retryUserId!, true)
                    : undefined,
              }
            : null
        }
        onRetryCandidates={ensureCandidates}
        onPickUser={handlePickUser}
        onPickGuest={handlePickGuest}
        onDeactivate={() => activeSlot && deactivateSlot(activeSlot)}
      />
      <Card>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-text">{props.title}</p>
            <p className="text-xs text-text-muted">{props.when}</p>
          </div>
          {props.canManage && (
            <OccurrenceMenu
              scheduleId={props.scheduleId}
              copyLabel={copyNote ? "Copiado!" : "Copiar p/ WhatsApp"}
              onCopy={copyWhatsAppText}
              onDeleteSingle={() => del("SINGLE")}
              onDeleteFromHere={() => del("FROM_HERE")}
              disabled={pending}
            />
          )}
        </div>

        <ul className="flex flex-col gap-1">
          {props.slots
            .filter((s) => s.active)
            .map((s) => (
              <li key={s.slotId}>
                <button
                  type="button"
                  disabled={!props.canManage}
                  onClick={() => props.canManage && openSheet(s.slotId)}
                  className="w-full min-h-11 flex items-center gap-2 py-1.5 text-left disabled:cursor-default"
                >
                  <span className="text-sm text-text-muted w-24 shrink-0">{s.role}</span>
                  {s.allocatedName ? (
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
                    </span>
                  ) : (
                    <span
                      className={`text-sm flex-1 ${props.canManage ? "text-primary font-medium" : "text-text-muted"}`}
                    >
                      — vaga aberta
                    </span>
                  )}
                </button>
              </li>
            ))}
        </ul>

        {props.canManage && props.slots.some((s) => !s.active) && (
          <ul className="flex flex-col gap-1 mt-3 pt-3 border-t border-border">
            {props.slots
              .filter((s) => !s.active)
              .map((s) => (
                <li key={s.slotId} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-muted">{s.role} · desativada</span>
                  <button
                    type="button"
                    className="min-h-11 flex items-center gap-1 text-xs text-primary underline underline-offset-2"
                    disabled={pending}
                    onClick={() => reactivateSlot(s.slotId)}
                  >
                    <RotateCcw size={12} strokeWidth={1.8} />
                    reativar
                  </button>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </li>
  );
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros. Confirma que nada mais no repo importa `OccurrenceRow` esperando as props antigas — `EscalaCalendar.tsx` (`app/(app)/escalas/EscalaCalendar.tsx`) é o único consumidor e sua chamada não muda.

- [ ] **Step 3: Rodar suíte de testes existente**

Run: `npm run test`
Expected: PASS (sem teste cobre `OccurrenceRow` diretamente hoje; isso confirma que nada em `tests/unit` quebrou por causa da mudança de UI).

- [ ] **Step 4: Validar manualmente no dev server**

Run: `npm run dev`

Como usuário com `canManage=true` num ministério com escala futura em `/escalas`:
1. Tocar numa vaga vazia (`— vaga aberta`, cor primária) → bottom sheet abre de baixo, handle visível no topo, card por trás continua visível.
2. Escolher um candidato → sheet fecha, linha da vaga mostra o nome.
3. Tocar na mesma vaga (agora preenchida) → sheet abre mostrando nome + badges + botões "Trocar" e "Desativar vaga".
4. Tocar "Trocar" → lista de candidatos aparece dentro do mesmo sheet (sem fechar); escolher outro nome → sheet fecha, linha atualiza.
5. Tocar "+ Pessoa sem conta" → formulário aparece, adicionar nome → aloca como guest (badge "sem conta" aparece na linha).
6. Tocar "Desativar vaga" → diálogo de confirmação (`ConfirmDialog`) aparece por cima do sheet; confirmar → sheet fecha, vaga some da lista principal e aparece na seção "desativada" com botão reativar.
7. Tocar o `⋮` no header do card → menu abre com as 4 opções; "Copiar p/ WhatsApp" mostra "Copiado!" e mantém o menu aberto; "Editar" navega pra `/escalas/{id}/editar`; "Excluir esta"/"Excluir daqui em diante" abrem os diálogos de confirmação de sempre.
8. Como usuário sem `canManage` no mesmo ministério (ou trocando pra uma view sem gestão): linhas de vaga não são tocáveis (sem cursor de ação), header sem o `⋮`.
9. Testar em viewport mobile (DevTools, ~375px) que nenhum elemento tocável fica menor que 44px e que o sheet não estoura a tela.

Expected: todos os passos acima funcionam sem erro no console e refletem exatamente o mesmo comportamento de dados que existia antes (mesmas Server Actions, mesmo estado local).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/escalas/OccurrenceRow.tsx"
git commit -m "feat(escalas): substitui picker/acoes inline por bottom sheet e menu de header"
```

---

## Self-Review Notes

- **Cobertura do spec (item 1):** bottom sheet para alocação/troca ✅ (Task 3+4), handle de fechar visível ✅ (Task 1), touch targets 44px ✅ (todas as tasks), menu `⋮` no header ✅ (Task 2), linha resumida tocável (`Role: Nome` / `— vaga aberta`) ✅ (Task 4).
- **`AllocatePicker.tsx` não é tocado** — permanece usado por `GuestRow.tsx`; verificado via busca no repo antes de escrever o plano (só `OccurrenceRow.tsx` e `GuestRow.tsx` o importavam).
- **Consistência de tipos:** `Note` perdeu o campo `ref` (nunca era preenchido no código original — dead field removido durante a reescrita); `SlotDetailSheetProps.note` e o `note` state de `OccurrenceRow` usam a mesma forma (`{ message, onOverride? }`) nas duas pontas (Task 3 e Task 4).
- **Sem placeholders:** todos os steps têm código completo, sem "implementar depois" ou "similar à task N".
