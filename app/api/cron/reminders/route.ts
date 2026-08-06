import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/modules/notifications/services/notify";
import { reminderStageFor, reminderCopy } from "@/modules/notifications/domain/reminders";
import { fmtDateTime, fmtTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const SCAN_WINDOW_H = 48; // cobre vespera (~24-48h) e hoje (0-24h) com folga

// Dispara lembretes idempotentes (dedupeKey) pra escalas de amanha e de hoje
// (FR-015, D7). Estagio decidido por dia-calendario, nao por horas: cron
// diario e best-effort e pode atrasar dentro da hora.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const until = new Date(now.getTime() + SCAN_WINDOW_H * 3600 * 1000);

  const allocs = await prisma.allocation.findMany({
    where: {
      userId: { not: null },
      slot: { occurrence: { status: "ACTIVE", date: { gte: now, lte: until } } },
    },
    include: {
      swapRequest: true,
      slot: {
        include: {
          role: true,
          occurrence: { include: { schedule: { include: { ministry: true } } } },
        },
      },
    },
  });

  const porEstagio: Record<string, number> = { vespera: 0, hoje: 0 };

  const results = await Promise.all(
    allocs.map(async (a) => {
      const occ = a.slot.occurrence;
      const stage = reminderStageFor({ now, occurrenceDate: occ.date });
      if (!stage) return null;

      const hasSwapOpen = a.swapRequest?.status === "OPEN";
      const { title, body } = reminderCopy({
        stage,
        hasSwapOpen,
        isPending: a.status === "PENDING",
        ministry: a.slot.occurrence.schedule.ministry.name,
        role: a.slot.role.name,
        date: stage === "hoje" ? fmtTime(occ.date) : fmtDateTime(occ.date),
      });

      const result = await notifyUser({
        userId: a.userId!,
        type: "REMINDER",
        dedupeKey: `reminder-${stage}:${a.id}:${occ.id}`,
        title,
        body,
        url: "/",
        occurrenceId: occ.id,
      });
      if (result === "sent") porEstagio[stage]++;
      return result;
    }),
  );
  const sent = results.filter((r) => r === "sent").length;

  return NextResponse.json({ ok: true, sent, scanned: allocs.length, porEstagio });
}
