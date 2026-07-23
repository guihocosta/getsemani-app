import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/services/authz";
import { listMinistries } from "@/modules/ministries/services/listMinistries";
import { EmptyState } from "@/ui/EmptyState";
import { CreateMinistryForm } from "./CreateMinistryForm";
import { MinistryCard } from "./MinistryCard";

export const dynamic = "force-dynamic";

export default async function MinisteriosAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const ministries = await listMinistries();

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Ministérios</h1>

      <CreateMinistryForm />

      {ministries.length === 0 ? (
        <EmptyState title="Nenhum ministério cadastrado" subtitle="Crie o primeiro ministério acima." />
      ) : (
        <ul className="flex flex-col gap-4">
          {ministries.map((m) => (
            <li key={m.id}>
              <MinistryCard ministry={m} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
