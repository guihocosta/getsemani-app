import { prisma } from "@/lib/prisma";

export async function addExtraSlot(occurrenceId: string, roleId: string) {
  return prisma.slot.upsert({
    where: {
      occurrenceId_roleId: {
        occurrenceId,
        roleId,
      },
    },
    create: {
      occurrenceId,
      roleId,
      active: true,
    },
    update: {
      active: true,
    },
  });
}
