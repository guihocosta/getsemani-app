"use client";

import { useTransition } from "react";
import { requestSwapAction } from "./vagas/actions";

export function RequestSwapButton({ allocationId }: { allocationId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="text-xs text-primary underline underline-offset-2 disabled:opacity-40"
      disabled={pending}
      onClick={() => start(() => requestSwapAction(allocationId))}
    >
      pedir troca
    </button>
  );
}
