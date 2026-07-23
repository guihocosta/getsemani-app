import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtTime, dateKey, APP_TZ } from "@/lib/time";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export type MonthOccurrenceItem = {
  occurrenceId: string;
  scheduleId: string;
  dayKey: string; // yyyy-MM-dd
  title: string;
  when: string;
  slots: { slotId: string; role: string; allocatedName: string | null }[];
};

// Ocorrencias ativas de um mes, para os ministerios informados.
// Sem checagem de autorizacao aqui — o chamador (page/action) ja resolveu quais
// ministryIds o usuario pode ver antes de chamar isso.
export async function listMonthOccurrences(
  ministryIds: string[],
  year: number,
  month: number,
): Promise<MonthOccurrenceItem[]> {
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

  return occurrences.map((o) => ({
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
}

// Resolve os ministerios que o usuario lidera (ou todos, se admin) — usado pra
// autorizar tanto a page inicial quanto a action de troca de mes no calendario.
export async function ledMinistryIds(userId: string, isAdmin: boolean): Promise<string[]> {
  if (isAdmin) {
    return (await prisma.ministry.findMany({ select: { id: true } })).map((m) => m.id);
  }
  const memberships = await prisma.membership.findMany({
    where: { userId, role: "LEADER" },
    select: { ministryId: true },
  });
  return memberships.map((m) => m.ministryId);
}
