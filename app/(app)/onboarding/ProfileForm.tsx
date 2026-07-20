"use client";

import { useState, useTransition } from "react";
import { Button } from "@/ui/Button";
import { updateProfileAction } from "./actions";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [pending, start] = useTransition();
  const [nameValue, setNameValue] = useState(name);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    start(async () => {
      try {
        await updateProfileAction({ name: nameValue, phone: phoneValue });
        setMsg("Salvo!");
      } catch (e) {
        setMsg((e as Error).message === "INVALID_NAME" ? "Nome inválido" : "Erro ao salvar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-text-muted">Nome</span>
        <input
          className="rounded-[12px] bg-surface-2/70 border border-border px-3 py-2 text-text"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-text-muted">Telefone (opcional)</span>
        <input
          className="rounded-[12px] bg-surface-2/70 border border-border px-3 py-2 text-text"
          value={phoneValue}
          onChange={(e) => setPhoneValue(e.target.value)}
        />
      </label>
      <div className="flex items-center gap-3">
        <Button disabled={pending} onClick={save}>
          Salvar
        </Button>
        {msg && <span className="text-sm text-text-muted">{msg}</span>}
      </div>
    </div>
  );
}
