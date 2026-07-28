import { redirect } from "next/navigation";
import { getSessionUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { listGuestAllocations } from "@/modules/scheduling/services/listGuestAllocations";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { GuestRow } from "./GuestRow";

export const dynamic = "force-dynamic";

export default async function ConvidadosAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isLeader = await isLeaderOfAny(user.id);
  if (!user.isAdmin && !isLeader) redirect("/");

  const ministryIds = await ledMinistryIds(user.id, user.isAdmin);
  const guests = await listGuestAllocations(ministryIds);

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Pessoas sem conta</h1>

      {guests.length === 0 ? (
        <EmptyState
          title="Ninguém pendente"
          subtitle="Pessoas escaladas sem conta aparecem aqui pra você vincular quando elas se cadastrarem."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {guests.map((g) => (
            <li key={g.guestName}>
              <Card>
                <GuestRow guest={g} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
