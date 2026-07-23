import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/services/authz";
import { AppShell } from "@/ui/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
