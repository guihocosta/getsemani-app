import { Skeleton } from "@/ui/Skeleton";

// Grade funcao x data: titulo, seletor de mes e linhas da tabela.
export default function Loading() {
  return (
    <Skeleton testId="esqueleto-panorama">
      <div className="mb-4 h-8 w-40 rounded-lg bg-surface-2" />
      <div className="mb-4 flex items-center justify-between">
        <div className="h-11 w-11 rounded-xl bg-surface-2" />
        <div className="h-5 w-32 rounded bg-surface-2" />
        <div className="h-11 w-11 rounded-xl bg-surface-2" />
      </div>
      <div className="flex flex-col">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} data-testid="esqueleto-linha" className="flex gap-3 border-t border-border py-3">
            <div className="h-4 w-20 shrink-0 rounded bg-surface-2" />
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-4 flex-1 rounded bg-surface-2" />
            ))}
          </div>
        ))}
      </div>
    </Skeleton>
  );
}
