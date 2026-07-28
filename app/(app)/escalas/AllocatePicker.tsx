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
  failedRef?: string | null;
  onOpen: () => void;
  onRetry: () => void;
  onPick: (userId: string) => void;
  onPickGuest?: (name: string) => void;
  guestNames?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const isOpen = props.autoOpen || open;

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    props.onOpen();
  }

  function submitGuest() {
    const name = guestName.trim();
    if (!name || !props.onPickGuest) return;
    props.onPickGuest(name);
    setAddingGuest(false);
    setGuestName("");
    setOpen(false);
  }

  const candidates = props.excludeUserId
    ? props.candidates?.filter((c) => c.userId !== props.excludeUserId)
    : props.candidates;

  const guestForm = (
    <div className="px-3 py-2 flex flex-col gap-2">
      <input
        type="text"
        placeholder="Nome da pessoa"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        className="field !py-1.5 text-sm w-full"
        autoFocus
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submitGuest}
          disabled={!guestName.trim()}
          className="text-xs text-primary font-medium disabled:opacity-40"
        >
          Adicionar
        </button>
        <button type="button" onClick={() => setAddingGuest(false)} className="text-xs text-text-muted">
          cancelar
        </button>
      </div>
    </div>
  );

  const list = (
    <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl bg-surface ring-1 ring-border shadow-lg">
      {props.loading && <p className="px-3 py-2 text-xs text-text-muted">Carregando…</p>}
      {props.failed && (
        <div className="px-3 py-2 text-xs text-text-muted">
          Não deu pra carregar{props.failedRef && ` · cód. ${props.failedRef}`}.{" "}
          <button className="underline underline-offset-2 text-primary" onClick={props.onRetry}>
            Tentar de novo
          </button>
        </div>
      )}
      {!props.loading && !props.failed && candidates?.length === 0 && !props.onPickGuest && (
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
            className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-sm text-text hover:bg-surface-2 flex-wrap"
          >
            {c.name}
            {c.unavailable && (
              <Badge tone="danger" className="text-[10px]">
                Indisponível
              </Badge>
            )}
          </button>
        ))}
      {props.onPickGuest && !!props.guestNames?.length && !addingGuest && (
        <div className="border-t border-border">
          {props.guestNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setOpen(false);
                props.onPickGuest!(name);
              }}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
            >
              {name}
              <Badge tone="info" className="text-[10px]">
                sem conta
              </Badge>
            </button>
          ))}
        </div>
      )}
      {props.onPickGuest &&
        (addingGuest ? (
          guestForm
        ) : (
          <button
            type="button"
            onClick={() => setAddingGuest(true)}
            className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-surface-2 border-t border-border"
          >
            + Pessoa sem conta
          </button>
        ))}
    </div>
  );

  if (props.autoOpen) {
    return (
      <div className="relative flex-1" data-no-swipe>
        {list}
      </div>
    );
  }

  return (
    <div className="relative flex-1" data-no-swipe>
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
