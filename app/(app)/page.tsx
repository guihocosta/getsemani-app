import { redirect } from "next/navigation";
import { requireUser } from "@/modules/identity/services/authz";
import { prisma } from "@/lib/prisma";
import { getMySchedule } from "@/modules/scheduling/services/getMySchedule";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { EmptyState } from "@/ui/EmptyState";
import { fmtDate, fmtTime } from "@/lib/time";
import { RequestSwapButton } from "./RequestSwapButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();

  const activeMembership = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
  });
  if (!activeMembership) redirect("/onboarding");

  const items = await getMySchedule(user.id);

  return (
    <div>
      <header className="mb-6">
        <p className="text-sm text-text-muted">Olá,</p>
        <h1 className="text-3xl text-white">{user.name.split(" ")[0]}</h1>
      </header>

      <h2 className="eyebrow mb-3">Próximas escalas</h2>

      {items.length === 0 ? (
        <EmptyState
          title="Nenhuma escala próxima"
          subtitle="Quando você for escalado, aparece aqui."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.allocationId}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-primary">{it.ministry}</p>
                  <p className="text-lg text-white">{it.role}</p>
                  <p className="text-sm text-text-muted">{fmtDate(it.date)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="font-title text-2xl text-primary">{fmtTime(it.date)}</p>
                  {it.hasSwapOpen ? (
                    <Badge tone="info">troca pedida</Badge>
                  ) : (
                    <RequestSwapButton allocationId={it.allocationId} />
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
