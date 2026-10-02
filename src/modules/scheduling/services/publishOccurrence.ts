import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { notifyUser } from "@/modules/notifications/services/notify";
import { fmtDateTime } from "@/lib/time";

// Lider alterna uma ocorrencia entre rascunho e publicada. Publicar avisa quem
// esta escalado com conta; o dedupeKey e o mesmo da alocacao direta
// (assign:<allocationId>), entao quem ja foi avisado antes nao recebe de novo.
export async function setOccurrencePublished(params: { occurrenceId: string; published: boolean }) {
  const occurrence = await prisma.occurrence.findUniqueOrThrow({
    where: { id: params.occurrenceId },
    include: { schedule: true, slots: { include: { role: true, allocation: true } } },
  });
  await requireLeaderOf(occurrence.schedule.ministryId);

  await prisma.occurrence.update({
    where: { id: params.occurrenceId },
    data: { published: params.published },
  });
  if (!params.published) return { notified: 0 };

  const results = await Promise.all(
    occurrence.slots.flatMap((s) =>
      s.allocation?.userId
        ? [
            notifyUser({
              userId: s.allocation.userId,
              type: "ASSIGNMENT",
              dedupeKey: `assign:${s.allocation.id}`,
              title: "Você foi escalado",
              body: `${s.role.name} · ${fmtDateTime(occurrence.date)}`,
              url: "/",
              occurrenceId: occurrence.id,
            }),
          ]
        : [],
    ),
  );
  return { notified: results.filter((r) => r === "sent").length };
}
