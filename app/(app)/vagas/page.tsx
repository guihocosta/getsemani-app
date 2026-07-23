import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { EmptyState } from "@/ui/EmptyState";
import { fmtDateTime } from "@/lib/time";
import { SelfAllocateButton, ClaimSwapButton } from "./buttons";

export const dynamic = "force-dynamic";

export default async function VagasPage() {
  const user = await requireUser();
  const now = new Date();

  const ministryIds = (
    await prisma.membership.findMany({ where: { userId: user.id }, select: { ministryId: true } })
  ).map((m) => m.ministryId);

  // vagas livres nos meus ministerios
  const freeSlots = await prisma.slot.findMany({
    where: {
      allocation: null,
      occurrence: {
        status: "ACTIVE",
        date: { gte: now },
        schedule: { ministryId: { in: ministryIds } },
      },
    },
    include: { role: true, occurrence: { include: { schedule: { include: { ministry: true } } } } },
    orderBy: { occurrence: { date: "asc" } },
    take: 50,
  });

  // trocas abertas nos meus ministerios (que nao sao minhas)
  const swaps = await prisma.swapRequest.findMany({
    where: {
      status: "OPEN",
      requestedBy: { not: user.id },
      allocation: { slot: { occurrence: { schedule: { ministryId: { in: ministryIds } } } } },
    },
    include: {
      allocation: {
        include: {
          slot: {
            include: { role: true, occurrence: { include: { schedule: { include: { ministry: true } } } } },
          },
        },
      },
    },
    take: 50,
  });

  type Item = {
    key: string;
    kind: "free" | "swap";
    date: Date;
    ministry: string;
    role: string;
    action: ReactNode;
  };

  const items: Item[] = [
    ...freeSlots.map((s) => ({
      key: `free-${s.id}`,
      kind: "free" as const,
      date: s.occurrence.date,
      ministry: s.occurrence.schedule.ministry.name,
      role: s.role.name,
      action: <SelfAllocateButton slotId={s.id} />,
    })),
    ...swaps.map((sw) => {
      const s = sw.allocation.slot;
      return {
        key: `swap-${sw.id}`,
        kind: "swap" as const,
        date: s.occurrence.date,
        ministry: s.occurrence.schedule.ministry.name,
        role: s.role.name,
        action: <ClaimSwapButton swapRequestId={sw.id} />,
      };
    }),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Vagas</h1>

      {items.length === 0 ? (
        <EmptyState title="Nenhuma vaga ou troca aberta" subtitle="Tudo preenchido nos seus ministérios." />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.key}>
              <Card className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="eyebrow text-primary">{it.ministry}</p>
                    <Badge tone={it.kind === "free" ? "info" : "muted"} className="text-[9px]">
                      {it.kind === "free" ? "vaga" : "troca"}
                    </Badge>
                  </div>
                  <p className="text-lg text-text">{it.role}</p>
                  <p className="text-sm text-text-muted">{fmtDateTime(it.date)}</p>
                </div>
                {it.action}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
