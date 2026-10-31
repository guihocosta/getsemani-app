import { cn } from "./cn";

// Manual de marca: azul sobre fundo claro, branco sobre fundo escuro. A troca e
// por CSS (dark:) para acompanhar o script de tema antes da hidratacao.
export function Simbolo({ alt = "", className }: { alt?: string; className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- PNG oficial pequeno, sem ganho em otimizar */}
      <img
        src="/logo/simbolo-azul.png"
        alt={alt}
        width={204}
        height={219}
        className={cn("w-auto dark:hidden", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- PNG oficial pequeno, sem ganho em otimizar */}
      <img
        src="/logo/simbolo-branco.png"
        alt={alt}
        width={204}
        height={219}
        className={cn("hidden w-auto dark:block", className)}
      />
    </>
  );
}
