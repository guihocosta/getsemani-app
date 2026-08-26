"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical, Pencil } from "lucide-react";

export function OccurrenceMenu(props: {
  scheduleId: string;
  copyLabel: string;
  onCopy: () => void;
  onAddExtra: () => void;
  onRepeat?: () => void;
  rotationCycle?: number | null;
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
              props.onAddExtra();
            }}
            className="w-full min-h-11 text-left px-4 py-3 text-sm text-text hover:bg-surface-2 disabled:opacity-40"
          >
            Adicionar vaga extra
          </button>
          <button
            type="button"
            disabled={props.disabled || props.rotationCycle == null}
            onClick={() => {
              setOpen(false);
              props.onRepeat?.();
            }}
            className="w-full min-h-11 text-left px-4 py-3 text-sm text-text hover:bg-surface-2 disabled:opacity-40"
          >
            Repetir escalação
          </button>
          {props.rotationCycle == null && (
            <p className="px-4 pb-2 text-xs text-text-muted">
              Defina o ciclo de rodízio ao editar a escala.
            </p>
          )}
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
