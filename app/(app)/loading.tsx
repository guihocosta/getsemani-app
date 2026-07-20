// Skeleton exibido instantaneamente ao navegar, enquanto o server renderiza a pagina.
// Faz a troca de tela parecer imediata mesmo com a latencia do banco.
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-8 w-40 rounded-lg bg-white/10" />
      <div className="mb-3 h-4 w-28 rounded bg-white/5" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[20px] bg-surface/60 border border-white/5 p-5">
            <div className="mb-2 h-3 w-16 rounded bg-white/10" />
            <div className="mb-2 h-5 w-32 rounded bg-white/10" />
            <div className="h-3 w-24 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
