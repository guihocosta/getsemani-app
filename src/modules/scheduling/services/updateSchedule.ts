import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { rotationCycleSchema } from "@/modules/scheduling/domain/rotation";
import { HorarioOcupado, planMoves, type RetimeOcc, type RetimePlan } from "@/modules/scheduling/domain/retime";
import { applyRetime, asHorarioOcupado, loadRetimeOccurrences, notifyRetime } from "./retimeOccurrences";

const Input = z.object({
  scheduleId: z.string().uuid(),
  title: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  recurrenceRule: z.string().min(3),
  recurrenceUntil: z.coerce.date().nullish(),
  rotationCycle: rotationCycleSchema,
  roleIds: z.array(z.string().uuid()).min(1),
});

// Atualiza o template. Se o horario mudou, move junto as datas ja criadas a
// partir de agora (como "Esta e as proximas"), na mesma transacao: senao a
// materializacao seguinte criaria outra data vazia no mesmo dia, no horario
// novo. Funcoes, titulo e recorrencia continuam valendo so para datas novas.
export async function updateSchedule(raw: unknown, now = new Date()) {
  const data = Input.parse(raw);

  const schedule = await prisma.schedule.findUniqueOrThrow({ where: { id: data.scheduleId } });
  await requireLeaderOf(schedule.ministryId);
  const retime = data.startTime !== schedule.startTime;

  let plan: RetimePlan | null = null;
  let occurrences: RetimeOcc[] = [];
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.scheduleRole.deleteMany({ where: { scheduleId: data.scheduleId } });
      const updated = await tx.schedule.update({
        where: { id: data.scheduleId },
        data: {
          title: data.title,
          startTime: data.startTime,
          recurrenceRule: data.recurrenceRule,
          recurrenceUntil: data.recurrenceUntil ?? null,
          rotationCycle: data.rotationCycle ?? null,
          defaultRoles: { create: data.roleIds.map((roleId) => ({ roleId })) },
        },
        include: { defaultRoles: true },
      });
      if (retime) {
        occurrences = await loadRetimeOccurrences(tx, data.scheduleId, now);
        const result = planMoves({
          occurrences,
          targets: occurrences.filter((o) => o.date >= now),
          time: data.startTime,
        });
        if ("conflito" in result) throw new HorarioOcupado(result.conflito);
        plan = result;
        await applyRetime(tx, data.scheduleId, result);
      }
      return updated;
    });
    const done = plan as RetimePlan | null;
    if (done) await notifyRetime(data.title, data.startTime, occurrences, done);
    return updated;
  } catch (e) {
    return asHorarioOcupado(e, data.scheduleId, plan);
  }
}
