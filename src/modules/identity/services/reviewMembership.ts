import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { notifyUser } from "@/modules/notifications/services/notify";

// Lider (ou admin) aprova um pedido de entrada: ativa a membership e
// notifica o voluntario.
export async function approveMembership(params: { membershipId: string }) {
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: params.membershipId },
    include: { ministry: true, user: true },
  });
  await requireLeaderOf(membership.ministryId);

  const updated = await prisma.membership.update({
    where: { id: membership.id },
    data: { status: "ACTIVE" },
  });

  await notifyUser({
    userId: membership.userId,
    type: "ASSIGNMENT",
    dedupeKey: `membership-approved:${membership.id}`,
    title: "Pedido aprovado",
    body: `Seu pedido para participar do ministério ${membership.ministry.name} foi aprovado`,
    url: "/",
  });

  return updated;
}

// Lider (ou admin) recusa um pedido de entrada: remove a membership e
// notifica o voluntario.
export async function rejectMembership(params: { membershipId: string }) {
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: params.membershipId },
    include: { ministry: true, user: true },
  });
  await requireLeaderOf(membership.ministryId);

  await prisma.membership.delete({ where: { id: membership.id } });

  await notifyUser({
    userId: membership.userId,
    type: "ASSIGNMENT",
    dedupeKey: `membership-rejected:${membership.id}`,
    title: "Pedido não aprovado",
    body: `Seu pedido para participar do ministério ${membership.ministry.name} não foi aprovado`,
    url: "/",
  });
}
