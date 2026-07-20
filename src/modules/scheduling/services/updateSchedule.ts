import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";

const Input = z.object({
  scheduleId: z.string().uuid(),
  title: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  recurrenceRule: z.string().min(3),
  recurrenceUntil: z.coerce.date().nullish(),
  roleIds: z.array(z.string().uuid()).min(1),
});

// Atualiza o template. Afeta apenas ocorrencias futuras ainda nao materializadas
// ou ainda nao passadas — materializeOccurrences() e idempotente por (scheduleId, date)
// e nao reescreve ocorrencias/alocacoes ja existentes.
export async function updateSchedule(raw: unknown) {
  const data = Input.parse(raw);

  const schedule = await prisma.schedule.findUniqueOrThrow({ where: { id: data.scheduleId } });
  await requireLeaderOf(schedule.ministryId);

  return prisma.$transaction(async (tx) => {
    await tx.scheduleRole.deleteMany({ where: { scheduleId: data.scheduleId } });
    return tx.schedule.update({
      where: { id: data.scheduleId },
      data: {
        title: data.title,
        startTime: data.startTime,
        recurrenceRule: data.recurrenceRule,
        recurrenceUntil: data.recurrenceUntil ?? null,
        defaultRoles: { create: data.roleIds.map((roleId) => ({ roleId })) },
      },
      include: { defaultRoles: true },
    });
  });
}
