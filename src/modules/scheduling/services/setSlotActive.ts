import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { notifyUser } from "@/modules/notifications/services/notify";
import { fmtDateTime } from "@/lib/time";

// Lider ativa/desativa uma vaga (funcao) so nesta ocorrencia, sem tocar a
// serie recorrente — usado quando aquele culto especifico nao precisa dessa
// funcao. Desativar com alguem alocado remove a alocacao (avisa quem tinha
// conta); reativar sempre volta vazia, sem recuperar quem estava antes.
export async function setSlotActive(params: { slotId: string; active: boolean }) {
  const slot = await prisma.slot.findUniqueOrThrow({
    where: { id: params.slotId },
    include: {
      occurrence: { include: { schedule: true } },
      allocation: { include: { swapRequest: true } },
      role: true,
    },
  });
  await requireLeaderOf(slot.occurrence.schedule.ministryId);

  if (!params.active && slot.allocation) {
    await prisma.allocation.delete({ where: { id: slot.allocation.id } });
    if (slot.allocation.userId && slot.allocation.swapRequest?.status === "OPEN") {
      await notifyUser({
        userId: slot.allocation.userId,
        type: "SWAP",
        dedupeKey: `swap-ended:${slot.allocation.swapRequest.id}`,
        title: "Seu pedido de troca foi encerrado",
        body: `O líder alterou a escala · ${slot.role.name} · ${fmtDateTime(slot.occurrence.date)}`,
        url: "/",
        occurrenceId: slot.occurrenceId,
      });
    }
    if (slot.allocation.userId) {
      await notifyUser({
        userId: slot.allocation.userId,
        type: "ASSIGNMENT",
        dedupeKey: `unassign:${slot.allocation.id}`,
        title: "Você foi removido de uma escala",
        body: `${slot.role.name} · ${fmtDateTime(slot.occurrence.date)}`,
        url: "/",
        occurrenceId: slot.occurrenceId,
      });
    }
  }

  return prisma.slot.update({ where: { id: params.slotId }, data: { active: params.active } });
}
