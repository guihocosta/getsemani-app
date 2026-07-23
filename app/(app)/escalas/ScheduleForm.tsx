"use client";

import { useActionState, useState } from "react";
import { Card } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { buildRRule, type Frequency } from "@/modules/scheduling/domain/buildRRule";
import { createScheduleAction, updateScheduleAction, type ScheduleFormState } from "./actions";

type Ministry = { id: string; name: string; roles: { id: string; name: string }[] };

type EditingSchedule = {
  id: string;
  ministryId: string;
  title: string;
  startDate: string; // yyyy-mm-dd
  startTime: string;
  recurrenceRule: string;
  recurrenceUntil: string | null;
  roleIds: string[];
};

const INITIAL_STATE: ScheduleFormState = { ok: true };

export function ScheduleForm({
  ministries,
  editing,
}: {
  ministries: Ministry[];
  editing?: EditingSchedule;
}) {
  const isEdit = !!editing;
  const [state, formAction, pending] = useActionState(
    isEdit ? updateScheduleAction : createScheduleAction,
    INITIAL_STATE,
  );

  const [ministryId, setMinistryId] = useState(editing?.ministryId ?? ministries[0]?.id ?? "");
  const [startDate, setStartDate] = useState(editing?.startDate ?? "");
  const [repeat, setRepeat] = useState(!isEdit);
  const [freq, setFreq] = useState<Frequency>("WEEKLY");
  const [endMode, setEndMode] = useState<"never" | "date" | "count">("never");
  const [endDate, setEndDate] = useState("");
  const [endCount, setEndCount] = useState(8);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(editing?.roleIds ?? []);
  const [roleError, setRoleError] = useState(false);

  const ministry = ministries.find((m) => m.id === ministryId);
  const weekday = startDate ? new Date(`${startDate}T00:00:00Z`).getUTCDay() : 0;

  const recurrenceRule = isEdit
    ? editing!.recurrenceRule
    : repeat
      ? buildRRule({ freq, weekday, count: endMode === "count" ? endCount : null })
      : "FREQ=WEEKLY;COUNT=1";

  const recurrenceUntil = isEdit
    ? (editing!.recurrenceUntil ?? "")
    : repeat && endMode === "date"
      ? endDate
      : "";

  function toggleRole(roleId: string) {
    setRoleError(false);
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (selectedRoles.length === 0) {
      e.preventDefault();
      setRoleError(true);
    }
  }

  return (
    <Card>
      <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-3">
        {isEdit && <input type="hidden" name="scheduleId" value={editing!.id} />}
        <input type="hidden" name="recurrenceRule" value={recurrenceRule} />
        <input type="hidden" name="recurrenceUntil" value={recurrenceUntil} />

        <div>
          <p className="eyebrow mb-1">Ministério</p>
          <select
            name="ministryId"
            className="field"
            required
            disabled={isEdit}
            value={ministryId}
            onChange={(e) => setMinistryId(e.target.value)}
          >
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="eyebrow mb-1">Título</p>
          <input
            name="title"
            placeholder="Ex: Culto de Domingo"
            required
            defaultValue={editing?.title}
            className="field"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <p className="eyebrow mb-1">Data base</p>
            <input
              type="date"
              name="startDate"
              required
              disabled={isEdit}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field"
            />
          </div>
          <div className="flex-1">
            <p className="eyebrow mb-1">Hora</p>
            <input
              type="time"
              name="startTime"
              defaultValue={editing?.startTime ?? "19:00"}
              required
              className="field"
            />
          </div>
        </div>

        <div>
          <p className="eyebrow mb-2">Funções</p>
          <div className="flex flex-wrap gap-2">
            {ministry?.roles.map((r) => {
              const active = selectedRoles.includes(r.id);
              return (
                <label key={r.id}>
                  <input
                    type="checkbox"
                    name="roleIds"
                    value={r.id}
                    checked={active}
                    onChange={() => toggleRole(r.id)}
                    className="sr-only peer"
                  />
                  <span
                    className={
                      "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ring-1 " +
                      (active
                        ? "bg-primary text-white ring-primary"
                        : "bg-surface-2 text-text-muted ring-border hover:text-text")
                    }
                  >
                    {r.name}
                  </span>
                </label>
              );
            })}
          </div>
          {roleError && (
            <p className="text-xs text-danger mt-2">Escolha pelo menos uma função.</p>
          )}
        </div>

        {isEdit ? (
          <p className="text-xs text-text-muted">
            Recorrência não é editável aqui — exclua ocorrências futuras e crie uma nova série se
            precisar mudar a frequência.
          </p>
        ) : (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={repeat}
                onChange={(e) => setRepeat(e.target.checked)}
              />
              Repetir escala?
            </label>

            {repeat && (
              <>
                <div>
                  <p className="eyebrow mb-1">Frequência</p>
                  <select
                    className="field"
                    value={freq}
                    onChange={(e) => setFreq(e.target.value as Frequency)}
                  >
                    <option value="WEEKLY">Toda semana</option>
                    <option value="BIWEEKLY">A cada 2 semanas</option>
                    <option value="MONTHLY">Todo mês</option>
                  </select>
                </div>

                <div>
                  <p className="eyebrow mb-1">Terminar em</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      className="field sm:w-32"
                      value={endMode}
                      onChange={(e) => setEndMode(e.target.value as "never" | "date" | "count")}
                    >
                      <option value="never">Nunca</option>
                      <option value="count">Nº de vezes</option>
                      <option value="date">Data</option>
                    </select>
                    {endMode === "count" && (
                      <input
                        type="number"
                        min={1}
                        className="field flex-1"
                        value={endCount}
                        onChange={(e) => setEndCount(Number(e.target.value))}
                      />
                    )}
                    {endMode === "date" && (
                      <input
                        type="date"
                        className="field flex-1"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    )}
                  </div>
                  {endMode === "never" && (
                    <p className="text-xs text-text-muted mt-1">
                      A escala se repete indefinidamente; o app gera as próximas datas automaticamente.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {!state.ok && state.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar escala"}
        </Button>
      </form>
    </Card>
  );
}
