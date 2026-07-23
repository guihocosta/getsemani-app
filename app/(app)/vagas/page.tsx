import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { Card } from "@/ui/Card";
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

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Vagas</h1>

      <h2 className="eyebrow mb-3">Escalas livres</h2>
      {freeSlots.length === 0 ? (
        <EmptyState title="Sem vagas livres" subtitle="Tudo preenchido nos seus ministérios." />
      ) : (
        <ul className="flex flex-col gap-3 mb-8">
          {freeSlots.map((s) => (
            <li key={s.id}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-primary">{s.occurrence.schedule.ministry.name}</p>
                  <p className="text-lg text-text">{s.role.name}</p>
                  <p className="text-sm text-text-muted">{fmtDateTime(s.occurrence.date)}</p>
                </div>
                <SelfAllocateButton slotId={s.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}

      <h2 className="eyebrow mb-3">Trocas abertas</h2>
      {swaps.length === 0 ? (
        <EmptyState title="Nenhuma troca aberta" />
      ) : (
        <ul className="flex flex-col gap-3">
          {swaps.map((sw) => {
            const s = sw.allocation.slot;
            return (
              <li key={sw.id}>
                <Card className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow text-primary">
                      {s.occurrence.schedule.ministry.name}
                    </p>
                    <p className="text-lg text-text">{s.role.name}</p>
                    <p className="text-sm text-text-muted">{fmtDateTime(s.occurrence.date)}</p>
                  </div>
                  <ClaimSwapButton swapRequestId={sw.id} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
