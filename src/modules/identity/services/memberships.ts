import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// API de membership para os outros modulos: quem lidera, quem e membro ativo.
// Nenhum outro modulo consulta a tabela Membership direto (regra da constituicao).
// Sem checagem de permissao aqui: o chamador ja passou pelo gate dele.

type Db = Prisma.TransactionClient | typeof prisma;

// Unica definicao de "lider ativo" — mudar a regra (ex.: co-lider) e mudar aqui.
export const ACTIVE_LEADER = { role: "LEADER", status: "ACTIVE" } as const;

// Ministerios que o usuario PODE GERENCIAR (lider ou admin) — controla quem
// ve os botoes de criar/editar/excluir/alocar.
export async function ledMinistryIds(userId: string, isAdmin: boolean): Promise<string[]> {
  if (isAdmin) {
    return (await prisma.ministry.findMany({ select: { id: true } })).map((m) => m.id);
  }
  const memberships = await prisma.membership.findMany({
    where: { userId, ...ACTIVE_LEADER },
    select: { ministryId: true },
  });
  return memberships.map((m) => m.ministryId);
}

// Ministerios que o usuario PODE VER (qualquer membership ativa, lider ou
// voluntario) — admin ve todos. Mais amplo que ledMinistryIds.
// cache(): layout e paginas pedem a mesma lista no mesmo render.
export const visibleMinistryIds = cache(async (userId: string, isAdmin: boolean): Promise<string[]> => {
  if (isAdmin) {
    return (await prisma.ministry.findMany({ select: { id: true } })).map((m) => m.id);
  }
  return activeMinistryIdsOf(userId);
});

// Ministerios em que o usuario tem membership ACTIVE (sem atalho de admin).
// Regra de pertencimento, separada da de visibilidade acima.
export async function activeMinistryIdsOf(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId, status: "ACTIVE" },
    select: { ministryId: true },
  });
  return [...new Set(memberships.map((m) => m.ministryId))];
}

// Pedidos de entrada PENDING que o usuario pode analisar: admin ve todos, lider
// so os dos ministerios que lidera. Uma query (o escopo de lider vai no where).
// cache(): layout e home pedem o mesmo numero no mesmo render.
export const pendingMembershipCount = cache(async (userId: string, isAdmin: boolean): Promise<number> => {
  return prisma.membership.count({
    where: {
      status: "PENDING",
      ...(isAdmin ? {} : { ministry: { memberships: { some: { userId, ...ACTIVE_LEADER } } } }),
    },
  });
});

// Ids dos lideres ativos de um ministerio.
export async function leaderIdsOf(ministryId: string): Promise<string[]> {
  const leaders = await prisma.membership.findMany({
    where: { ministryId, ...ACTIVE_LEADER },
    select: { userId: true },
  });
  return leaders.map((l) => l.userId);
}

// Ids dos membros ativos de um ministerio (lideres e voluntarios, sem repetir).
export async function activeMemberIds(ministryId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { ministryId, status: "ACTIVE" },
    select: { userId: true },
  });
  return [...new Set(memberships.map((m) => m.userId))];
}

// Membros ativos com o nome, para listas de candidatos. So os campos usados:
// o perfil completo (telefone, aniversario) nao sai do modulo.
export async function activeMembersWithName(
  ministryId: string,
): Promise<{ userId: string; role: "LEADER" | "VOLUNTEER"; user: { name: string } }[]> {
  return prisma.membership.findMany({
    where: { ministryId, status: "ACTIVE" },
    select: { userId: true, role: true, user: { select: { name: true } } },
  });
}

// Quais destes usuarios sao membros ativos do ministerio (uma query pro lote).
export async function activeMemberIdsAmong(ministryId: string, userIds: string[]): Promise<Set<string>> {
  const memberships = await prisma.membership.findMany({
    where: { userId: { in: userIds }, ministryId, status: "ACTIVE" },
    select: { userId: true },
  });
  return new Set(memberships.map((m) => m.userId));
}

// db opcional: dentro de $transaction, passar o tx pra ler no mesmo snapshot.
export async function isActiveMember(userId: string, ministryId: string, db: Db = prisma): Promise<boolean> {
  const member = await db.membership.findFirst({
    where: { userId, ministryId, status: "ACTIVE" },
  });
  return !!member;
}
