import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";

// SINGLE: cancela apenas uma ocorrencia.
// FROM_HERE: seta recurrenceUntil e cancela ocorrencias futuras (>= data), preservando passadas.
export async function deleteScheduleOccurrence(params: {
  occurrenceId: string;
  scope: "SINGLE" | "FROM_HERE";
}) {
  const occ = await prisma.occurrence.findUniqueOrThrow({
    where: { id: params.occurrenceId },
    include: { schedule: true },
  });
  await requireLeaderOf(occ.schedule.ministryId);

  if (params.scope === "SINGLE") {
    return prisma.occurrence.update({
      where: { id: occ.id },
      data: { status: "CANCELLED", cancelledScope: "SINGLE" },
    });
  }

  // FROM_HERE
  return prisma.$transaction(async (tx) => {
    await tx.schedule.update({
      where: { id: occ.scheduleId },
      data: { recurrenceUntil: occ.date },
    });
    await tx.occurrence.updateMany({
      where: { scheduleId: occ.scheduleId, date: { gte: occ.date }, status: "ACTIVE" },
      data: { status: "CANCELLED", cancelledScope: "FROM_HERE" },
    });
    return { ok: true };
  });
}
