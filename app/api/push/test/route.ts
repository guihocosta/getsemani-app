import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { getSessionUser } from "@/modules/identity/services/authz";

export const dynamic = "force-dynamic";

// Push de teste: envia so para o proprio usuario da sessao. Nao aceita userId
// como parametro, entao ninguem dispara notificacao para outra pessoa.
// Nao passa por notifyUser: teste nao e notificacao de dominio e nao merece
// linha em Notification, dedupeKey, nem valor novo no enum NotificationType.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id } });

  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        const ok = await sendPush(
          { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
          { title: "Getsemani", body: "Notificação de teste ✓", url: "/perfil" },
        );
        // Assinatura expirada (410/404): remove, mesma logica de notify.ts.
        if (!ok) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        return ok;
      } catch {
        return false;
      }
    }),
  );

  return NextResponse.json({ ok: true, sent: results.filter(Boolean).length });
}
