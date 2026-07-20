// Skeleton exibido instantaneamente ao navegar, enquanto o server renderiza a pagina.
// Faz a troca de tela parecer imediata mesmo com a latencia do banco.
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-8 w-40 rounded-lg bg-surface-2" />
      <div className="mb-3 h-4 w-28 rounded bg-surface-2" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-surface border border-border p-5">
            <div className="mb-2 h-3 w-16 rounded bg-surface-2" />
            <div className="mb-2 h-5 w-32 rounded bg-surface-2" />
            <div className="h-3 w-24 rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
