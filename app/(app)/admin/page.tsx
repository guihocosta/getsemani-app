import { redirect } from "next/navigation";
import { Users2, Bell, ClipboardList } from "lucide-react";
import { getSessionUser } from "@/modules/identity/services/authz";
import { prisma } from "@/lib/prisma";
import { openSlots, loadByPerson, volunteersByMinistry } from "@/modules/reports/services/reports";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { NavRow } from "@/ui/NavRow";
import { fmtDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 864e5);
  const [open, load, byMinistry, pendingCount, ministryCount, personCount] = await Promise.all([
    openSlots(now),
    loadByPerson(new Date(now.getTime() - 30 * 864e5), in30),
    volunteersByMinistry(),
    prisma.membership.count({ where: { status: "PENDING" } }),
    prisma.ministry.count(),
    prisma.user.count(),
  ]);

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Gestão</h1>

      <Card className="mb-8 divide-y divide-border">
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
        <NavRow
          href="/solicitacoes"
          label="Solicitações"
          subtitle={pendingCount > 0 ? `${pendingCount} pendente(s)` : "Nenhum pedido pendente"}
          Icon={Bell}
        />
      </Card>

      <h2 className="eyebrow mb-3">Resumo</h2>

      <h3 className="text-sm text-text-muted mb-2">Vagas sem ninguém ({open.length})</h3>
      {open.length === 0 ? (
        <EmptyState title="Tudo alocado 🎉" />
      ) : (
        <ul className="flex flex-col gap-2 mb-8">
          {open.slice(0, 5).map((s) => (
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
          {open.length > 5 && (
            <p className="text-xs text-text-muted text-center">e mais {open.length - 5}…</p>
          )}
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
