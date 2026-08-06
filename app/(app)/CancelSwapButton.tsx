"use client";

import { useState, useTransition } from "react";
import { useConfirm } from "@/ui/ConfirmDialog";
import { cancelSwapAction } from "./vagas/actions";

export function CancelSwapButton({ swapRequestId }: { swapRequestId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  async function cancel() {
    const ok = await confirm({
      title: "Cancelar pedido de troca?",
      description: "Você continua escalado normalmente.",
      confirmLabel: "Cancelar troca",
      tone: "danger",
    });
    if (ok) {
      start(async () => {
        const res = await cancelSwapAction(swapRequestId);
        if (!res.ok) setError("Não deu para cancelar agora.");
      });
    }
  }

  return (
    <div className="text-right">
      {dialog}
      <button
        className="text-xs text-text-muted underline underline-offset-2 disabled:opacity-40"
        disabled={pending}
        onClick={cancel}
      >
        cancelar troca
      </button>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
