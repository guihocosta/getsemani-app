"use client";

import { useState, useTransition } from "react";
import { Button } from "@/ui/Button";
import { addUnavailabilityAction } from "./actions";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function UnavailabilityForm() {
  const [pending, start] = useTransition();
  const [allDay, setAllDay] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      try {
        await addUnavailabilityAction(formData);
      } catch {
        setError("Erro ao salvar. Tente de novo.");
      }
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-text-muted">Dia</span>
        <input type="date" name="date" required defaultValue={todayISO()} min={todayISO()} className="field" />
      </label>

      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input
          type="checkbox"
          name="allDay"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="accent-[var(--color-primary)]"
        />
        Dia inteiro
      </label>

      {!allDay && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-text-muted">Das</span>
            <input type="time" name="startTime" required className="field" />
          </label>
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-text-muted">Até</span>
            <input type="time" name="endTime" required className="field" />
          </label>
        </div>
      )}

      <Button type="submit" disabled={pending}>
        Adicionar
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
