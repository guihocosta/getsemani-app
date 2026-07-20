import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { notifyUser } from "@/modules/notifications/services/notify";

export class AlreadyRequested extends Error {
  constructor() {
    super("ALREADY_REQUESTED");
  }
}

// Voluntario pede para entrar num ministerio. Cria Membership PENDING e
// notifica os lideres ativos do ministerio para revisarem o pedido.
export async function requestMembership(params: { ministryId: string }) {
  const user = await requireUser();

  const existing = await prisma.membership.findFirst({
    where: { userId: user.id, ministryId: params.ministryId, role: "VOLUNTEER" },
  });
  if (existing) {
    if (existing.status === "ACTIVE") return existing;
    throw new AlreadyRequested();
  }

  const ministry = await prisma.ministry.findUniqueOrThrow({
    where: { id: params.ministryId },
  });

  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      ministryId: params.ministryId,
      role: "VOLUNTEER",
      status: "PENDING",
    },
  });

  const leaders = await prisma.membership.findMany({
    where: { ministryId: params.ministryId, role: "LEADER", status: "ACTIVE" },
  });

  for (const leader of leaders) {
    await notifyUser({
      userId: leader.userId,
      type: "ASSIGNMENT",
      dedupeKey: `membership-request:${membership.id}:${leader.userId}`,
      title: "Novo pedido de entrada",
      body: `${user.name} pediu para participar do ministério ${ministry.name}`,
      url: "/solicitacoes",
    });
  }

  return membership;
}
