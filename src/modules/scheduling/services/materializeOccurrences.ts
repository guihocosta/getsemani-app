import { prisma } from "@/lib/prisma";
import { expandOccurrences } from "../domain/recurrence";

const WINDOW_DAYS = 90;

// Gera Occurrence + Slots para todas as escalas ativas dentro da janela futura.
// Idempotente: unique (scheduleId, date) evita duplicar.
export async function materializeOccurrences(now = new Date()): Promise<number> {
  const from = now;
  const to = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const schedules = await prisma.schedule.findMany({ include: { defaultRoles: true } });
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

    for (const date of dates) {
      const existing = await prisma.occurrence.findUnique({
        where: { scheduleId_date: { scheduleId: s.id, date } },
      });
      if (existing) continue;

      await prisma.occurrence.create({
        data: {
          scheduleId: s.id,
          date,
          slots: { create: s.defaultRoles.map((dr) => ({ roleId: dr.roleId })) },
        },
      });
      created++;
    }
  }
  return created;
}
