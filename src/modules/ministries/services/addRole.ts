import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/identity/services/authz";
import { InvalidName } from "./createMinistry";

// Admin adiciona uma nova funcao a um ministerio.
export async function addRole(params: { ministryId: string; name: string }) {
  await requireAdmin();

  const name = params.name.trim();
  if (name.length < 2) throw new InvalidName();

  return prisma.role.create({
    data: { ministryId: params.ministryId, name },
  });
}
