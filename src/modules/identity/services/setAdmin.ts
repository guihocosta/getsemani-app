import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/identity/services/authz";

// Admin promove ou remove privilegio de admin de um usuario.
export async function setAdmin(params: { userId: string; isAdmin: boolean }) {
  await requireAdmin();

  return prisma.user.update({
    where: { id: params.userId },
    data: { isAdmin: params.isAdmin },
  });
}
