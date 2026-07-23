"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-dvh flex-col items-center justify-center text-center py-16 px-6">
          <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow">
            <p className="mb-1 text-lg text-slate-900">Algo deu errado</p>
            <p className="mb-4 text-sm text-slate-600">
              Não conseguimos carregar o app agora. Tente novamente.
            </p>
            {error.digest && (
              <p className="mb-4 text-xs text-slate-400">Código: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-[15px] font-semibold text-white"
            >
              Tentar de novo
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
