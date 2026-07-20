import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";

// Lista todos os ministerios com suas funcoes e contagem de membros.
// Sem guard de admin: usado tambem no onboarding por qualquer usuario autenticado.
export async function listMinistries() {
  await requireUser();

  return prisma.ministry.findMany({
    include: { roles: true, _count: { select: { memberships: true } } },
    orderBy: { name: "asc" },
  });
}
