import { redirect } from "next/navigation";
import { Users2, Bell, ClipboardList, UserRoundPlus, ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { getSessionUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { prisma } from "@/lib/prisma";
import { ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { listGuestAllocations } from "@/modules/scheduling/services/listGuestAllocations";
import { openSlots, loadByPerson, volunteersByMinistry, attendanceRows } from "@/modules/reports/services/reports";
import { attendanceWindow, summarizeAttendance, attendanceView } from "@/modules/reports/domain/attendance";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { NavRow } from "@/ui/NavRow";
import { fmtDateTime, monthKey, monthLabel, monthWindow, parseMonthParam } from "@/lib/time";

export const dynamic = "force-dynamic";

function pad(n: number): string {
  return String(n).padStart(2, "0");
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
  const { year: vagasYear, month: vagasMonth } = parseMonthParam(vagasMes, {
    year: defYear,
    month: defMonth,
  });
  const { from: vagasFrom, to: vagasTo } = monthWindow(vagasYear, vagasMonth);
  // No mes corrente, comeca de "now" (vagas passadas ja nao sao acionaveis);
  // em outros meses o inicio do mes ja e o recorte certo.
  const isCurrentMonth = vagasYear === defYear && vagasMonth === defMonth;
  const openSlotsFrom = isCurrentMonth ? now : vagasFrom;

  const in30 = new Date(now.getTime() + 30 * 864e5);
  const { from: presencaFrom, to: presencaTo } = attendanceWindow(now);
  const [open, load, byMinistry, pendingCount, guests, presencaLinhas] = await Promise.all([
    openSlots(openSlotsFrom, vagasTo, scopeIds),
    loadByPerson(new Date(now.getTime() - 30 * 864e5), in30, scopeIds),
    volunteersByMinistry(scopeIds),
    prisma.membership.count({
      where: { status: "PENDING", ...(scopeIds ? { ministryId: { in: scopeIds } } : {}) },
    }),
    listGuestAllocations(guestMinistryIds),
    attendanceRows(presencaFrom, presencaTo, scopeIds),
  ]);
  const presenca = summarizeAttendance(presencaLinhas);
  const presencaView = attendanceView(presenca);

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
        <NavRow
          href="/admin/visao-geral"
          label="Visão geral"
          subtitle="Escalas, confirmações e faltas do período"
          Icon={LayoutDashboard}
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

      <h3 className="text-sm text-text-muted mb-2">Presença (últimos 30 dias)</h3>
      <Card className="mb-8">
        {presenca.taxa !== null && (
          <p className="text-sm text-text mb-2">
            <span className="font-title text-primary">{presenca.taxa}%</span> de presença em {presenca.total}{" "}
            {presenca.total === 1 ? "escalação" : "escalações"}
          </p>
        )}
        {presencaView.mensagem ? (
          <p className="text-sm text-text-muted">{presencaView.mensagem}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {presencaView.itens.map((p) => (
              <li key={p.userId} className="flex justify-between text-sm">
                <span className="text-text">{p.name}</span>
                <span className="text-danger">{p.label}</span>
              </li>
            ))}
          </ul>
        )}
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
