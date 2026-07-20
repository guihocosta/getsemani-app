"use client";

import { useState, useTransition } from "react";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { allocateAction, deleteOccurrenceAction } from "./actions";

type Slot = { slotId: string; role: string; allocatedName: string | null };
type Vol = { id: string; name: string };

export function OccurrenceRow(props: {
  occurrenceId: string;
  title: string;
  when: string;
  slots: Slot[];
  volunteers: Vol[];
}) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

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
      }
    });
  }

  function del(scope: "SINGLE" | "FROM_HERE") {
    start(() => deleteOccurrenceAction(props.occurrenceId, scope));
  }

  return (
    <li>
      <Card>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-text">{props.title}</p>
            <p className="text-xs text-text-muted">{props.when}</p>
          </div>
          <div className="flex gap-3">
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
        </div>

        <ul className="flex flex-col gap-2">
          {props.slots.map((s) => {
            const noteFor = note?.startsWith(s.slotId + "|") ? note.split("|") : null;
            return (
              <li key={s.slotId} className="flex items-center justify-between gap-2">
                <span className="text-sm text-text-muted w-24 shrink-0">{s.role}</span>
                {s.allocatedName ? (
                  <span className="text-sm text-text flex-1">{s.allocatedName}</span>
                ) : (
                  <select
                    defaultValue=""
                    disabled={pending}
                    onChange={(e) => allocate(s.slotId, e.target.value)}
                    className="field flex-1 !py-1.5 text-sm"
                  >
                    <option value="">Alocar…</option>
                    {props.volunteers.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
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
