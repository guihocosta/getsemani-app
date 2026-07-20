import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { ScheduleForm } from "../../ScheduleForm";

export const dynamic = "force-dynamic";

export default async function EditarEscalaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: { ministry: { include: { roles: true } }, defaultRoles: true },
  });
  if (!schedule) notFound();

  const led = user.isAdmin
    ? await prisma.ministry.findMany({ include: { roles: true } })
    : (
        await prisma.membership.findMany({
          where: { userId: user.id, role: "LEADER" },
          include: { ministry: { include: { roles: true } } },
        })
      ).map((m) => m.ministry);

  if (!led.some((m) => m.id === schedule.ministryId)) notFound();

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Editar escala</h1>
      <ScheduleForm
        ministries={led}
        editing={{
          id: schedule.id,
          ministryId: schedule.ministryId,
          title: schedule.title,
          startDate: schedule.startDate.toISOString().slice(0, 10),
          startTime: schedule.startTime,
          recurrenceRule: schedule.recurrenceRule,
          recurrenceUntil: schedule.recurrenceUntil
            ? schedule.recurrenceUntil.toISOString().slice(0, 10)
            : null,
          roleIds: schedule.defaultRoles.map((r) => r.roleId),
        }}
      />
    </div>
  );
}
