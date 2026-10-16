import { redirect } from "next/navigation";
import { getSessionUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { pendingMembershipCount } from "@/modules/identity/services/memberships";
import { AppShell } from "@/ui/AppShell";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Em paralelo: pendingMembershipCount ja devolve 0 pra quem nao lidera nada.
  const [isLeader, pendingCount] = await Promise.all([
    isLeaderOfAny(user.id),
    pendingMembershipCount(user.id, user.isAdmin),
  ]);

  return (
    <AppShell isAdmin={user.isAdmin} isLeader={isLeader} pendingCount={pendingCount}>
      <ServiceWorkerRegister />
      {children}
    </AppShell>
  );
}
