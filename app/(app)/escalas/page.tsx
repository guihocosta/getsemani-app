import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { Button } from "@/ui/Button";
import { fmtDateTime } from "@/lib/time";
import { createScheduleAction } from "./actions";
import { OccurrenceRow } from "./OccurrenceRow";

export const dynamic = "force-dynamic";

export default async function EscalasPage() {
  const user = await requireUser();

  // ministerios que lidero (ou todos, se admin)
  const led = user.isAdmin
    ? await prisma.ministry.findMany({ include: { roles: true } })
    : (
        await prisma.membership.findMany({
          where: { userId: user.id, role: "LEADER" },
          include: { ministry: { include: { roles: true } } },
        })
      ).map((m) => m.ministry);

  if (led.length === 0) {
    return (
      <div>
        <h1 className="text-3xl text-white mb-6">Escalas</h1>
        <EmptyState title="Você não lidera ministérios" subtitle="Peça acesso a um admin." />
      </div>
    );
  }

  const ministryIds = led.map((m) => m.id);
  const now = new Date();

  const occurrences = await prisma.occurrence.findMany({
    where: {
      status: "ACTIVE",
      date: { gte: now },
      schedule: { ministryId: { in: ministryIds } },
    },
    include: {
      schedule: { include: { ministry: true } },
      slots: { include: { role: true, allocation: { include: { user: true } } } },
    },
    orderBy: { date: "asc" },
    take: 30,
  });

  const volunteers = await prisma.membership.findMany({
    where: { ministryId: { in: ministryIds }, role: "VOLUNTEER" },
    include: { user: true },
  });

  return (
    <div>
      <h1 className="text-3xl text-white mb-6">Escalas</h1>

      <Card className="mb-8">
        <h2 className="eyebrow mb-3">Nova escala recorrente</h2>
        <form action={createScheduleAction} className="flex flex-col gap-3">
          <select name="ministryId" className="field" required>
            {led.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            name="title"
            placeholder="Título (ex: Culto de Domingo)"
            required
            className="field"
          />
          <select name="recurrenceRule" className="field">
            <option value="FREQ=WEEKLY;BYDAY=SU">Toda semana — Domingo</option>
            <option value="FREQ=WEEKLY;BYDAY=WE">Toda semana — Quarta</option>
            <option value="FREQ=WEEKLY;BYDAY=SA">Toda semana — Sábado</option>
          </select>
          <div className="flex gap-2">
            <input type="date" name="startDate" required className="field flex-1" />
            <input type="time" name="startTime" defaultValue="19:00" required className="field flex-1" />
          </div>
          <p className="text-xs text-text-muted">Funções:</p>
          <div className="flex flex-wrap gap-2">
            {led
              .flatMap((m) => m.roles)
              .map((r) => (
                <label key={r.id} className="text-xs flex items-center gap-1 text-text-muted">
                  <input type="checkbox" name="roleIds" value={r.id} /> {r.name}
                </label>
              ))}
          </div>
          <Button type="submit">Criar</Button>
        </form>
      </Card>

      <h2 className="eyebrow mb-3">Próximas ocorrências</h2>
      {occurrences.length === 0 ? (
        <EmptyState title="Nenhuma ocorrência" subtitle="Crie uma escala acima." />
      ) : (
        <ul className="flex flex-col gap-3">
          {occurrences.map((o) => (
            <OccurrenceRow
              key={o.id}
              occurrenceId={o.id}
              title={`${o.schedule.ministry.name} · ${o.schedule.title}`}
              when={fmtDateTime(o.date)}
              slots={o.slots.map((s) => ({
                slotId: s.id,
                role: s.role.name,
                allocatedName: s.allocation?.user.name ?? null,
              }))}
              volunteers={volunteers.map((v) => ({ id: v.user.id, name: v.user.name }))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
