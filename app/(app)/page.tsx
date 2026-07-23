import { redirect } from "next/navigation";
import { requireUser } from "@/modules/identity/services/authz";
import { prisma } from "@/lib/prisma";
import { getMySchedule } from "@/modules/scheduling/services/getMySchedule";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { EmptyState } from "@/ui/EmptyState";
import { fmtDate, fmtTime, dateKey } from "@/lib/time";
import { AllocationActions } from "./AllocationActions";
import { InstallPopup } from "./InstallPopup";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();

  const activeMembership = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
  });
  if (!activeMembership) redirect("/onboarding");

  const items = await getMySchedule(user.id);
  const todayKey = dateKey(new Date());

  return (
    <div>
      <InstallPopup />
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
              {items[0].status === "PENDING" && (
                <Badge tone="info" className="mt-1">
                  aguardando confirmação
                </Badge>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="font-title text-3xl text-primary">{fmtTime(items[0].date)}</p>
              <AllocationActions
                allocationId={items[0].allocationId}
                status={items[0].status}
                isToday={dateKey(items[0].date) === todayKey}
                checkedIn={!!items[0].checkedInAt}
                hasSwapOpen={items[0].hasSwapOpen}
              />
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
                        {it.status === "PENDING" && (
                          <Badge tone="info" className="mt-1">
                            aguardando confirmação
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="font-title text-2xl text-primary">{fmtTime(it.date)}</p>
                        <AllocationActions
                          allocationId={it.allocationId}
                          status={it.status}
                          isToday={dateKey(it.date) === todayKey}
                          checkedIn={!!it.checkedInAt}
                          hasSwapOpen={it.hasSwapOpen}
                        />
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
