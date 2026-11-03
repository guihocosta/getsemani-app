"use client";

import { useEffect, useState, useTransition } from "react";
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
  const [time, setTime] = useState(props.time);
  const [scope, setScope] = useState<RetimeScope>("SINGLE");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (props.open) {
      setTime(props.time);
      setScope("SINGLE");
      setError(null);
    }
  }, [props.open, props.time]);

  function save() {
    setError(null);
    start(async () => {
      const res = await retimeOccurrenceAction(props.occurrenceId, scope, time);
      if (!res.ok) {
        setError(res.ref ? `${res.error} · cód. ${res.ref}` : res.error);
        return;
      }
      props.onRetimed();
      props.onClose();
    });
  }

  return (
    <Sheet open={props.open} onClose={props.onClose} title="Mudar horário">
      <div className="flex flex-col gap-4 p-4">
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Hora</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="field"
          />
        </label>
        <fieldset className="flex flex-col gap-1">
          {(
            [
              ["SINGLE", "Só esta data"],
              ["FROM_HERE", "Esta e as próximas"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="min-h-11 flex items-center gap-2 text-sm text-text">
              <input
                type="radio"
                name="retime-scope"
                value={value}
                checked={scope === value}
                onChange={() => setScope(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="button" disabled={pending} onClick={save}>
          Salvar
        </Button>
      </div>
    </Sheet>
  );
}
