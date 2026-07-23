import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/modules/notifications/services/notify";
import { fmtDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const REMINDER_WINDOW_H = 24; // avisa escalas dentro das proximas 24h

// Dispara lembretes idempotentes (dedupeKey) para escalas proximas (FR-015, D7).
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const until = new Date(now.getTime() + REMINDER_WINDOW_H * 3600 * 1000);

  const allocs = await prisma.allocation.findMany({
    where: {
      slot: { occurrence: { status: "ACTIVE", date: { gte: now, lte: until } } },
    },
    include: {
      slot: {
        include: {
          role: true,
          occurrence: { include: { schedule: { include: { ministry: true } } } },
        },
      },
    },
  });

  const results = await Promise.all(
    allocs.map((a) => {
      const occ = a.slot.occurrence;
      const isPending = a.status === "PENDING";
      return notifyUser({
        userId: a.userId,
        type: "REMINDER",
        dedupeKey: `reminder:${a.id}:${occ.id}`,
        title: isPending
          ? `Confirme sua escala: ${a.slot.occurrence.schedule.ministry.name}`
          : `Lembrete: ${a.slot.occurrence.schedule.ministry.name}`,
        body: `${a.slot.role.name} · ${fmtDateTime(occ.date)}`,
        url: "/",
        occurrenceId: occ.id,
      });
    }),
  );
  const sent = results.filter((r) => r === "sent").length;

  return NextResponse.json({ ok: true, sent, scanned: allocs.length });
}
