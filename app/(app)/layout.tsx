import { redirect } from "next/navigation";
import { getSessionUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/ui/AppShell";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isLeader = await isLeaderOfAny(user.id);

  let pendingCount = 0;
  if (user.isAdmin || isLeader) {
    const scopeIds = user.isAdmin ? undefined : await ledMinistryIds(user.id, false);
    pendingCount = await prisma.membership.count({
      where: { status: "PENDING", ...(scopeIds ? { ministryId: { in: scopeIds } } : {}) },
    });
  }

  return (
    <AppShell isAdmin={user.isAdmin} isLeader={isLeader} pendingCount={pendingCount}>
      <ServiceWorkerRegister />
      {children}
    </AppShell>
  );
}
