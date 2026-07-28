import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { requireUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { prisma } from "@/lib/prisma";
import { getMySchedule } from "@/modules/scheduling/services/getMySchedule";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { NavRow } from "@/ui/NavRow";
import { fmtDate, fmtTime, dateKey } from "@/lib/time";
import { AllocationActions } from "./AllocationActions";
import { UpcomingCarousel } from "./UpcomingCarousel";
import { InstallPopup } from "./InstallPopup";
import { PendingConfirmationsCard } from "./PendingConfirmationsCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();

  const activeMembership = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
  });
  if (!activeMembership) redirect("/onboarding");

  const isLeader = await isLeaderOfAny(user.id);
  const showGestaoResumo = user.isAdmin || isLeader;

  const [items, pendingCount] = await Promise.all([
    getMySchedule(user.id),
    showGestaoResumo
      ? (async () => {
          const scopeIds = user.isAdmin ? undefined : await ledMinistryIds(user.id, false);
          return prisma.membership.count({
            where: { status: "PENDING", ...(scopeIds ? { ministryId: { in: scopeIds } } : {}) },
          });
        })()
      : Promise.resolve(0),
  ]);

  const todayKey = dateKey(new Date());
  const pendingItems = items.filter((it) => it.status === "PENDING");
  const confirmedItems = items.filter((it) => it.status !== "PENDING");

  return (
    <div>
      <InstallPopup />
      <header className="mb-6">
        <p className="text-sm text-text-muted">Olá,</p>
        <h1 className="text-3xl text-text">{user.name.split(" ")[0]}</h1>
      </header>

      {showGestaoResumo && (
        <Card className="mb-8">
          <NavRow
            href="/solicitacoes"
            label="Solicitações"
            subtitle={pendingCount > 0 ? `${pendingCount} pendente(s)` : "Nenhum pedido pendente"}
            Icon={Bell}
          />
        </Card>
      )}

      {pendingItems.length > 0 && <PendingConfirmationsCard items={pendingItems} />}

      {confirmedItems.length === 0 ? (
        <EmptyState
          title="Nenhuma escala próxima"
          subtitle="Quando você for escalado e confirmar, aparecerá aqui."
        />
      ) : (
        <>
          <h2 className="eyebrow mb-3">Próxima escala</h2>
          <Card className="mb-8 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow text-primary">{confirmedItems[0].ministry}</p>
                <p className="text-xl text-text">{confirmedItems[0].role}</p>
                <p className="text-sm text-text-muted">{fmtDate(confirmedItems[0].date)}</p>
              </div>
              <p className="font-title text-3xl text-primary">{fmtTime(confirmedItems[0].date)}</p>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
              <div />
              <AllocationActions
                allocationId={confirmedItems[0].allocationId}
                status={confirmedItems[0].status}
                isToday={dateKey(confirmedItems[0].date) === todayKey}
                checkedIn={!!confirmedItems[0].checkedInAt}
                hasSwapOpen={confirmedItems[0].hasSwapOpen}
              />
            </div>
          </Card>

          {confirmedItems.length > 1 && (
            <>
              <h2 className="eyebrow mb-3">Depois</h2>
              <UpcomingCarousel items={confirmedItems.slice(1)} todayKey={todayKey} />
            </>
          )}
        </>
      )}
    </div>
  );
}
