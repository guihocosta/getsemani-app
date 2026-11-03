import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/time";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { notifyUser } from "@/modules/notifications/services/notify";
import {
  HorarioOcupado,
  parseTime,
  planRetime,
  retimeNotices,
  type RetimeOcc,
  type RetimePlan,
  type RetimeScope,
} from "../domain/retime";

const OCC_SELECT = {
  id: true,
  date: true,
  status: true,
  published: true,
  _count: { select: { songs: true } },
  slots: { select: { allocation: { select: { userId: true } } } },
} satisfies Prisma.OccurrenceSelect;

type OccRow = Prisma.OccurrenceGetPayload<{ select: typeof OCC_SELECT }>;

function toRetimeOcc(o: OccRow): RetimeOcc {
  return {
    id: o.id,
    date: o.date,
    status: o.status,
    published: o.published,
    songs: o._count.songs,
    userIds: o.slots.flatMap((s) => (s.allocation ? [s.allocation.userId] : [])),
  };
}

// Datas que podem mudar ou colidir: de hoje (dia local) em diante. A escolhida
// entra mesmo se for antiga, para a regra recusar com DATA_PASSADA.
export async function loadRetimeOccurrences(
  tx: Prisma.TransactionClient,
  scheduleId: string,
  now: Date,
  includeId?: string,
): Promise<RetimeOcc[]> {
  const fromToday = { date: { gte: startOfDay(now) } };
  const rows = await tx.occurrence.findMany({
    where: { scheduleId, ...(includeId ? { OR: [{ id: includeId }, fromToday] } : fromToday) },
    select: OCC_SELECT,
  });
  return rows.map(toRetimeOcc);
}

// Exclui antes de mover: o unique (scheduleId, date) recusaria a data nova
// enquanto a duplicata ainda ocupa o instante.
export async function applyRetime(tx: Prisma.TransactionClient, scheduleId: string, plan: RetimePlan) {
  if (plan.deletes.length > 0) {
    await tx.occurrence.deleteMany({ where: { id: { in: plan.deletes } } });
  }
  for (const m of plan.moves) {
    await tx.occurrence.update({ where: { id: m.id }, data: { date: m.to } });
  }
  if (plan.startTime) {
    await tx.schedule.update({ where: { id: scheduleId }, data: { startTime: plan.startTime } });
  }
}

// Duas mudancas ao mesmo tempo: quem perdeu cai no unique do banco. Acha qual
// instante foi tomado para mostrar a mesma mensagem da colisao comum.
export async function asHorarioOcupado(e: unknown, scheduleId: string, plan: RetimePlan | null): Promise<never> {
  if ((e as { code?: string })?.code !== "P2002" || !plan || plan.moves.length === 0) throw e;
  const taken = await prisma.occurrence.findFirst({
    where: {
      scheduleId,
      date: { in: plan.moves.map((m) => m.to) },
      id: { notIn: plan.moves.map((m) => m.id) },
    },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  throw new HorarioOcupado(taken?.date ?? plan.moves[0].to);
}

// Fora da transacao: o horario ja esta salvo. notifyUser nao lanca, mas um
// aviso que falhe nao pode virar erro para o lider. retimeNotices ja filtra
// rascunho (AD-006).
export async function notifyRetime(title: string, time: string, occurrences: RetimeOcc[], plan: RetimePlan) {
  const byId = new Map(occurrences.map((o) => [o.id, o]));
  const moved = plan.moves.flatMap((m) => {
    const o = byId.get(m.id);
    return o ? [{ ...o, to: m.to }] : [];
  });
  const lote = randomUUID();
  await Promise.allSettled(
    retimeNotices(title, time, moved).map((n) =>
      notifyUser({
        userId: n.userId,
        type: "ASSIGNMENT",
        dedupeKey: `retime:${lote}:${n.userId}`,
        title: "Horário alterado",
        body: n.body,
        url: "/",
      }),
    ),
  );
}

export async function retimeOccurrence(
  params: { occurrenceId: string; scope: RetimeScope; time: string },
  now = new Date(),
): Promise<{ moved: number }> {
  const time = parseTime(params.time);
  if (!time) throw new Error("HORARIO_INVALIDO");

  const occ = await prisma.occurrence.findUniqueOrThrow({
    where: { id: params.occurrenceId },
    include: { schedule: true },
  });
  await requireLeaderOf(occ.schedule.ministryId);

  let plan: RetimePlan | null = null;
  let occurrences: RetimeOcc[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      occurrences = await loadRetimeOccurrences(tx, occ.scheduleId, now, occ.id);
      const result = planRetime({
        occurrences,
        chosenId: occ.id,
        scope: params.scope,
        time,
        scheduleTime: occ.schedule.startTime,
        now,
      });
      if ("error" in result) throw new Error(result.error);
      if ("conflito" in result) throw new HorarioOcupado(result.conflito);
      plan = result;
      await applyRetime(tx, occ.scheduleId, result);
    });
  } catch (e) {
    await asHorarioOcupado(e, occ.scheduleId, plan);
  }

  const done = plan as RetimePlan | null;
  if (!done) return { moved: 0 };
  await notifyRetime(occ.schedule.title, time, occurrences, done);
  return { moved: done.moves.length };
}
