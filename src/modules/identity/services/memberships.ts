import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Pedidos de entrada PENDING que o usuario pode analisar: admin ve todos, lider
// so os dos ministerios que lidera. Uma query (o escopo de lider vai no where).
// cache(): layout e home pedem o mesmo numero no mesmo render.
export const pendingMembershipCount = cache(async (userId: string, isAdmin: boolean): Promise<number> => {
  return prisma.membership.count({
    where: {
      status: "PENDING",
      ...(isAdmin
        ? {}
        : { ministry: { memberships: { some: { userId, role: "LEADER", status: "ACTIVE" } } } }),
    },
  });
});

// Ids dos membros ativos de um ministerio (lideres e voluntarios, sem repetir).
// Sem checagem de permissao aqui: o chamador ja passou pelo gate dele.
export async function activeMemberIds(ministryId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { ministryId, status: "ACTIVE" },
    select: { userId: true },
  });
  return [...new Set(memberships.map((m) => m.userId))];
}
