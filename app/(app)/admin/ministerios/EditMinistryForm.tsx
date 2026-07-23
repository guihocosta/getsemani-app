"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/ui/Button";
import { updateMinistryAction } from "./actions";

type Props = {
  ministryId: string;
  name: string;
  color: string | null;
  description: string | null;
  onDone: () => void;
};

export function EditMinistryForm({ ministryId, name, color, description, onDone }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    const newName = String(formData.get("name") ?? "");
    const newColor = String(formData.get("color") ?? "");
    const newDescription = String(formData.get("description") ?? "");
    setError(null);
    start(async () => {
      try {
        await updateMinistryAction({
          ministryId,
          name: newName,
          color: newColor,
          description: newDescription,
        });
        onDone();
      } catch {
        setError("Nome inválido (mín. 2 caracteres)");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-col gap-3 border-t border-border pt-3 mt-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-text-muted block mb-1">Nome</label>
          <input name="name" required minLength={2} defaultValue={name} className="field w-full" />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1">Cor</label>
          <input name="color" type="color" defaultValue={color ?? "#6d28d9"} className="field h-[42px] w-16 p-1" />
        </div>
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">Descrição</label>
        <input name="description" defaultValue={description ?? ""} className="field w-full" placeholder="Opcional" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="py-2 px-4 text-sm">
          Salvar
        </Button>
        <button type="button" onClick={onDone} className="text-sm text-text-muted">
          Cancelar
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </form>
  );
}
