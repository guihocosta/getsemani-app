"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/ui/Badge";
import { getAllocationCandidatesAction, type AllocationCandidate } from "./actions";

export function AllocatePicker(props: {
  slotId: string;
  disabled?: boolean;
  onPick: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<AllocationCandidate[] | null>(null);
  const [loading, start] = useTransition();

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!candidates) {
      start(async () => {
        setCandidates(await getAllocationCandidatesAction(props.slotId));
      });
    }
  }

  return (
    <div className="relative flex-1">
      <button
        type="button"
        disabled={props.disabled}
        onClick={toggle}
        className="field flex-1 !py-1.5 text-sm w-full flex items-center justify-between disabled:opacity-40"
      >
        Alocar…
        <ChevronDown size={14} strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl bg-surface ring-1 ring-border shadow-lg">
          {loading && <p className="px-3 py-2 text-xs text-text-muted">Carregando…</p>}
          {!loading && candidates?.length === 0 && (
            <p className="px-3 py-2 text-xs text-text-muted">Nenhum voluntário neste ministério.</p>
          )}
          {!loading &&
            candidates?.map((c) => (
              <button
                key={c.userId}
                type="button"
                onClick={() => {
                  setOpen(false);
                  props.onPick(c.userId);
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
              >
                <span className="flex items-center gap-1.5 flex-wrap">
                  {c.name}
                  {c.unavailable && (
                    <Badge tone="danger" className="text-[10px]">
                      Indisponível
                    </Badge>
                  )}
                </span>
                <span className="text-xs text-text-muted shrink-0">{c.count30d}x/30d</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
