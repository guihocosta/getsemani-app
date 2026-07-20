import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/identity/services/authz";
import { InvalidName } from "./createMinistry";

// Admin atualiza dados de um ministerio existente.
export async function updateMinistry(params: {
  ministryId: string;
  name?: string;
  color?: string;
  description?: string;
}) {
  await requireAdmin();

  const name = params.name?.trim();
  if (name !== undefined && name.length < 2) throw new InvalidName();

  return prisma.ministry.update({
    where: { id: params.ministryId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(params.color !== undefined ? { color: params.color.trim() || null } : {}),
      ...(params.description !== undefined ? { description: params.description.trim() || null } : {}),
    },
  });
}
