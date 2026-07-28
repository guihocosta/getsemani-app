"use client";

import { useState, useTransition } from "react";
import { AllocatePicker } from "@app/(app)/escalas/AllocatePicker";
import {
  getOccurrenceCandidatesAction,
  linkAllGuestAction,
  type AllocationCandidate,
} from "@app/(app)/escalas/actions";
import { MENSAGENS } from "@/lib/actionError";
import { Badge } from "@/ui/Badge";
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

  function ensureCandidates() {
    if (candidates || loading) return;
    const firstOccurrenceId = guest.allocations[0]?.occurrenceId;
    if (!firstOccurrenceId) return;

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

  function link(userId: string, override = false) {
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

  const allocationLabel = `${guest.totalAllocations} ${
    guest.totalAllocations === 1 ? "escalação" : "escalações"
  }`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <p className="text-text font-medium">{guest.guestName}</p>
          <Badge tone="info">{allocationLabel}</Badge>
        </div>
      </div>

      <ul className="text-xs text-text-muted space-y-1 pl-1 border-l-2 border-border mb-3">
        {guest.allocations.map((item) => (
          <li key={item.allocationId}>
            {item.when} · {item.ministryName} · {item.role}
          </li>
        ))}
      </ul>

      {linkedCount !== null ? (
        <p className="text-sm text-primary">
          {linkedCount} {linkedCount === 1 ? "escalação vinculada" : "escalações vinculadas"} com sucesso!
        </p>
      ) : open ? (
        <div className="flex items-center gap-2">
          <AllocatePicker
            autoOpen
            disabled={pending}
            candidates={candidates}
            loading={loading}
            failed={failed}
            failedRef={failedRef}
            onOpen={ensureCandidates}
            onRetry={ensureCandidates}
            onPick={(userId) => link(userId)}
          />
          <button
            type="button"
            className="text-xs text-text-muted shrink-0"
            onClick={() => setOpen(false)}
          >
            cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="text-xs text-primary underline underline-offset-2"
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
            <button className="underline underline-offset-2 ml-1" onClick={() => link(retryUserId, true)}>
              Sim
            </button>
          )}
        </p>
      )}
    </div>
  );
}

