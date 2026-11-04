import type { ReactNode } from "react";
import { cn } from "./cn";

// Moldura dos esqueletos de carregamento: anuncia "Carregando…" ao leitor de tela.
export function Skeleton({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <div role="status" aria-busy="true" data-testid={testId} className={cn("animate-pulse", className)}>
      <span className="sr-only">Carregando…</span>
      {children}
    </div>
  );
}
