import { prisma } from "@/lib/prisma";
import { requireUser, isLeaderOf } from "@/modules/identity/services/authz";
import { visibleMinistryIds } from "@/modules/identity/services/memberships";
import { ministryColor } from "@/modules/ministries/domain/color";
import type { AllocationStatus } from "@prisma/client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TeamSlot = {
  slotId: string;
  role: string;
  name: string | null; // null = vaga aberta
  isGuest: boolean;
  status: AllocationStatus | null;
  isMe: boolean;
};

// Quem serve numa data. Membro ativo do ministerio (ou admin) ve; rascunho so
// para quem gerencia (mesma regra de getSetlist). Do usuario sai so o nome.
export async function getOccurrenceTeam(occurrenceId: string) {
  const user = await requireUser();
  if (!UUID.test(occurrenceId)) throw new Error("NOT_FOUND");

  const o = await prisma.occurrence.findUnique({
    where: { id: occurrenceId },
    select: {
      id: true,
      date: true,
      status: true,
      published: true,
      schedule: {
        select: {
          title: true,
          ministryId: true,
          ministry: { select: { name: true, color: true, repertoireEnabled: true } },
        },
      },
      slots: {
        select: {
          id: true,
          active: true,
          role: { select: { name: true } },
          allocation: { select: { userId: true, guestName: true, status: true, user: { select: { name: true } } } },
        },
      },
    },
  });
  if (!o || o.status !== "ACTIVE") throw new Error("NOT_FOUND");

  const ministryId = o.schedule.ministryId;
  const visible = await visibleMinistryIds(user.id, user.isAdmin);
  if (!visible.includes(ministryId)) throw new Error("FORBIDDEN");
  if (!o.published && !(await isLeaderOf(user.id, ministryId))) throw new Error("FORBIDDEN");

  const slots: TeamSlot[] = o.slots
    .filter((s) => s.active)
    .sort((a, b) => a.role.name.localeCompare(b.role.name, "pt-BR"))
    .map((s) => ({
      slotId: s.id,
      role: s.role.name,
      name: s.allocation?.user?.name ?? s.allocation?.guestName ?? null,
      isGuest: !!s.allocation && s.allocation.userId === null,
      status: s.allocation?.status ?? null,
      isMe: !!s.allocation && s.allocation.userId === user.id,
    }));

  return {
    occurrenceId: o.id,
    date: o.date,
    title: o.schedule.title,
    ministry: o.schedule.ministry.name,
    ministryColor: ministryColor(o.schedule.ministry.color),
    repertoireEnabled: o.schedule.ministry.repertoireEnabled,
    slots,
  };
}

// Codigos que a pagina transforma em 404, sem revelar se a data existe.
export function isTeamMissingOrDenied(e: unknown): boolean {
  return e instanceof Error && (e.message === "NOT_FOUND" || e.message === "FORBIDDEN");
}
