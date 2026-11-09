import { Skeleton } from "@/ui/Skeleton";

// Calendario do mes: cabecalho, 7 colunas e 5 semanas, como em EscalaCalendar.
export default function Loading() {
  return (
    <Skeleton testId="esqueleto-escalas">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-11 w-11 rounded-xl bg-surface-2" />
        <div className="h-5 w-32 rounded bg-surface-2" />
        <div className="h-11 w-11 rounded-xl bg-surface-2" />
      </div>
      <div className="grid grid-cols-7 gap-1 mb-6" data-testid="esqueleto-dias">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-surface-2" />
        ))}
      </div>
      <div className="rounded-2xl bg-surface border border-border p-5">
        <div className="mb-2 h-4 w-40 rounded bg-surface-2" />
        <div className="mb-4 h-3 w-24 rounded bg-surface-2" />
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 w-full rounded bg-surface-2" />
          ))}
        </div>
      </div>
    </Skeleton>
  );
}
