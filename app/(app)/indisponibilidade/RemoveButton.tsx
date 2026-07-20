"use client";

import { useTransition } from "react";
import { removeUnavailabilityAction } from "./actions";

export function RemoveButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="text-sm text-danger disabled:opacity-40"
      disabled={pending}
      onClick={() => start(() => removeUnavailabilityAction(id))}
    >
      Remover
    </button>
  );
}
