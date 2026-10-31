"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        <div className="flex min-h-dvh flex-col items-center justify-center text-center py-16 px-6">
          <div className="max-w-sm rounded-2xl border border-border bg-surface p-5 shadow">
            <p className="mb-1 text-lg text-text">Algo deu errado</p>
            <p className="mb-4 text-sm text-text-muted">
              Não conseguimos carregar o app agora. Tente novamente.
            </p>
            {error.digest && (
              <p className="mb-4 text-xs text-text-muted">Código: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="w-full rounded-xl bg-brand px-5 py-3 text-[15px] font-semibold text-white"
            >
              Tentar de novo
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
