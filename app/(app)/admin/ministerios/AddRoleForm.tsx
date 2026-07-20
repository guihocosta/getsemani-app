"use client";

import { useRef, useState, useTransition } from "react";
import { addRoleAction } from "./actions";

export function AddRoleForm({ ministryId }: { ministryId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    const name = String(formData.get("name") ?? "");
    setError(null);
    start(async () => {
      try {
        await addRoleAction({ ministryId, name });
        formRef.current?.reset();
      } catch (e) {
        setError((e as Error).message === "INVALID_NAME" ? "Nome inválido" : "Erro");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex items-center gap-2 mt-2">
      <input
        name="name"
        required
        minLength={2}
        placeholder="Nova função…"
        className="field flex-1 !py-1.5 text-sm"
        disabled={pending}
      />
      <button type="submit" disabled={pending} className="text-sm text-primary disabled:opacity-40 shrink-0">
        Adicionar
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </form>
  );
}
