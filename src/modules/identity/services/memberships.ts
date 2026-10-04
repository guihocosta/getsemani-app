import { prisma } from "@/lib/prisma";

// Ids dos membros ativos de um ministerio (lideres e voluntarios, sem repetir).
// Sem checagem de permissao aqui: o chamador ja passou pelo gate dele.
export async function activeMemberIds(ministryId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { ministryId, status: "ACTIVE" },
    select: { userId: true },
  });
  return [...new Set(memberships.map((m) => m.userId))];
}
