import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/identity/services/authz";

// Admin ativa/desativa uma funcao. Funcoes inativas somem das opcoes de escala
// mas continuam referenciadas por Slots ja materializados (historico).
export async function setRoleActive(params: { roleId: string; active: boolean }) {
  await requireAdmin();

  return prisma.role.update({
    where: { id: params.roleId },
    data: { active: params.active },
  });
}

// Admin exclui de vez uma funcao que nunca foi usada em nenhuma escala/vaga.
// Se ja tiver Slots (onDelete: Restrict), cai pra soft-delete em vez de falhar.
export async function deleteRole(params: { roleId: string }) {
  await requireAdmin();

  const inUse = await prisma.slot.findFirst({ where: { roleId: params.roleId } });
  if (inUse) {
    return prisma.role.update({ where: { id: params.roleId }, data: { active: false } });
  }
  return prisma.role.delete({ where: { id: params.roleId } });
}

export async function renameRole(params: { roleId: string; name: string }) {
  await requireAdmin();

  const name = params.name.trim();
  if (name.length < 2) throw new Error("INVALID_NAME");

  return prisma.role.update({ where: { id: params.roleId }, data: { name } });
}
