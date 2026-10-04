import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSessionUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { overviewData } from "@/modules/reports/services/reports";
import { OVERVIEW_PERIODS, overviewPeriod, summarizeOverview, fmtPct } from "@/modules/reports/domain/overview";
import { Card } from "@/ui/Card";
import { startOfDay } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function VisaoGeralPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isLeader = await isLeaderOfAny(user.id);
  if (!user.isAdmin && !isLeader) redirect("/");

  // Admin ve tudo; lider ve so os ministerios que lidera (mesmo recorte de /admin).
  const scopeIds = user.isAdmin ? undefined : await ledMinistryIds(user.id, false);

  const now = new Date();
  const { key, from, to } = overviewPeriod(periodo, now);
  const s = summarizeOverview(await overviewData(from, to, startOfDay(now), scopeIds));

  const cards = [
    { label: "Escalas", value: String(s.escalas), hint: "datas no período" },
    { label: "Escalações", value: String(s.escalacoes), hint: "pessoas em vagas" },
    { label: "Vagas abertas", value: String(s.vagasAbertas), hint: "sem ninguém", danger: s.vagasAbertas > 0 },
    {
      label: "Membros escalados",
      value: `${s.membrosEscalados}/${s.membrosAtivos}`,
      hint: `${fmtPct(s.pctMembros)} dos ativos`,
    },
    { label: "Confirmações", value: fmtPct(s.pctConfirmadas), hint: "das escalações" },
    {
      label: "Faltas",
      value: fmtPct(s.pctFaltas),
      hint: "sem check-in, em dias encerrados",
      danger: (s.pctFaltas ?? 0) > 0,
    },
  ];

  return (
    <div>
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-text-muted mb-4">
        <ChevronLeft size={16} strokeWidth={1.8} />
        Gestão
      </Link>
      <h1 className="text-3xl text-text mb-4">Visão geral</h1>

      <div data-no-swipe className="flex gap-2 overflow-x-auto pb-1 mb-6">
        {OVERVIEW_PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/visao-geral?periodo=${p.key}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
              p.key === key ? "bg-primary/10 text-primary ring-primary/30" : "bg-surface-2 text-text-muted ring-border"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <li key={c.label}>
            <Card className="h-full">
              <p className="eyebrow mb-1">{c.label}</p>
              <p className={`font-title text-3xl ${c.danger ? "text-danger" : "text-primary"}`}>{c.value}</p>
              <p className="text-xs text-text-muted mt-1">{c.hint}</p>
            </Card>
          </li>
        ))}
      </ul>

      <p className="text-xs text-text-muted mt-4">
        Só datas publicadas entram na conta. Pessoa sem conta entra em escalações, mas não em confirmações nem faltas.
      </p>
    </div>
  );
}
