"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/ui/Badge";
import type { AllocationCandidate } from "./actions";

export function AllocatePicker(props: {
  disabled?: boolean;
  autoOpen?: boolean;
  excludeUserId?: string;
  candidates: AllocationCandidate[] | null;
  loading: boolean;
  failed: boolean;
  onOpen: () => void;
  onRetry: () => void;
  onPick: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = props.autoOpen || open;

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    props.onOpen();
  }

  const candidates = props.excludeUserId
    ? props.candidates?.filter((c) => c.userId !== props.excludeUserId)
    : props.candidates;

  const list = (
    <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl bg-surface ring-1 ring-border shadow-lg">
      {props.loading && <p className="px-3 py-2 text-xs text-text-muted">Carregando…</p>}
      {props.failed && (
        <div className="px-3 py-2 text-xs text-text-muted">
          Não deu pra carregar.{" "}
          <button className="underline underline-offset-2 text-primary" onClick={props.onRetry}>
            Tentar de novo
          </button>
        </div>
      )}
      {!props.loading && !props.failed && candidates?.length === 0 && (
        <p className="px-3 py-2 text-xs text-text-muted">Nenhum voluntário neste ministério.</p>
      )}
      {!props.loading &&
        !props.failed &&
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
  );

  if (props.autoOpen) {
    return <div className="relative flex-1">{list}</div>;
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

      {isOpen && list}
    </div>
  );
}
