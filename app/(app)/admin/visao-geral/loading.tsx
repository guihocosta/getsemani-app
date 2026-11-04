import { Skeleton } from "@/ui/Skeleton";

// Cartoes de metrica em grade, como a pagina.
export default function Loading() {
  return (
    <Skeleton testId="esqueleto-visao-geral">
      <div className="mb-4 h-8 w-40 rounded-lg bg-surface-2" />
      <div className="mb-6 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-surface-2" />
        ))}
      </div>
      <ul className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} data-testid="esqueleto-cartao" className="rounded-2xl bg-surface border border-border p-5">
            <div className="mb-2 h-3 w-16 rounded bg-surface-2" />
            <div className="mb-2 h-8 w-12 rounded bg-surface-2" />
            <div className="h-3 w-20 rounded bg-surface-2" />
          </li>
        ))}
      </ul>
    </Skeleton>
  );
}
