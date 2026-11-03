import { prisma } from "@/lib/prisma";
import { expandOccurrences, missingDays } from "../domain/recurrence";

const WINDOW_DAYS = 90;

// Gera Occurrence + Slots para escalas dentro da janela futura.
// Idempotente por dia local: data que ja existe naquele dia, em qualquer
// horario (o lider pode ter mudado), nao e criada de novo (AD-014).
// scheduleId opcional: materializa só uma serie (usado logo apos criar/editar
// uma escala, pra nao varrer todas as series existentes num caminho quente).
export async function materializeOccurrences(now = new Date(), scheduleId?: string): Promise<number> {
  const from = now;
  const to = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const schedules = await prisma.schedule.findMany({
    where: scheduleId ? { id: scheduleId } : undefined,
    include: { defaultRoles: true },
  });

  let created = 0;

  for (const s of schedules) {
    const dates = expandOccurrences(
      {
        recurrenceRule: s.recurrenceRule,
        startDate: s.startDate,
        startTime: s.startTime,
        recurrenceUntil: s.recurrenceUntil,
      },
      from,
      to,
    );
    if (dates.length === 0) continue;

    // Um dia de folga em cada ponta cobre qualquer horario dos dias extremos.
    const DAY = 24 * 60 * 60 * 1000;
    const existing = await prisma.occurrence.findMany({
      where: {
        scheduleId: s.id,
        date: { gte: new Date(dates[0].getTime() - DAY), lte: new Date(dates[dates.length - 1].getTime() + DAY) },
      },
      select: { date: true },
    });
    const missing = missingDays(
      dates,
      existing.map((e) => e.date),
    );
    if (missing.length === 0) continue;

    await prisma.$transaction(
      missing.map((date) =>
        prisma.occurrence.create({
          data: {
            scheduleId: s.id,
            date,
            slots: { create: s.defaultRoles.map((dr) => ({ roleId: dr.roleId })) },
          },
        }),
      ),
    );
    created += missing.length;
  }
  return created;
}
