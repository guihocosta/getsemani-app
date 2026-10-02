import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/modules/identity/services/authz";
import { listMinistries } from "@/modules/ministries/services/listMinistries";
import {
  ledMinistryIds,
  visibleMinistryIds,
  listMonthOccurrences,
} from "@/modules/scheduling/services/listMonthOccurrences";
import { buildPanorama, pickMinistry } from "@/modules/scheduling/domain/panorama";
import { Badge } from "@/ui/Badge";
import { EmptyState } from "@/ui/EmptyState";
import { dateKey, monthLabel, monthWindow, parseMonthParam } from "@/lib/time";

export const dynamic = "force-dynamic";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function shiftMonth(year: number, month: number, delta: number): string {
  const total = year * 12 + (month - 1) + delta;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

export default async function PanoramaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ministerio?: string }>;
}) {
  const user = await requireUser();
  const { mes, ministerio } = await searchParams;

  const todayKey = dateKey(new Date());
  const [defYear, defMonth] = todayKey.split("-").map(Number);
  const { year, month } = parseMonthParam(mes, { year: defYear, month: defMonth });

  const [viewIds, manageIds, allMinistries] = await Promise.all([
    visibleMinistryIds(user.id, user.isAdmin),
    ledMinistryIds(user.id, user.isAdmin),
    listMinistries(),
  ]);
  // listMinistries ja vem em ordem de nome
  const visible = allMinistries.filter((m) => viewIds.includes(m.id));
  const ministry = pickMinistry(visible, ministerio);

  const voltar = (
    <Link href="/escalas" className="inline-flex items-center gap-1 text-sm text-text-muted mb-4">
      <ChevronLeft size={16} strokeWidth={1.8} />
      Escalas
    </Link>
  );

  if (!ministry) {
    return (
      <div>
        {voltar}
        <h1 className="text-3xl text-text mb-6">Panorama</h1>
        <EmptyState title="Você ainda não participa de nenhum ministério" subtitle="Peça acesso a um admin." />
      </div>
    );
  }

  const items = await listMonthOccurrences([ministry.id], year, month, manageIds);
  const panorama = buildPanorama(items, todayKey);
  const mesAtual = `${year}-${pad(month)}`;
  const href = (m: string, ministryId: string) => `/escalas/panorama?mes=${m}&ministerio=${ministryId}`;

  return (
    <div>
      {voltar}
      <h1 className="text-3xl text-text mb-4">Panorama</h1>

      {visible.length > 1 && (
        <div data-no-swipe className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {visible.map((m) => (
            <Link
              key={m.id}
              href={href(mesAtual, m.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                m.id === ministry.id
                  ? "bg-primary/10 text-primary ring-primary/30"
                  : "bg-surface-2 text-text-muted ring-border"
              }`}
            >
              {m.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <Link
          href={href(shiftMonth(year, month, -1), ministry.id)}
          aria-label="Mês anterior"
          className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-text"
        >
          <ChevronLeft size={18} strokeWidth={1.8} />
        </Link>
        <div className="text-center">
          <p className="text-text">{monthLabel(monthWindow(year, month).from)}</p>
          <p className="text-xs text-text-muted">
            {visible.length === 1 ? `${ministry.name} · ` : ""}
            {panorama.openCount === 0
              ? "nenhuma vaga aberta"
              : `${panorama.openCount} ${panorama.openCount === 1 ? "vaga aberta" : "vagas abertas"}`}
          </p>
        </div>
        <Link
          href={href(shiftMonth(year, month, 1), ministry.id)}
          aria-label="Próximo mês"
          className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-text"
        >
          <ChevronRight size={18} strokeWidth={1.8} />
        </Link>
      </div>

      {panorama.columns.length === 0 ? (
        <EmptyState title="Nenhuma escala neste mês" />
      ) : (
        <div data-no-swipe className="overflow-x-auto -mx-4 px-4">
          <table className="border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-bg text-left align-bottom pr-3 pb-2 text-xs font-semibold text-text-muted">
                  Função
                </th>
                {panorama.columns.map((c) => (
                  <th key={c.occurrenceId} className="px-2 pb-2 text-center align-bottom font-normal min-w-24">
                    <p className="text-text font-semibold">{c.dayLabel}</p>
                    <p className="text-xs text-text-muted">{c.time}</p>
                    {!c.published && (
                      <Badge tone="muted" className="mt-1 text-[10px]">
                        rascunho
                      </Badge>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {panorama.rows.map((r) => (
                <tr key={r.roleId}>
                  <th className="sticky left-0 z-10 bg-bg text-left pr-3 py-2 font-normal text-text-muted border-t border-border whitespace-nowrap">
                    {r.role}
                  </th>
                  {r.cells.map((cell, i) => (
                    <td
                      key={panorama.columns[i].occurrenceId}
                      className="px-2 py-2 text-center border-t border-border whitespace-nowrap"
                    >
                      {cell === null ? (
                        <span className="text-text-muted">·</span>
                      ) : cell.state === "open" ? (
                        <span className="text-danger font-medium">vaga aberta</span>
                      ) : (
                        <span className={cell.pending ? "text-text-muted" : "text-text"}>
                          {cell.name}
                          {cell.isGuest && <span className="text-xs text-text-muted"> (sem conta)</span>}
                          {cell.pending && <span className="text-xs"> ?</span>}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-text-muted mt-3">
            <span className="text-danger">vaga aberta</span> = ninguém escalado · nome com ? = aguardando confirmação ·
            · = função não usada na data
          </p>
        </div>
      )}
    </div>
  );
}
