"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { EmptyState } from "@/ui/EmptyState";
import { OccurrenceRow } from "./OccurrenceRow";

type Slot = { slotId: string; role: string; allocatedName: string | null };
type Item = {
  occurrenceId: string;
  scheduleId: string;
  dayKey: string; // yyyy-MM-dd
  title: string;
  when: string;
  slots: Slot[];
};
type Vol = { id: string; name: string };

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function EscalaCalendar({
  year,
  month,
  todayKey,
  occurrences,
  volunteers,
}: {
  year: number;
  month: number; // 1-12
  todayKey: string;
  occurrences: Item[];
  volunteers: Vol[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(() => {
    const inMonth = todayKey.startsWith(`${year}-${pad(month)}`);
    if (inMonth) return todayKey;
    return occurrences[0]?.dayKey ?? `${year}-${pad(month)}-01`;
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const o of occurrences) {
      const list = map.get(o.dayKey) ?? [];
      list.push(o);
      map.set(o.dayKey, list);
    }
    return map;
  }, [occurrences]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const cells: (string | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`),
  ];

  function goToMonth(y: number, m: number) {
    const norm = m === 0 ? [y - 1, 12] : m === 13 ? [y + 1, 1] : [y, m];
    router.push(`/escalas?mes=${norm[0]}-${pad(norm[1] as number)}`);
  }

  const dayItems = byDay.get(selected) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl text-text">Escalas</h1>
        <Link
          href="/escalas/nova"
          className="flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <Plus size={18} strokeWidth={2} />
          Nova
        </Link>
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

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAY_LABELS.map((w, i) => (
          <p key={i} className="text-center text-[11px] text-text-muted font-semibold">
            {w}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-6">
        {cells.map((key, i) => {
          if (!key) return <div key={i} />;
          const dayNum = Number(key.split("-")[2]);
          const has = byDay.has(key);
          const isSelected = key === selected;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
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

      <h2 className="eyebrow mb-3">
        {new Date(`${selected}T00:00:00`).toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })}
      </h2>

      {dayItems.length === 0 ? (
        <EmptyState title="Nenhuma escala neste dia" subtitle="Toque em Nova para criar uma." />
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
              volunteers={volunteers}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
