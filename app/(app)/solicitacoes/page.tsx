import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/services/authz";
import { prisma } from "@/lib/prisma";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { ReviewButtons } from "./buttons";

export const dynamic = "force-dynamic";

export default async function SolicitacoesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  let ministryIds: string[] | null = null;
  if (!user.isAdmin) {
    const leaderships = await prisma.membership.findMany({
      where: { userId: user.id, role: "LEADER", status: "ACTIVE" },
    });
    if (leaderships.length === 0) redirect("/");
    ministryIds = leaderships.map((m) => m.ministryId);
  }

  const pending = await prisma.membership.findMany({
    where: {
      status: "PENDING",
      ...(ministryIds ? { ministryId: { in: ministryIds } } : {}),
    },
    include: { user: true, ministry: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl text-text">Solicitações</h1>
      </header>

      {pending.length === 0 ? (
        <EmptyState title="Nenhum pedido pendente" />
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((m) => (
            <li key={m.id}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-lg text-text">{m.user.name}</p>
                  <p className="text-sm text-text-muted">{m.ministry.name}</p>
                </div>
                <ReviewButtons membershipId={m.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
