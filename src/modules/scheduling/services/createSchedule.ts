import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";

const Input = z.object({
  ministryId: z.string().uuid(),
  title: z.string().min(1),
  recurrenceRule: z.string().min(3), // ex: FREQ=WEEKLY;BYDAY=SU
  startDate: z.coerce.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.number().int().positive().default(120),
  roleIds: z.array(z.string().uuid()).min(1),
});

export async function createSchedule(raw: unknown) {
  const data = Input.parse(raw);
  const leader = await requireLeaderOf(data.ministryId);

  return prisma.schedule.create({
    data: {
      ministryId: data.ministryId,
      title: data.title,
      recurrenceRule: data.recurrenceRule,
      startDate: data.startDate,
      startTime: data.startTime,
      durationMin: data.durationMin,
      createdBy: leader.id,
      defaultRoles: { create: data.roleIds.map((roleId) => ({ roleId })) },
    },
    include: { defaultRoles: true },
  });
}
