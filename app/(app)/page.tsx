import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, Cake, Megaphone, Music } from "lucide-react";
import { requireUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { ledMinistryIds, visibleMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { repertoireMinistries } from "@/modules/ministries/services/modules";
import { listPinnedAnnouncements } from "@/modules/announcements/services/announcements";
import { listBirthdays } from "@/modules/identity/services/birthdays";
import { isBirthdayToday } from "@/modules/identity/domain/birthday";
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
import { TodayCheckInCard } from "./TodayCheckInCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();

  const activeMembership = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
  });
  if (!activeMembership) redirect("/onboarding");

  const isLeader = await isLeaderOfAny(user.id);
  const showGestaoResumo = user.isAdmin || isLeader;

  const memberIds = await visibleMinistryIds(user.id, user.isAdmin);
  const todayKey = dateKey(new Date());
  const todayMonth = Number(todayKey.slice(5, 7));
  const [items, repertoire, pinned, birthdays, pendingCount] = await Promise.all([
    getMySchedule(user.id),
    repertoireMinistries(memberIds),
    listPinnedAnnouncements(memberIds),
    listBirthdays(todayMonth, memberIds),
    showGestaoResumo
      ? (async () => {
          const scopeIds = user.isAdmin ? undefined : await ledMinistryIds(user.id, false);
          return prisma.membership.count({
            where: { status: "PENDING", ...(scopeIds ? { ministryId: { in: scopeIds } } : {}) },
          });
        })()
      : Promise.resolve(0),
  ]);

  const birthdaysToday = birthdays.filter((b) => isBirthdayToday(b.day, todayMonth, todayKey));
  const pendingItems = items.filter((it) => it.status === "PENDING");
  
  const confirmedItems = items.filter((it) => it.status !== "PENDING");
  const todayItems = confirmedItems.filter((it) => dateKey(it.date) === todayKey);
  const futureItems = confirmedItems.filter((it) => dateKey(it.date) !== todayKey);

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

      {pinned.length > 0 && (
        <>
          <h2 className="eyebrow mb-3">Avisos em destaque</h2>
          <ul className="flex flex-col gap-2 mb-4">
            {pinned.map((a) => (
              <li key={a.id}>
                <Link href="/avisos">
                  <Card className="py-3">
                    <p className="eyebrow text-primary">{a.ministry}</p>
                    <p className="text-text">{a.title}</p>
                    <p className="text-sm text-text-muted line-clamp-2">{a.body}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Card className="mb-8 divide-y divide-border">
        <NavRow href="/avisos" label="Avisos" subtitle="Recados dos seus ministérios" Icon={Megaphone} />
        {repertoire.length > 0 && (
          <NavRow href="/repertorio" label="Repertório" subtitle="Músicas, tons e links" Icon={Music} />
        )}
        <NavRow
          href="/aniversariantes"
          label="Aniversariantes"
          subtitle={
            birthdaysToday.length > 0
              ? `Hoje: ${birthdaysToday.map((b) => b.name.split(" ")[0]).join(", ")}`
              : `${birthdays.length} neste mês`
          }
          Icon={Cake}
        />
      </Card>

      {pendingItems.length > 0 && <PendingConfirmationsCard items={pendingItems} />}

      {todayItems.length > 0 && <TodayCheckInCard items={todayItems} />}

      {futureItems.length === 0 ? (
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
                <p className="eyebrow text-primary">{futureItems[0].ministry}</p>
                <p className="text-xl text-text">{futureItems[0].role}</p>
                <p className="text-sm text-text-muted">{fmtDate(futureItems[0].date)}</p>
              </div>
              <p className="font-title text-3xl text-primary">{fmtTime(futureItems[0].date)}</p>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
              {futureItems[0].repertoireEnabled ? (
                <Link
                  href={`/repertorio/escala/${futureItems[0].occurrenceId}`}
                  className="text-sm text-primary font-medium underline underline-offset-2"
                >
                  Músicas
                </Link>
              ) : (
                <div />
              )}
              <AllocationActions
                allocationId={futureItems[0].allocationId}
                status={futureItems[0].status}
                hasSwapOpen={futureItems[0].hasSwapOpen}
                swapRequestId={futureItems[0].swapRequestId}
              />
            </div>
          </Card>

          {futureItems.length > 1 && (
            <>
              <h2 className="eyebrow mb-3">Depois</h2>
              <UpcomingCarousel items={futureItems.slice(1)} todayKey={todayKey} />
            </>
          )}
        </>
      )}
    </div>
  );
}
