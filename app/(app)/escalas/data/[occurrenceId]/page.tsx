import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getOccurrenceTeam, isTeamMissingOrDenied } from "@/modules/scheduling/services/getOccurrenceTeam";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { fmtDateTime } from "@/lib/time";
import { OccurrenceLinks } from "../../../OccurrenceLinks";

export const dynamic = "force-dynamic";

export default async function OccurrenceTeamPage({ params }: { params: Promise<{ occurrenceId: string }> }) {
  const { occurrenceId } = await params;

  // Id invalido, data cancelada, sem acesso ou rascunho para quem nao gerencia:
  // mesma resposta, para nao revelar que a data existe.
  const team = await getOccurrenceTeam(occurrenceId).catch((e) => {
    if (isTeamMissingOrDenied(e)) return null;
    throw e;
  });
  if (!team) notFound();

  return (
    <div>
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-text-muted mb-4 min-h-11">
        <ChevronLeft size={16} strokeWidth={1.8} />
        Início
      </Link>
      <header className="mb-6">
        <p className="eyebrow text-primary flex items-center gap-2">
          <span
            data-testid="cor-ministerio"
            aria-hidden
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: team.ministryColor }}
          />
          {team.ministry}
        </p>
        <h1 className="text-3xl text-text">{team.title}</h1>
        <p data-testid="data-escala" className="text-sm text-text-muted">
          {fmtDateTime(team.date)}
        </p>
      </header>

      <h2 className="eyebrow mb-3">Equipe</h2>
      <Card className="mb-6 border-l-4" style={{ borderLeftColor: team.ministryColor }}>
        <ul className="flex flex-col divide-y divide-border">
          {team.slots.map((s) => (
            <li key={s.slotId} data-testid="vaga-equipe" className="flex items-center gap-2 py-2.5 min-h-11">
              <span className="text-sm text-text-muted w-24 shrink-0">{s.role}</span>
              {s.name ? (
                <span className="text-sm text-text flex-1 flex items-center gap-1.5 flex-wrap">
                  {s.name}
                  {s.isMe && <Badge tone="info" className="text-[10px]">você</Badge>}
                  {s.isGuest && <Badge tone="info" className="text-[10px]">sem conta</Badge>}
                  {!s.isGuest && s.status === "PENDING" && (
                    <Badge tone="info" className="text-[10px]">aguardando confirmação</Badge>
                  )}
                </span>
              ) : (
                <span className="text-sm text-text-muted flex-1">— vaga aberta</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <OccurrenceLinks occurrenceId={team.occurrenceId} repertoireEnabled={team.repertoireEnabled} showTeam={false} />
    </div>
  );
}
