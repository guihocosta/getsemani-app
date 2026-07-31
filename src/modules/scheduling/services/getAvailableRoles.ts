import { prisma } from "@/lib/prisma";

export async function getAvailableRoles(occurrenceId: string) {
  const occurrence = await prisma.occurrence.findUniqueOrThrow({
    where: { id: occurrenceId },
    include: { schedule: true, slots: true },
  });

  const activeRoleIds = new Set(
    occurrence.slots.filter((s) => s.active).map((s) => s.roleId)
  );

  const ministryRoles = await prisma.role.findMany({
    where: { ministryId: occurrence.schedule.ministryId, active: true },
    orderBy: { name: "asc" },
  });

  return ministryRoles.filter((r) => !activeRoleIds.has(r.id));
}
