import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { EmptyState } from "@/ui/EmptyState";
import { fmtDate, fmtTime, dateKey, APP_TZ } from "@/lib/time";
import { EscalaCalendar } from "./EscalaCalendar";

export const dynamic = "force-dynamic";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default async function EscalasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await requireUser();
  const { mes } = await searchParams;

  const now = new Date();
  const todayKey = dateKey(now);
  const [defYear, defMonth] = todayKey.split("-").map(Number);
  const [year, month] =
    mes && /^\d{4}-\d{2}$/.test(mes) ? mes.split("-").map(Number) : [defYear, defMonth];

  const led = user.isAdmin
    ? await prisma.ministry.findMany({ include: { roles: true } })
    : (
        await prisma.membership.findMany({
          where: { userId: user.id, role: "LEADER" },
          include: { ministry: { include: { roles: true } } },
        })
      ).map((m) => m.ministry);

  if (led.length === 0) {
    return (
      <div>
        <h1 className="text-3xl text-text mb-6">Escalas</h1>
        <EmptyState title="Você não lidera ministérios" subtitle="Peça acesso a um admin." />
      </div>
    );
  }

  const ministryIds = led.map((m) => m.id);
  const monthStart = fromZonedTime(`${year}-${pad(month)}-01T00:00:00`, APP_TZ);
  const nextMonthDate = month === 12 ? [year + 1, 1] : [year, month + 1];
  const monthEnd = fromZonedTime(`${nextMonthDate[0]}-${pad(nextMonthDate[1])}-01T00:00:00`, APP_TZ);

  const occurrences = await prisma.occurrence.findMany({
    where: {
      status: "ACTIVE",
      date: { gte: monthStart, lt: monthEnd },
      schedule: { ministryId: { in: ministryIds } },
    },
    include: {
      schedule: { include: { ministry: true } },
      slots: { include: { role: true, allocation: { include: { user: true } } } },
    },
    orderBy: { date: "asc" },
  });

  const volunteers = await prisma.membership.findMany({
    where: { ministryId: { in: ministryIds }, role: "VOLUNTEER" },
    include: { user: true },
  });

  const items = occurrences.map((o) => ({
    occurrenceId: o.id,
    scheduleId: o.scheduleId,
    dayKey: dateKey(o.date),
    title: `${o.schedule.ministry.name} · ${o.schedule.title}`,
    when: `${fmtDate(o.date)} · ${fmtTime(o.date)}`,
    slots: o.slots.map((s) => ({
      slotId: s.id,
      role: s.role.name,
      allocatedName: s.allocation?.user.name ?? null,
    })),
  }));

  return (
    <div>
      <EscalaCalendar
        year={year}
        month={month}
        todayKey={todayKey}
        occurrences={items}
        volunteers={volunteers.map((v) => ({ id: v.user.id, name: v.user.name }))}
      />
    </div>
  );
}
