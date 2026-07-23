import { prisma } from "@/lib/prisma";
import { expandOccurrences } from "../domain/recurrence";

const WINDOW_DAYS = 90;

// Gera Occurrence + Slots para escalas dentro da janela futura.
// Idempotente: unique (scheduleId, date) evita duplicar.
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

    const existing = await prisma.occurrence.findMany({
      where: { scheduleId: s.id, date: { in: dates } },
      select: { date: true },
    });
    const existingTimes = new Set(existing.map((e) => e.date.getTime()));
    const missing = dates.filter((d) => !existingTimes.has(d.getTime()));
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
