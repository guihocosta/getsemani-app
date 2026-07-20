"use client";

import { useTransition } from "react";
import { removeRoleAction } from "./actions";

export function RemoveRoleButton({ roleId }: { roleId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="text-xs text-danger disabled:opacity-40"
      disabled={pending}
      onClick={() => start(() => removeRoleAction(roleId))}
    >
      Desativar
    </button>
  );
}
