import Link from "next/link";
import { Music, Users } from "lucide-react";

const botao =
  "min-h-11 inline-flex items-center gap-1.5 rounded-xl px-3 text-sm font-semibold " +
  "bg-surface-2 text-text border border-border hover:bg-border/70 transition-colors";

// Atalhos de um cartao de escala: a pagina da data e, com repertorio, as musicas.
export function OccurrenceLinks({
  occurrenceId,
  repertoireEnabled,
  showTeam = true,
}: {
  occurrenceId: string;
  repertoireEnabled: boolean;
  showTeam?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showTeam && (
        <Link href={`/escalas/data/${occurrenceId}`} className={botao}>
          <Users size={16} strokeWidth={1.8} aria-hidden />
          Ver escala
        </Link>
      )}
      {repertoireEnabled && (
        <Link href={`/repertorio/escala/${occurrenceId}`} className={botao}>
          <Music size={16} strokeWidth={1.8} aria-hidden />
          Músicas
        </Link>
      )}
    </div>
  );
}
