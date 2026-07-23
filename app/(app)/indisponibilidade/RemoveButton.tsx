"use client";

import { useTransition } from "react";
import { useConfirm } from "@/ui/ConfirmDialog";
import { removeUnavailabilityAction } from "./actions";

export function RemoveButton({ ids }: { ids: string[] }) {
  const [pending, start] = useTransition();
  const { confirm, dialog } = useConfirm();

  async function remove() {
    const ok = await confirm({
      title: ids.length > 1 ? "Remover esse período?" : "Remover essa indisponibilidade?",
      confirmLabel: "Remover",
      tone: "danger",
    });
    if (ok) start(() => removeUnavailabilityAction(ids));
  }

  return (
    <>
      {dialog}
      <button className="text-sm text-danger disabled:opacity-40" disabled={pending} onClick={remove}>
        Remover
      </button>
    </>
  );
}
