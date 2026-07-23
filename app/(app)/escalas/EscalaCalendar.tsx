"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { EmptyState } from "@/ui/EmptyState";
import { OccurrenceRow } from "./OccurrenceRow";
import { loadMonthAction } from "./actions";
import type { AllocationStatus } from "@prisma/client";

type Slot = {
  slotId: string;
  role: string;
  allocatedName: string | null;
  allocationId: string | null;
  allocatedStatus: AllocationStatus | null;
  checkedIn: boolean;
};
type Item = {
  occurrenceId: string;
  scheduleId: string;
  ministryId: string;
  dayKey: string; // yyyy-MM-dd
  title: string;
  when: string;
  slots: Slot[];
};

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthKey(y: number, m: number) {
  return `${y}-${pad(m)}`;
}

function shiftMonth(year: number, month: number, delta: number): [number, number] {
  const total = year * 12 + (month - 1) + delta;
  return [Math.floor(total / 12), (total % 12) + 1];
}

const EMPTY: Item[] = [];

export function EscalaCalendar({
  year: initialYear,
  month: initialMonth,
  todayKey,
  initialMonths,
  manageableMinistryIds,
}: {
  year: number;
  month: number; // 1-12
  todayKey: string;
  initialMonths: Record<string, Item[]>;
  manageableMinistryIds: string[];
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [cache, setCache] = useState<Map<string, Item[]>>(() => new Map(Object.entries(initialMonths)));
  const [isPending, startTransition] = useTransition();

  const [selected, setSelected] = useState<string>(() => {
    const inMonth = todayKey.startsWith(monthKey(initialYear, initialMonth));
    if (inMonth) return todayKey;
    const first = initialMonths[monthKey(initialYear, initialMonth)]?.[0];
    return first?.dayKey ?? `${initialYear}-${pad(initialMonth)}-01`;
  });

  const key = monthKey(year, month);
  const occurrences = cache.get(key) ?? EMPTY;

  async function refreshCurrentMonth() {
    const items = await loadMonthAction(year, month);
    setCache((prev) => new Map(prev).set(key, items));
  }

  // Pre-busca meses vizinhos que ainda nao estao em cache, pra trocar de mes
  // ficar instantaneo na proxima vez (sem bloquear a UI atual).
  useEffect(() => {
    for (const delta of [-1, 1]) {
      const [y, m] = shiftMonth(year, month, delta);
      const k = monthKey(y, m);
      if (!cache.has(k)) {
        loadMonthAction(y, m).then((items) => {
          setCache((prev) => (prev.has(k) ? prev : new Map(prev).set(k, items)));
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  function goToMonth(y: number, m: number) {
    const norm = m === 0 ? [y - 1, 12] : m === 13 ? [y + 1, 1] : [y, m];
    const [ny, nm] = norm as [number, number];
    const k = monthKey(ny, nm);

    // Preserva o state do App Router (null aqui quebra a navegacao da nav bar).
    window.history.replaceState(window.history.state, "", `/escalas?mes=${k}`);

    if (cache.has(k)) {
      setYear(ny);
      setMonth(nm);
      setSelected(`${k}-01`);
      return;
    }

    startTransition(async () => {
      const items = await loadMonthAction(ny, nm);
      setCache((prev) => new Map(prev).set(k, items));
      setYear(ny);
      setMonth(nm);
      setSelected(`${k}-01`);
    });
  }

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const o of occurrences) {
      const list = map.get(o.dayKey) ?? [];
      list.push(o);
      map.set(o.dayKey, list);
    }
    return map;
  }, [occurrences]);

  const cells = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    return [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`),
    ] as (string | null)[];
  }, [year, month]);

  const dayItems = byDay.get(selected) ?? [];
  const canManageAny = manageableMinistryIds.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl text-text">Escalas</h1>
        {canManageAny && (
          <Link
            href="/escalas/nova"
            className="flex items-center gap-1 text-sm font-semibold text-primary"
          >
            <Plus size={18} strokeWidth={2} />
            Nova
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => goToMonth(year, month - 1)} className="text-text-muted hover:text-text">
          <ChevronLeft size={20} />
        </button>
        <p className="text-sm font-semibold text-text">
          {MONTH_LABELS[month - 1]} {year}
        </p>
        <button onClick={() => goToMonth(year, month + 1)} className="text-text-muted hover:text-text">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className={`transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAY_LABELS.map((w, i) => (
            <p key={i} className="text-center text-[11px] text-text-muted font-semibold">
              {w}
            </p>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-6">
          {cells.map((cellKey, i) => {
            if (!cellKey) return <div key={i} />;
            const dayNum = Number(cellKey.split("-")[2]);
            const has = byDay.has(cellKey);
            const isSelected = cellKey === selected;
            const isToday = cellKey === todayKey;
            return (
              <button
                key={cellKey}
                onClick={() => setSelected(cellKey)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm transition-colors ${
                  isSelected
                    ? "bg-primary text-white font-semibold"
                    : isToday
                      ? "text-primary font-semibold"
                      : "text-text hover:bg-surface-2"
                }`}
              >
                {dayNum}
                {has && (
                  <span
                    className={`h-1 w-1 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <h2 className="eyebrow mb-3">
        {new Date(`${selected}T00:00:00`).toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })}
      </h2>

      {dayItems.length === 0 ? (
        <EmptyState
          title="Nenhuma escala neste dia"
          subtitle={canManageAny ? "Toque em Nova para criar uma." : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {dayItems.map((o) => (
            <OccurrenceRow
              key={o.occurrenceId}
              occurrenceId={o.occurrenceId}
              scheduleId={o.scheduleId}
              title={o.title}
              when={o.when}
              slots={o.slots}
              canManage={manageableMinistryIds.includes(o.ministryId)}
              isToday={o.dayKey === todayKey}
              onChanged={refreshCurrentMonth}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
