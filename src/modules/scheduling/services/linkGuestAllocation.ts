import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { hasUnavailabilityConflict } from "@/modules/availability/services/checkConflict";
import { notifyUser } from "@/modules/notifications/services/notify";
import { fmtDateTime } from "@/lib/time";
import { UnavailabilityBlocked } from "./allocateVolunteer";

export class NotGuest extends Error {
  constructor() {
    super("NOT_GUEST");
  }
}

export function decideLinkGuest(params: {
  hasUserId: boolean;
  hasConflict: boolean;
  override: boolean;
}): "OK" | "NOT_GUEST" | "UNAVAILABILITY_BLOCKED" {
  if (params.hasUserId) return "NOT_GUEST";
  if (params.hasConflict && !params.override) return "UNAVAILABILITY_BLOCKED";
  return "OK";
}

// Lider vincula manualmente uma alocacao guest a um usuario real (depois que
// a pessoa criou conta). Mantem status PENDING — o usuario ainda precisa
// confirmar pelo app, agora que passa a receber notificacao.
export async function linkGuestAllocation(params: {
  allocationId: string;
  userId: string;
  override?: boolean;
}) {
  const allocation = await prisma.allocation.findUniqueOrThrow({
    where: { id: params.allocationId },
    include: {
      slot: { include: { occurrence: { include: { schedule: true } }, role: true } },
    },
  });
  await requireLeaderOf(allocation.slot.occurrence.schedule.ministryId);

  const conflict = await hasUnavailabilityConflict(params.userId, allocation.slot.occurrence.date);
  const decision = decideLinkGuest({
    hasUserId: allocation.userId !== null,
    hasConflict: conflict,
    override: !!params.override,
  });
  if (decision === "NOT_GUEST") throw new NotGuest();
  if (decision === "UNAVAILABILITY_BLOCKED") throw new UnavailabilityBlocked();

  const updated = await prisma.allocation.update({
    where: { id: params.allocationId },
    data: {
      userId: params.userId,
      guestName: null,
      overrideUnavailability: conflict && !!params.override,
    },
  });

  await notifyUser({
    userId: params.userId,
    type: "ASSIGNMENT",
    dedupeKey: `assign:${updated.id}`,
    title: "Você foi escalado",
    body: `${allocation.slot.role.name} · ${fmtDateTime(allocation.slot.occurrence.date)}`,
    url: "/",
    occurrenceId: allocation.slot.occurrenceId,
  });

  return updated;
}
