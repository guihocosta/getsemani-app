import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/services/authz";
import { listUsers } from "@/modules/identity/services/listUsers";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { AdminToggleButton } from "./AdminToggleButton";
import { MembershipRow } from "./MembershipRow";

export const dynamic = "force-dynamic";

export default async function PessoasAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const users = await listUsers();

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Pessoas</h1>

      {users.length === 0 ? (
        <EmptyState title="Nenhuma pessoa cadastrada" />
      ) : (
        <ul className="flex flex-col gap-4">
          {users.map((u) => (
            <li key={u.id}>
              <Card>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-text">{u.name}</p>
                    <p className="text-xs text-text-muted">{u.email}</p>
                  </div>
                  <AdminToggleButton userId={u.id} isAdmin={u.isAdmin} />
                </div>

                {u.memberships.length === 0 ? (
                  <p className="text-sm text-text-muted">Sem ministérios.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {u.memberships.map((m) => (
                      <MembershipRow
                        key={m.id}
                        membershipId={m.id}
                        ministryName={m.ministry.name}
                        role={m.role}
                        status={m.status}
                      />
                    ))}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
