import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import type { NotificationType } from "@prisma/client";

// Envia push para todos os devices do usuario, idempotente por dedupeKey.
export async function notifyUser(params: {
  userId: string;
  type: NotificationType;
  dedupeKey: string;
  title: string;
  body: string;
  url?: string;
  occurrenceId?: string;
}): Promise<"sent" | "duplicate"> {
  const existing = await prisma.notification.findUnique({
    where: { dedupeKey: params.dedupeKey },
  });
  if (existing?.sentAt) return "duplicate";

  const record =
    existing ??
    (await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        dedupeKey: params.dedupeKey,
        occurrenceId: params.occurrenceId,
      },
    }));

  const subs = await prisma.pushSubscription.findMany({ where: { userId: params.userId } });
  await Promise.all(
    subs.map(async (s) => {
      const ok = await sendPush(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        { title: params.title, body: params.body, url: params.url },
      );
      if (!ok) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
    }),
  );

  await prisma.notification.update({
    where: { id: record.id },
    data: { sentAt: new Date() },
  });
  return "sent";
}
