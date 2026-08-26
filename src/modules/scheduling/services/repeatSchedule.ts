import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { usersUnavailableAt } from "@/modules/availability/services/checkConflict";
import { notifyUser } from "@/modules/notifications/services/notify";
import { capableUserIdsForRole } from "@/modules/ministries/services/userSkills";
import { fmtDateTime } from "@/lib/time";
import { planRotationPairs, decideCopyAllocation } from "@/modules/scheduling/domain/rotation";

export class NoRotationCycle extends Error {
  constructor() {
    super("NO_ROTATION_CYCLE");
  }
}

export type RepeatResult = { filled: number; skipped: number };

// Lider repete a escalacao do ciclo anterior nas proximas rotationCycle
// ocorrencias futuras. Emparelha alvo[i] <- origem[i - cycle] sobre a lista
// de ocorrencias ACTIVE ordenada (planRotationPairs) e, por alocacao de
// origem, decide se copia (decideCopyAllocation). Nunca sobrescreve vaga
// ja preenchida; corrida de vaga (P2002) conta como pulada sem abortar o
// restante (espelha allocateVolunteer).
export async function repeatSchedule(scheduleId: string): Promise<RepeatResult> {
  const schedule = await prisma.schedule.findUniqueOrThrow({ where: { id: scheduleId } });
  await requireLeaderOf(schedule.ministryId);
  if (schedule.rotationCycle == null) throw new NoRotationCycle();

  const occurrences = await prisma.occurrence.findMany({
    where: { scheduleId, status: "ACTIVE" },
    orderBy: [{ date: "asc" }, { id: "asc" }],
    include: { slots: { include: { role: true, allocation: true } } },
  });

  const now = new Date();
  const firstFutureIndex = occurrences.findIndex((o) => o.date > now);
  const pairs = planRotationPairs({
    total: occurrences.length,
    cycle: schedule.rotationCycle,
    firstFutureIndex: firstFutureIndex === -1 ? occurrences.length : firstFutureIndex,
  });

  // Copias a fazer: uma por alocacao de origem com vaga de mesma funcao no destino.
  const copies: {
    targetSlotId: string;
    targetSlotActive: boolean;
    targetHasAllocation: boolean;
    targetOccurrenceId: string;
    targetDate: Date;
    roleName: string;
    sourceUserId: string | null;
    guestName: string | null;
    roleId: string;
  }[] = [];

  for (const pair of pairs) {
    if (pair.sourceIndex === null) continue;
    const source = occurrences[pair.sourceIndex];
    const target = occurrences[pair.targetIndex];
    const targetSlotByRole = new Map(target.slots.map((s) => [s.roleId, s]));

    for (const sourceSlot of source.slots) {
      if (!sourceSlot.allocation) continue; // vaga de origem vazia, nada a copiar
      const targetSlot = targetSlotByRole.get(sourceSlot.roleId);
      if (!targetSlot) continue; // REPT-04.6: sem vaga de mesma funcao no destino

      copies.push({
        targetSlotId: targetSlot.id,
        targetSlotActive: targetSlot.active,
        targetHasAllocation: !!targetSlot.allocation,
        targetOccurrenceId: target.id,
        targetDate: target.date,
        roleName: sourceSlot.role.name,
        sourceUserId: sourceSlot.allocation.userId,
        guestName: sourceSlot.allocation.guestName,
        roleId: sourceSlot.roleId,
      });
    }
  }

  // Resolucoes em lote (nao por alocacao): membership, capacitacao e indisponibilidade.
  const sourceUserIds = [...new Set(copies.map((c) => c.sourceUserId).filter((id): id is string => id !== null))];

  const activeMembers = new Set(
    (
      await prisma.membership.findMany({
        where: { userId: { in: sourceUserIds }, ministryId: schedule.ministryId, status: "ACTIVE" },
        select: { userId: true },
      })
    ).map((m) => m.userId),
  );

  const capableByRole = new Map<string, Set<string>>();
  for (const roleId of new Set(copies.map((c) => c.roleId))) {
    capableByRole.set(roleId, await capableUserIdsForRole(roleId));
  }

  const unavailableByDate = new Map<number, Set<string>>();
  for (const targetDate of new Set(copies.map((c) => c.targetDate.getTime()))) {
    unavailableByDate.set(targetDate, await usersUnavailableAt(sourceUserIds, new Date(targetDate)));
  }

  let filled = 0;
  let skipped = 0;

  for (const copy of copies) {
    const isActiveMember = copy.sourceUserId !== null && activeMembers.has(copy.sourceUserId);
    const isCapable = copy.sourceUserId !== null && (capableByRole.get(copy.roleId)?.has(copy.sourceUserId) ?? false);
    const hasConflict =
      copy.sourceUserId !== null && (unavailableByDate.get(copy.targetDate.getTime())?.has(copy.sourceUserId) ?? false);

    const decision = decideCopyAllocation({
      targetSlotActive: copy.targetSlotActive,
      targetHasAllocation: copy.targetHasAllocation,
      sourceUserId: copy.sourceUserId,
      isActiveMember,
      isCapable,
      hasConflict,
    });

    if (decision !== "OK") {
      skipped++;
      continue;
    }

    try {
      const alloc = await prisma.allocation.create({
        data: {
          slotId: copy.targetSlotId,
          userId: copy.sourceUserId ?? undefined,
          guestName: copy.guestName ?? undefined,
          source: "LEADER",
          status: "PENDING",
        },
      });
      filled++;

      if (copy.sourceUserId) {
        // notifyUser nunca lanca — falha de notificacao nao desfaz a alocacao ja gravada.
        await notifyUser({
          userId: copy.sourceUserId,
          type: "ASSIGNMENT",
          dedupeKey: `assign:${alloc.id}`,
          title: "Você foi escalado",
          body: `${copy.roleName} · ${fmtDateTime(copy.targetDate)}`,
          url: "/",
          occurrenceId: copy.targetOccurrenceId,
        });
      }
    } catch (e: unknown) {
      if ((e as { code?: string }).code === "P2002") {
        skipped++;
        continue;
      }
      throw e;
    }
  }

  return { filled, skipped };
}
