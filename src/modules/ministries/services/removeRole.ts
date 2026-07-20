import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/identity/services/authz";

// Admin desativa uma funcao (soft delete: Slots podem referencia-la via onDelete Restrict).
export async function removeRole(params: { roleId: string }) {
  await requireAdmin();

  return prisma.role.update({
    where: { id: params.roleId },
    data: { active: false },
  });
}
