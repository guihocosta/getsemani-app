"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, RotateCcw, Trash2, Check, X } from "lucide-react";
import { Badge } from "@/ui/Badge";
import { useConfirm } from "@/ui/ConfirmDialog";
import { setRoleActiveAction, deleteRoleAction, renameRoleAction } from "./actions";

export function RoleRow({ roleId, name, active }: { roleId: string; name: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirm();

  function saveRename() {
    const value = inputRef.current?.value.trim() ?? "";
    if (value.length < 2 || value === name) {
      setEditing(false);
      return;
    }
    setError(null);
    start(async () => {
      try {
        await renameRoleAction(roleId, value);
        setEditing(false);
      } catch {
        setError("Nome inválido");
      }
    });
  }

  async function handleDeactivate() {
    const ok = await confirm({
      title: `Desativar "${name}"?`,
      description: "A função some das opções de novas escalas, mas o histórico é mantido.",
      confirmLabel: "Desativar",
      tone: "danger",
    });
    if (ok) start(() => setRoleActiveAction(roleId, false));
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Excluir "${name}" de vez?`,
      description: "Só é possível se essa função nunca foi usada em nenhuma escala. Não dá para desfazer.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (ok) start(() => deleteRoleAction(roleId));
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2">
        <input
          ref={inputRef}
          defaultValue={name}
          autoFocus
          minLength={2}
          className="field flex-1 !py-1.5 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") saveRename();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button onClick={saveRename} disabled={pending} className="text-primary shrink-0" aria-label="Salvar">
          <Check size={16} strokeWidth={2} />
        </button>
        <button onClick={() => setEditing(false)} className="text-text-muted shrink-0" aria-label="Cancelar">
          <X size={16} strokeWidth={2} />
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2">
      {dialog}
      <span className="text-sm text-text flex items-center gap-2">
        {name}
        {!active && (
          <Badge tone="muted" className="text-[10px]">
            Inativa
          </Badge>
        )}
        {error && <span className="text-xs text-danger">{error}</span>}
      </span>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setEditing(true)}
          disabled={pending}
          className="text-text-muted hover:text-text disabled:opacity-40"
          aria-label="Renomear"
        >
          <Pencil size={14} strokeWidth={1.8} />
        </button>
        {active ? (
          <button
            onClick={handleDeactivate}
            disabled={pending}
            className="text-xs text-danger disabled:opacity-40"
          >
            Desativar
          </button>
        ) : (
          <>
            <button
              onClick={() => start(() => setRoleActiveAction(roleId, true))}
              disabled={pending}
              className="text-text-muted hover:text-primary disabled:opacity-40"
              aria-label="Reativar"
            >
              <RotateCcw size={14} strokeWidth={1.8} />
            </button>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="text-danger disabled:opacity-40"
              aria-label="Excluir de vez"
            >
              <Trash2 size={14} strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
