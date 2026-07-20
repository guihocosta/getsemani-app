import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/services/authz";
import { openSlots, loadByPerson, volunteersByMinistry } from "@/modules/reports/services/reports";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { fmtDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 864e5);
  const [open, load, byMinistry] = await Promise.all([
    openSlots(now),
    loadByPerson(new Date(now.getTime() - 30 * 864e5), in30),
    volunteersByMinistry(),
  ]);

  return (
    <div>
      <h1 className="text-3xl text-text mb-3">Admin</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/admin/ministerios"
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-accent-soft text-primary ring-1 ring-primary/25 hover:brightness-110"
        >
          Ministérios
        </Link>
        <Link
          href="/admin/pessoas"
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-accent-soft text-primary ring-1 ring-primary/25 hover:brightness-110"
        >
          Pessoas
        </Link>
      </div>

      <h2 className="eyebrow mb-3">Vagas sem ninguém ({open.length})</h2>
      {open.length === 0 ? (
        <EmptyState title="Tudo alocado 🎉" />
      ) : (
        <ul className="flex flex-col gap-2 mb-8">
          {open.slice(0, 30).map((s) => (
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

      <h2 className="eyebrow mb-3">Carga por pessoa</h2>
      <Card className="mb-8">
        <ul className="flex flex-col gap-2">
          {load.map((p) => (
            <li key={p.userId} className="flex justify-between text-sm">
              <span className="text-text">{p.name}</span>
              <span className="font-title text-primary">{p.count}</span>
            </li>
          ))}
          {load.length === 0 && <li className="text-sm text-text-muted">Sem dados no período.</li>}
        </ul>
      </Card>

      <h2 className="eyebrow mb-3">Voluntários por ministério</h2>
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
