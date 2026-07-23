"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, CheckCircle2 } from "lucide-react";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { useConfirm } from "@/ui/ConfirmDialog";
import { allocateAction, deleteOccurrenceAction } from "./actions";
import { AllocatePicker } from "./AllocatePicker";
import type { AllocationStatus } from "@prisma/client";

type Slot = {
  slotId: string;
  role: string;
  allocatedName: string | null;
  allocationId: string | null;
  allocatedStatus: AllocationStatus | null;
  checkedIn: boolean;
};

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
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  function allocate(slotId: string, userId: string, override = false) {
    if (!userId) return;
    start(async () => {
      const res = await allocateAction(slotId, userId, override);
      if (!res.ok) {
        if (res.error === "UNAVAILABILITY_BLOCKED") {
          setNote(`${slotId}|Indisponível. Alocar mesmo assim?|${userId}`);
        } else if (res.error === "SLOT_TAKEN") {
          setNote(`${slotId}|Vaga já preenchida|`);
        } else {
          setNote(`${slotId}|Erro|`);
        }
      } else {
        setNote(null);
        props.onChanged();
      }
    });
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
            const noteFor = note?.startsWith(s.slotId + "|") ? note.split("|") : null;
            return (
              <li key={s.slotId} className="flex items-center justify-between gap-2">
                <span className="text-sm text-text-muted w-24 shrink-0">{s.role}</span>
                {s.allocatedName ? (
                  <span className="text-sm text-text flex-1 flex items-center gap-1.5 flex-wrap">
                    {s.allocatedName}
                    {s.allocatedStatus === "PENDING" && (
                      <Badge tone="info" className="text-[10px]">
                        aguardando confirmação
                      </Badge>
                    )}
                    {props.isToday && s.checkedIn && (
                      <CheckCircle2 size={14} className="text-primary" strokeWidth={1.8} />
                    )}
                  </span>
                ) : props.canManage ? (
                  <AllocatePicker
                    slotId={s.slotId}
                    disabled={pending}
                    onPick={(userId) => allocate(s.slotId, userId)}
                  />
                ) : (
                  <span className="text-sm text-text-muted flex-1">— vaga aberta</span>
                )}
                {noteFor && (
                  <Badge tone="info" className="text-xs">
                    {noteFor[1]}
                    {noteFor[2] && (
                      <button
                        className="underline underline-offset-2 ml-1"
                        onClick={() => allocate(s.slotId, noteFor[2], true)}
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
