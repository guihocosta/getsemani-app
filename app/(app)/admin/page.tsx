import { redirect } from "next/navigation";
import { Users2, Bell, ClipboardList, UserRoundPlus, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { fromZonedTime } from "date-fns-tz";
import { getSessionUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { prisma } from "@/lib/prisma";
import { ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { listGuestAllocations } from "@/modules/scheduling/services/listGuestAllocations";
import { openSlots, loadByPerson, volunteersByMinistry } from "@/modules/reports/services/reports";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { NavRow } from "@/ui/NavRow";
import { fmtDateTime, monthKey, monthLabel, APP_TZ } from "@/lib/time";

export const dynamic = "force-dynamic";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthWindow(year: number, month: number): { from: Date; to: Date } {
  const from = fromZonedTime(`${year}-${pad(month)}-01T00:00:00`, APP_TZ);
  const [nextYear, nextMonth] = month === 12 ? [year + 1, 1] : [year, month + 1];
  const to = fromZonedTime(`${nextYear}-${pad(nextMonth)}-01T00:00:00`, APP_TZ);
  return { from, to };
}

function shiftMonth(year: number, month: number, delta: number): [number, number] {
  const total = year * 12 + (month - 1) + delta;
  return [Math.floor(total / 12), (total % 12) + 1];
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ vagasMes?: string }>;
}) {
  const { vagasMes } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isLeader = await isLeaderOfAny(user.id);
  if (!user.isAdmin && !isLeader) redirect("/");

  // Admin ve relatorios globais; lider ve so os ministerios que lidera.
  const scopeIds = user.isAdmin ? undefined : await ledMinistryIds(user.id, false);
  const guestMinistryIds = await ledMinistryIds(user.id, user.isAdmin);

  const now = new Date();
  const nowKey = monthKey(now);
  const [defYear, defMonth] = nowKey.split("-").map(Number);
  const vagasMesMatch = vagasMes?.match(/^(\d{4})-(\d{2})$/);
  const vagasMesMonth = vagasMesMatch ? Number(vagasMesMatch[2]) : null;
  const [vagasYear, vagasMonth] =
    vagasMesMatch && vagasMesMonth !== null && vagasMesMonth >= 1 && vagasMesMonth <= 12
      ? [Number(vagasMesMatch[1]), vagasMesMonth]
      : [defYear, defMonth];
  const { from: vagasFrom, to: vagasTo } = monthWindow(vagasYear, vagasMonth);

  const in30 = new Date(now.getTime() + 30 * 864e5);
  const [open, load, byMinistry, pendingCount, guests] = await Promise.all([
    openSlots(vagasFrom, vagasTo, scopeIds),
    loadByPerson(new Date(now.getTime() - 30 * 864e5), in30, scopeIds),
    volunteersByMinistry(scopeIds),
    prisma.membership.count({
      where: { status: "PENDING", ...(scopeIds ? { ministryId: { in: scopeIds } } : {}) },
    }),
    listGuestAllocations(guestMinistryIds),
  ]);

  const [ministryCount, personCount] = user.isAdmin
    ? await Promise.all([prisma.ministry.count(), prisma.user.count()])
    : [0, 0];

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Gestão</h1>

      <Card className="mb-8 divide-y divide-border">
        {user.isAdmin && (
          <>
            <NavRow
              href="/admin/ministerios"
              label="Ministérios"
              subtitle={`${ministryCount} ${ministryCount === 1 ? "cadastrado" : "cadastrados"}`}
              Icon={ClipboardList}
            />
            <NavRow
              href="/admin/pessoas"
              label="Pessoas"
              subtitle={`${personCount} ${personCount === 1 ? "pessoa" : "pessoas"}`}
              Icon={Users2}
            />
          </>
        )}
        <NavRow
          href="/solicitacoes"
          label="Solicitações"
          subtitle={pendingCount > 0 ? `${pendingCount} pendente(s)` : "Nenhum pedido pendente"}
          Icon={Bell}
        />
        <NavRow
          href="/admin/convidados"
          label="Pessoas sem conta"
          subtitle={guests.length > 0 ? `${guests.length} pendente(s)` : "Nenhuma pendente"}
          Icon={UserRoundPlus}
        />
      </Card>

      <h2 className="eyebrow mb-3">Resumo</h2>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm text-text-muted">Vagas sem ninguém ({open.length})</h3>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin?vagasMes=${(() => {
              const [py, pm] = shiftMonth(vagasYear, vagasMonth, -1);
              return `${py}-${pad(pm)}`;
            })()}`}
            className="text-text-muted hover:text-text"
          >
            <ChevronLeft size={16} />
          </Link>
          <p className="text-xs text-text-muted whitespace-nowrap">{monthLabel(vagasFrom)}</p>
          <Link
            href={`/admin?vagasMes=${(() => {
              const [ny, nm] = shiftMonth(vagasYear, vagasMonth, 1);
              return `${ny}-${pad(nm)}`;
            })()}`}
            className="text-text-muted hover:text-text"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
      {open.length === 0 ? (
        <div className="mb-8">
          <EmptyState title="Nenhuma vaga em aberto neste mês" />
        </div>
      ) : (
        <ul className="flex flex-col gap-2 mb-8">
          {open.map((s) => (
            <li key={s.slotId}>
              <Card className="flex items-center justify-between py-3">
                <div>
                  <p className="eyebrow text-primary">{s.ministry}</p>
                  <p className="text-text">{s.role}</p>
                </div>
                <span className="text-sm text-text-muted">{fmtDateTime(s.date)}</span>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <h3 className="text-sm text-text-muted mb-2">Carga por pessoa</h3>
      <Card className="mb-8">
        <ul className="flex flex-col gap-2">
          {load.slice(0, 5).map((p) => (
            <li key={p.userId} className="flex justify-between text-sm">
              <span className="text-text">{p.name}</span>
              <span className="font-title text-primary">{p.count}</span>
            </li>
          ))}
          {load.length === 0 && <li className="text-sm text-text-muted">Sem dados no período.</li>}
        </ul>
      </Card>

      <h3 className="text-sm text-text-muted mb-2">Voluntários por ministério</h3>
      <Card>
        <ul className="flex flex-col gap-2">
          {byMinistry.map((m) => (
            <li key={m.ministryId} className="flex justify-between text-sm">
              <span className="text-text">{m.name}</span>
              <span className={m.count === 0 ? "text-danger" : "text-primary"}>{m.count}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
