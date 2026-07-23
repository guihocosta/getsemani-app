import { redirect } from "next/navigation";
import { getSessionUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { AppShell } from "@/ui/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isLeader = await isLeaderOfAny(user.id);

  return (
    <AppShell isAdmin={user.isAdmin} isLeader={isLeader}>
      {children}
    </AppShell>
  );
}
