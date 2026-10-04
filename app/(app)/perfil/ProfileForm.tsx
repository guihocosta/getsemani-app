"use client";

import { useState, useTransition } from "react";
import { Button } from "@/ui/Button";
import { MENSAGENS } from "@/lib/actionError";
import { updateProfileAction } from "./actions";

export function ProfileForm({ name, phone, birthDate }: { name: string; phone: string; birthDate: string }) {
  const [pending, start] = useTransition();
  const [nameValue, setNameValue] = useState(name);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [birthValue, setBirthValue] = useState(birthDate);
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    start(async () => {
      try {
        const res = await updateProfileAction({ name: nameValue, phone: phoneValue, birthDate: birthValue });
        if (res.ok) setMsg("Salvo!");
        else setMsg(res.code === "UNKNOWN" ? `${MENSAGENS.UNKNOWN} · cód. ${res.ref}` : MENSAGENS[res.code]);
      } catch {
        setMsg(MENSAGENS.UNKNOWN);
      }
    });
  }

  return (
    <div data-no-swipe className="flex flex-col gap-3">
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
      <label className="flex flex-col gap-1">
        <span className="text-sm text-text-muted">Data de nascimento (opcional)</span>
        <input
          type="date"
          className="rounded-[12px] bg-surface-2/70 border border-border px-3 py-2 text-text"
          value={birthValue}
          onChange={(e) => setBirthValue(e.target.value)}
        />
        <span className="text-xs text-text-muted">Só o dia e o mês aparecem para quem serve com você.</span>
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
