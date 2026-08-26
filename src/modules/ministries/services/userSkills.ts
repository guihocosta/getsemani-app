import { prisma } from "@/lib/prisma";
import { requireUser, requireLeaderOf } from "@/modules/identity/services/authz";
import { decideSetSkill } from "@/modules/ministries/domain/capabilities";

// Voluntario marca/desmarca uma funcao que sabe executar. So permite se ele
// tiver Membership ACTIVE no ministerio da funcao (CAPA-01.4) e a funcao
// estiver ativa. Idempotente: marcar/desmarcar duas vezes converge sem erro
// (CAPA-01.5), via upsert/deleteMany em vez de create puro.
export async function setOwnSkill(params: { roleId: string; enabled: boolean }) {
  const user = await requireUser();

  const role = await prisma.role.findUniqueOrThrow({ where: { id: params.roleId } });
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, ministryId: role.ministryId, status: "ACTIVE" },
  });

  const decision = decideSetSkill({
    hasActiveMembership: !!membership,
    roleActive: role.active,
  });
  if (decision !== "OK") throw new Error(decision);

  if (params.enabled) {
    return prisma.userSkill.upsert({
      where: { userId_roleId: { userId: user.id, roleId: params.roleId } },
      create: { userId: user.id, roleId: params.roleId },
      update: {},
    });
  }
  await prisma.userSkill.deleteMany({
    where: { userId: user.id, roleId: params.roleId },
  });
  return null;
}

// Lider (ou admin, ja liberado por requireLeaderOf/isLeaderOf) marca/desmarca a
// capacitacao de um membro do seu ministerio. Mesma decisao pura de setOwnSkill,
// mas o alvo e outro usuario, entao a membership ACTIVE checada e a do alvo.
export async function setMemberSkill(params: {
  userId: string;
  roleId: string;
  enabled: boolean;
}) {
  const role = await prisma.role.findUniqueOrThrow({ where: { id: params.roleId } });
  await requireLeaderOf(role.ministryId);

  const membership = await prisma.membership.findFirst({
    where: { userId: params.userId, ministryId: role.ministryId, status: "ACTIVE" },
  });

  const decision = decideSetSkill({
    hasActiveMembership: !!membership,
    roleActive: role.active,
  });
  if (decision !== "OK") throw new Error(decision);

  if (params.enabled) {
    return prisma.userSkill.upsert({
      where: { userId_roleId: { userId: params.userId, roleId: params.roleId } },
      create: { userId: params.userId, roleId: params.roleId },
      update: {},
    });
  }
  await prisma.userSkill.deleteMany({
    where: { userId: params.userId, roleId: params.roleId },
  });
  return null;
}

// Funcoes ativas dos ministerios onde o usuario tem membership ACTIVE, com
// flag de capacitado — para a secao "Minhas funcoes" do /perfil.
export async function listOwnSkillOptions(userId: string) {
  const ministryIds = (
    await prisma.membership.findMany({
      where: { userId, status: "ACTIVE" },
      select: { ministryId: true },
    })
  ).map((m) => m.ministryId);

  const roles = await prisma.role.findMany({
    where: { ministryId: { in: ministryIds }, active: true },
    include: { ministry: true },
    orderBy: { name: "asc" },
  });

  const skills = await prisma.userSkill.findMany({
    where: { userId, roleId: { in: roles.map((r) => r.id) } },
  });
  const capableRoleIds = new Set(skills.map((s) => s.roleId));

  return roles.map((role) => ({ ...role, capaz: capableRoleIds.has(role.id) }));
}

// Membros ACTIVE (deduplicados por userId) x funcoes ativas do ministerio,
// com flag de capacitado por par — para a matriz de /admin/ministerios.
export async function listMinistrySkillMatrix(ministryId: string) {
  const memberships = await prisma.membership.findMany({
    where: { ministryId, status: "ACTIVE" },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });
  const byUserId = new Map<string, (typeof memberships)[number]>();
  for (const m of memberships) {
    if (!byUserId.has(m.userId)) byUserId.set(m.userId, m);
  }
  const members = [...byUserId.values()];

  const roles = await prisma.role.findMany({
    where: { ministryId, active: true },
    orderBy: { name: "asc" },
  });

  const skills = await prisma.userSkill.findMany({
    where: { userId: { in: members.map((m) => m.userId) }, roleId: { in: roles.map((r) => r.id) } },
  });
  const capableKeys = new Set(skills.map((s) => `${s.userId}:${s.roleId}`));

  return members.map((m) => ({
    user: m.user,
    roles: roles.map((role) => ({ ...role, capaz: capableKeys.has(`${m.userId}:${role.id}`) })),
  }));
}

// Set de roleId que o usuario e capacitado, restrito a membership ACTIVE e
// Role.active — consumido por /vagas pra agrupar "Pra voce" x "Outras vagas".
export async function capableRoleIds(userId: string): Promise<Set<string>> {
  const activeMinistryIds = (
    await prisma.membership.findMany({
      where: { userId, status: "ACTIVE" },
      select: { ministryId: true },
    })
  ).map((m) => m.ministryId);

  const skills = await prisma.userSkill.findMany({
    where: { userId, role: { active: true, ministryId: { in: activeMinistryIds } } },
    select: { roleId: true },
  });
  return new Set(skills.map((s) => s.roleId));
}

// Set de userId capacitados numa funcao, restrito a quem ainda tem membership
// ACTIVE no ministerio da funcao — consumido pela lista de candidatos do lider.
export async function capableUserIdsForRole(roleId: string): Promise<Set<string>> {
  const role = await prisma.role.findUniqueOrThrow({ where: { id: roleId } });
  const skills = await prisma.userSkill.findMany({
    where: {
      roleId,
      user: { memberships: { some: { ministryId: role.ministryId, status: "ACTIVE" } } },
    },
    select: { userId: true },
  });
  return new Set(skills.map((s) => s.userId));
}
