import { redirect } from "next/navigation";
import { getSessionUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { pendingMembershipCount, visibleMinistryIds } from "@/modules/identity/services/memberships";
import { repertoireMinistries } from "@/modules/ministries/services/modules";
import { AppShell } from "@/ui/AppShell";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Em paralelo: pendingMembershipCount ja devolve 0 pra quem nao lidera nada.
  const [isLeader, pendingCount, memberIds] = await Promise.all([
    isLeaderOfAny(user.id),
    pendingMembershipCount(user.id, user.isAdmin),
    visibleMinistryIds(user.id, user.isAdmin),
  ]);
  const repertoire = await repertoireMinistries(memberIds);

  return (
    <AppShell
      isAdmin={user.isAdmin}
      isLeader={isLeader}
      hasRepertoire={repertoire.length > 0}
      pendingCount={pendingCount}
    >
      <ServiceWorkerRegister />
      {children}
    </AppShell>
  );
}
