"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, CheckCircle2 } from "lucide-react";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { useConfirm } from "@/ui/ConfirmDialog";
import {
  allocateAction,
  reassignAllocationAction,
  allocateGuestAction,
  linkGuestAction,
  deleteOccurrenceAction,
  getOccurrenceCandidatesAction,
  type AllocationCandidate,
} from "./actions";
import { AllocatePicker } from "./AllocatePicker";
import { MENSAGENS } from "@/lib/actionError";
import type { Slot, SlotPatch } from "./occurrenceCache";

type NoteMode = "assign" | "reassign";

type Note = {
  slotId: string;
  message: string;
  ref?: string;
  retryUserId?: string;
  mode: NoteMode;
};

function buildWhatsAppText(title: string, when: string, slots: Slot[]): string {
  const linhas = slots.map((s) => `- ${s.role}: ${s.allocatedName ?? "— vaga aberta"}`);
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
}) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<Note | null>(null);
  const [reassigningSlotId, setReassigningSlotId] = useState<string | null>(null);
  const [linkingSlotId, setLinkingSlotId] = useState<string | null>(null);
  const [copyNote, setCopyNote] = useState(false);
  const { confirm, dialog } = useConfirm();

  // Candidatos sao os mesmos pra todas as vagas desta ocorrencia (mesmo
  // ministerio + data) — busca uma vez so, na primeira vez que algum seletor
  // abre, e reusa pras demais vagas em vez de refazer a query por vaga.
  const [candidates, setCandidates] = useState<AllocationCandidate[] | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesFailed, setCandidatesFailed] = useState(false);
  const [candidatesRef, setCandidatesRef] = useState<string | null>(null);

  function ensureCandidates() {
    if (candidates || candidatesLoading) return;
    setCandidatesFailed(false);
    setCandidatesRef(null);
    setCandidatesLoading(true);
    getOccurrenceCandidatesAction(props.occurrenceId)
      .then((res) => {
        if (res.ok) setCandidates(res.candidates);
        else {
          setCandidatesFailed(true);
          setCandidatesRef(res.ref);
        }
      })
      .catch(() => setCandidatesFailed(true))
      .finally(() => setCandidatesLoading(false));
  }

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
        isGuest: false,
      });
      setNote(null);
      setReassigningSlotId(null);
    });
  }

  function allocate(slotId: string, userId: string, override = false) {
    runAllocation("assign", slotId, userId, override);
  }

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
      <Card>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-text">{props.title}</p>
            <p className="text-xs text-text-muted">{props.when}</p>
          </div>
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
              <button className="text-xs text-danger" disabled={pending} onClick={() => del("SINGLE")}>
                Excluir esta
              </button>
              <button
                className="text-xs text-danger"
                disabled={pending}
                onClick={() => del("FROM_HERE")}
              >
                Daqui em diante
              </button>
            </div>
          )}
        </div>

        <ul className="flex flex-col gap-2">
          {props.slots.map((s) => {
            const noteFor = note?.slotId === s.slotId ? note : null;
            return (
              <li key={s.slotId} className="flex items-center justify-between gap-2">
                <span className="text-sm text-text-muted w-24 shrink-0">{s.role}</span>
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
                {noteFor && (
                  <Badge tone="info" className="text-xs">
                    {noteFor.message}
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
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </li>
  );
}
