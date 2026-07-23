"use client";

import { useTransition } from "react";
import { useConfirm } from "@/ui/ConfirmDialog";
import { removeUnavailabilityAction } from "./actions";

export function RemoveButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const { confirm, dialog } = useConfirm();

  async function remove() {
    const ok = await confirm({
      title: "Remover essa indisponibilidade?",
      confirmLabel: "Remover",
      tone: "danger",
    });
    if (ok) start(() => removeUnavailabilityAction(id));
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
