import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { notifyUser } from "@/modules/notifications/services/notify";
import type { MembershipStatus } from "@prisma/client";

// ledMinistryIds(userId, isAdmin) ja devolve TODOS os ministerios quando isAdmin,
// entao admin sempre passa aqui sem precisar de um caso separado.
export function canReviewMembership(params: {
  ledMinistryIds: string[];
  membershipMinistryId: string;
  status: MembershipStatus;
}): "OK" | "FORBIDDEN" | "ALREADY_REVIEWED" {
  if (params.status !== "PENDING") return "ALREADY_REVIEWED";
  return params.ledMinistryIds.includes(params.membershipMinistryId) ? "OK" : "FORBIDDEN";
}

// Lider (ou admin) aprova um pedido de entrada: ativa a membership e
// notifica o voluntario.
export async function approveMembership(params: { membershipId: string }) {
  const user = await requireUser();
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: params.membershipId },
    include: { ministry: true, user: true },
  });
  const ledIds = await ledMinistryIds(user.id, user.isAdmin);
  const decision = canReviewMembership({
    ledMinistryIds: ledIds,
    membershipMinistryId: membership.ministryId,
    status: membership.status,
  });
  if (decision === "FORBIDDEN") throw new Error("FORBIDDEN");
  if (decision === "ALREADY_REVIEWED") throw new Error("ALREADY_REVIEWED");

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
  const user = await requireUser();
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: params.membershipId },
    include: { ministry: true, user: true },
  });
  const ledIds = await ledMinistryIds(user.id, user.isAdmin);
  const decision = canReviewMembership({
    ledMinistryIds: ledIds,
    membershipMinistryId: membership.ministryId,
    status: membership.status,
  });
  if (decision === "FORBIDDEN") throw new Error("FORBIDDEN");
  if (decision === "ALREADY_REVIEWED") throw new Error("ALREADY_REVIEWED");

  // Captura os dados pra notificacao ANTES de deletar — a linha some depois.
  const { userId, ministryName, membershipId } = {
    userId: membership.userId,
    ministryName: membership.ministry.name,
    membershipId: membership.id,
  };

  await prisma.membership.delete({ where: { id: membership.id } });

  await notifyUser({
    userId,
    type: "ASSIGNMENT",
    dedupeKey: `membership-rejected:${membershipId}`,
    title: "Pedido não aprovado",
    body: `Seu pedido para participar do ministério ${ministryName} não foi aprovado`,
    url: "/",
  });
}
