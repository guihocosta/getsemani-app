import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/identity/services/authz";

// Admin lista todos os usuarios com suas memberships (e ministerio associado).
export async function listUsers() {
  await requireAdmin();

  return prisma.user.findMany({
    include: { memberships: { include: { ministry: true } } },
    orderBy: { name: "asc" },
  });
}
