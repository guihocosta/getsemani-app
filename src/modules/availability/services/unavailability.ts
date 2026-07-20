import { z } from "zod";
import { prisma } from "@/lib/prisma";

const AddInput = z.object({
  userId: z.string().uuid(),
  date: z.coerce.date(),
  allDay: z.boolean().default(true),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function addUnavailability(raw: unknown) {
  const d = AddInput.parse(raw);
  return prisma.unavailability.create({
    data: {
      userId: d.userId,
      date: d.date,
      year: d.date.getUTCFullYear(),
      month: d.date.getUTCMonth() + 1,
      startTime: d.allDay ? null : d.startTime,
      endTime: d.allDay ? null : d.endTime,
    },
  });
}

export async function removeUnavailability(id: string, userId: string) {
  await prisma.unavailability.deleteMany({ where: { id, userId } });
}

export async function listUnavailability(userId: string, year: number, month: number) {
  return prisma.unavailability.findMany({
    where: { userId, year, month },
    orderBy: { date: "asc" },
  });
}
