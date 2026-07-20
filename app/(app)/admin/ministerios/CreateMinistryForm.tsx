"use client";

import { useRef, useState, useTransition } from "react";
import { Card } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { createMinistryAction } from "./actions";

export function CreateMinistryForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    const name = String(formData.get("name") ?? "");
    const color = String(formData.get("color") ?? "");
    setError(null);
    start(async () => {
      try {
        await createMinistryAction({ name, color: color || undefined });
        formRef.current?.reset();
      } catch (e) {
        setError((e as Error).message === "INVALID_NAME" ? "Nome inválido (mín. 2 caracteres)" : "Erro ao criar ministério");
      }
    });
  }

  return (
    <Card className="mb-8">
      <p className="eyebrow mb-3">Novo ministério</p>
      <form ref={formRef} action={submit} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[10rem]">
          <label className="text-xs text-text-muted block mb-1" htmlFor="ministry-name">
            Nome
          </label>
          <input id="ministry-name" name="name" required minLength={2} className="field w-full" placeholder="Ex: Louvor" />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1" htmlFor="ministry-color">
            Cor
          </label>
          <input id="ministry-color" name="color" type="color" defaultValue="#6d28d9" className="field h-[42px] w-16 p-1" />
        </div>
        <Button type="submit" disabled={pending} className="py-2.5 px-4 text-sm">
          Criar
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </Card>
  );
}
