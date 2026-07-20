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
        <h1 className="text-3xl text-text">{user.name.split(" ")[0]}</h1>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="Nenhuma escala próxima"
          subtitle="Quando você for escalado, aparece aqui."
        />
      ) : (
        <>
          <h2 className="eyebrow mb-3">Próxima escala</h2>
          <Card className="mb-8 flex items-center justify-between bg-primary/5 ring-1 ring-primary/20">
            <div>
              <p className="eyebrow text-primary">{items[0].ministry}</p>
              <p className="text-xl text-text">{items[0].role}</p>
              <p className="text-sm text-text-muted">{fmtDate(items[0].date)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="font-title text-3xl text-primary">{fmtTime(items[0].date)}</p>
              {items[0].hasSwapOpen ? (
                <Badge tone="info">troca pedida</Badge>
              ) : (
                <RequestSwapButton allocationId={items[0].allocationId} />
              )}
            </div>
          </Card>

          {items.length > 1 && (
            <>
              <h2 className="eyebrow mb-3">Depois</h2>
              <ul className="flex flex-col gap-3">
                {items.slice(1).map((it) => (
                  <li key={it.allocationId}>
                    <Card className="flex items-center justify-between">
                      <div>
                        <p className="eyebrow text-primary">{it.ministry}</p>
                        <p className="text-lg text-text">{it.role}</p>
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
            </>
          )}
        </>
      )}
    </div>
  );
}
