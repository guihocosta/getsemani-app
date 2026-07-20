import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/services/authz";
import { listMinistries } from "@/modules/ministries/services/listMinistries";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { EmptyState } from "@/ui/EmptyState";
import { CreateMinistryForm } from "./CreateMinistryForm";
import { AddRoleForm } from "./AddRoleForm";
import { RemoveRoleButton } from "./RemoveRoleButton";

export const dynamic = "force-dynamic";

export default async function MinisteriosAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const ministries = await listMinistries();

  return (
    <div>
      <h1 className="text-3xl text-white mb-6">Ministérios</h1>

      <CreateMinistryForm />

      {ministries.length === 0 ? (
        <EmptyState title="Nenhum ministério cadastrado" subtitle="Crie o primeiro ministério acima." />
      ) : (
        <ul className="flex flex-col gap-4">
          {ministries.map((m) => (
            <li key={m.id}>
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0 ring-1 ring-border"
                      style={{ backgroundColor: m.color ?? "#6d28d9" }}
                    />
                    <p className="text-lg text-white">{m.name}</p>
                  </div>
                  <span className="text-sm text-text-muted">
                    {m._count.memberships} {m._count.memberships === 1 ? "membro" : "membros"}
                  </span>
                </div>
                {m.description && <p className="text-sm text-text-muted mb-3">{m.description}</p>}

                <p className="eyebrow mb-2">Funções</p>
                <ul className="flex flex-col gap-1.5">
                  {m.roles.length === 0 && <li className="text-sm text-text-muted">Nenhuma função cadastrada.</li>}
                  {m.roles.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white flex items-center gap-2">
                        {r.name}
                        {!r.active && (
                          <Badge tone="muted" className="text-[10px]">
                            Inativa
                          </Badge>
                        )}
                      </span>
                      {r.active && <RemoveRoleButton roleId={r.id} />}
                    </li>
                  ))}
                </ul>

                <AddRoleForm ministryId={m.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
