import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { notifyUser } from "@/modules/notifications/services/notify";
import { fmtDateTime } from "@/lib/time";

// Lider alterna uma ocorrencia entre rascunho e publicada. Publicar avisa quem
// o lider escalou (source LEADER, com conta); o dedupeKey e o mesmo da alocacao
// direta (assign:<allocationId>), entao quem ja foi avisado antes nao recebe de
// novo. Quem pegou a vaga sozinho (SELF) ou assumiu uma troca (SWAP) nunca foi
// "escalado" pelo lider e fica de fora. Data cancelada ou ja passada muda o
// flag mas nao avisa ninguem: rejeitar prenderia a data em rascunho sem volta.
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
  const live = occurrence.status === "ACTIVE" && occurrence.date > new Date();
  if (!params.published || !live) return { notified: 0 };

  const results = await Promise.all(
    occurrence.slots.flatMap((s) =>
      s.allocation?.userId && s.allocation.source === "LEADER"
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
