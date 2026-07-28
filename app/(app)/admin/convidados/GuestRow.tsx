"use client";

import { useState, useTransition } from "react";
import { AllocatePicker } from "@app/(app)/escalas/AllocatePicker";
import {
  getOccurrenceCandidatesAction,
  linkGuestAction,
  type AllocationCandidate,
} from "@app/(app)/escalas/actions";
import { MENSAGENS } from "@/lib/actionError";
import type { GuestAllocationItem } from "@/modules/scheduling/services/listGuestAllocations";

export function GuestRow({ guest }: { guest: GuestAllocationItem }) {
  const [pending, start] = useTransition();
  const [linked, setLinked] = useState(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [retryUserId, setRetryUserId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<AllocationCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failedRef, setFailedRef] = useState<string | null>(null);

  function ensureCandidates() {
    if (candidates || loading) return;
    setFailed(false);
    setFailedRef(null);
    setLoading(true);
    getOccurrenceCandidatesAction(guest.occurrenceId)
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
      const res = await linkGuestAction(guest.allocationId, userId, override);
      if (!res.ok) {
        if (res.code === "UNAVAILABILITY_BLOCKED") {
          setNote(`${MENSAGENS.UNAVAILABILITY_BLOCKED} Vincular mesmo assim?`);
          setRetryUserId(userId);
        } else {
          setNote(`${MENSAGENS[res.code]} · cód. ${res.ref}`);
        }
        return;
      }
      setLinked(true);
      setNote(null);
      setOpen(false);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="text-text">{guest.guestName}</p>
          <p className="text-xs text-text-muted">
            {guest.ministryName} · {guest.role}
          </p>
        </div>
        <span className="text-xs text-text-muted shrink-0">{guest.when}</span>
      </div>

      {linked ? (
        <p className="text-sm text-primary">Vinculado.</p>
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
