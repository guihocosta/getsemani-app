"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/ui/Sheet";
import { Button } from "@/ui/Button";
import type { RetimeScope } from "@/modules/scheduling/domain/retime";
import { retimeOccurrenceAction } from "./actions";

export function RetimeSheet(props: {
  open: boolean;
  onClose: () => void;
  occurrenceId: string;
  time: string;
  onRetimed: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  // Campos nao controlados: trocar a key ao fechar volta ao horario atual.
  const [formKey, setFormKey] = useState(0);
  const [pending, start] = useTransition();

  function close() {
    setError(null);
    setFormKey((k) => k + 1);
    props.onClose();
  }

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const time = String(fd.get("time") ?? "");
    const scope = fd.get("scope") as RetimeScope;
    setError(null);
    start(async () => {
      const res = await retimeOccurrenceAction(props.occurrenceId, scope, time);
      if (!res.ok) {
        setError(res.ref ? `${res.error} · cód. ${res.ref}` : res.error);
        return;
      }
      props.onRetimed();
      close();
    });
  }

  return (
    <Sheet open={props.open} onClose={close} title="Mudar horário">
      <form key={formKey} onSubmit={save} className="flex flex-col gap-4 p-4">
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Hora</span>
          <input type="time" name="time" defaultValue={props.time} required className="field" />
        </label>
        <fieldset className="flex flex-col gap-1">
          {(
            [
              ["SINGLE", "Só esta data"],
              ["FROM_HERE", "Esta e as próximas"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="min-h-11 flex items-center gap-2 text-sm text-text">
              <input type="radio" name="scope" value={value} defaultChecked={value === "SINGLE"} />
              {label}
            </label>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          Salvar
        </Button>
      </form>
    </Sheet>
  );
}
