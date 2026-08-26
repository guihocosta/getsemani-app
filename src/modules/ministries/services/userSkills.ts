import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
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
