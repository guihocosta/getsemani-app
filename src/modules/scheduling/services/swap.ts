import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { SlotTaken } from "./allocateVolunteer";
import { notifyUser } from "@/modules/notifications/services/notify";
import { fmtDateTime } from "@/lib/time";

export class NotOwner extends Error {
  constructor() {
    super("NOT_OWNER");
  }
}

// Voluntario pede troca: cria SwapRequest OPEN. Slot vira pool aberto,
// mas a allocation original permanece ate alguem assumir (FR-009/010/024).
export async function requestSwap(params: { allocationId: string }) {
  const user = await requireUser();
  const alloc = await prisma.allocation.findUniqueOrThrow({
    where: { id: params.allocationId },
    include: {
      user: true,
      swapRequest: true,
      slot: {
        include: {
          role: true,
          occurrence: {
            include: {
              schedule: {
                include: { ministry: true },
              },
            },
          },
        },
      },
    },
  });
  if (alloc.userId !== user.id) throw new NotOwner();
  if (alloc.swapRequest && alloc.swapRequest.status === "OPEN") return alloc.swapRequest;

  const swapRequest = await prisma.swapRequest.create({
    data: { allocationId: alloc.id, requestedBy: user.id, status: "OPEN" },
  });

  const ministryId = alloc.slot.occurrence.schedule.ministryId;
  const members = await prisma.membership.findMany({
    where: { ministryId, status: "ACTIVE" },
  });
  const recipientIds = members
    .map((m) => m.userId)
    .filter((id) => id !== user.id);

  await Promise.all(
    recipientIds.map((recipientId) =>
      notifyUser({
        userId: recipientId,
        type: "SWAP",
        dedupeKey: `swap-request:${swapRequest.id}:${recipientId}`,
        title: "Vaga disponível para troca",
        body: `${alloc.user!.name} pediu troca em ${alloc.slot.occurrence.schedule.ministry.name} · ${alloc.slot.role.name} · ${fmtDateTime(alloc.slot.occurrence.date)}`,
        url: "/escalas",
        occurrenceId: alloc.slot.occurrenceId,
      }),
    ),
  );

  return swapRequest;
}

// Outro voluntario elegivel assume a escala em aberto. Transacao: cria nova
// Allocation(SWAP), remove a antiga, fecha a request como CLAIMED.
export async function claimSwap(params: { swapRequestId: string }) {
  const user = await requireUser();

  return prisma.$transaction(async (tx) => {
    const swap = await tx.swapRequest.findUniqueOrThrow({
      where: { id: params.swapRequestId },
      include: {
        allocation: {
          include: { slot: { include: { occurrence: { include: { schedule: true } } } } },
        },
      },
    });
    if (swap.status !== "OPEN") throw new SlotTaken();
    if (swap.requestedBy === user.id) throw new NotOwner();

    const ministryId = swap.allocation.slot.occurrence.schedule.ministryId;
    if (!user.isAdmin) {
      const member = await tx.membership.findFirst({
        where: { userId: user.id, ministryId, status: "ACTIVE" },
      });
      if (!member) throw new Error("NOT_ELIGIBLE");
    }

    // reatribui a allocation existente (mesmo slotId, evita cascade que apagaria o swap).
    // Zera checkedInAt: quem assumiu a troca ainda nao fez check-in, mesmo que
    // quem saiu tivesse feito.
    const updated = await tx.allocation.update({
      where: { id: swap.allocationId },
      data: {
        userId: user.id,
        source: "SWAP",
        overrideUnavailability: false,
        status: "CONFIRMED",
        respondedAt: new Date(),
        checkedInAt: null,
      },
    });
    await tx.swapRequest.update({
      where: { id: swap.id },
      data: { status: "CLAIMED", claimedBy: user.id, resolvedAt: new Date() },
    });
    return updated;
  });
}
