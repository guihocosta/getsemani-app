"use client";

import { useState, useTransition } from "react";
import { requestSwapAction } from "./vagas/actions";

export function RequestSwapButton({ allocationId }: { allocationId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="text-right">
      <button
        className="text-xs text-primary underline underline-offset-2 disabled:opacity-40"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await requestSwapAction(allocationId);
            if (!res.ok) setError("Não deu para pedir troca agora.");
          })
        }
      >
        pedir troca
      </button>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
