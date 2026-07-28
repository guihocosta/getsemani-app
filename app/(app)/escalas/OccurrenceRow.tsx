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
