import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/identity/services/authz";

export class InvalidName extends Error {
  constructor() {
    super("INVALID_NAME");
  }
}

// Admin cria um novo ministerio.
export async function createMinistry(params: { name: string; color?: string; description?: string }) {
  await requireAdmin();

  const name = params.name.trim();
  if (name.length < 2) throw new InvalidName();

  return prisma.ministry.create({
    data: {
      name,
      color: params.color?.trim() || undefined,
      description: params.description?.trim() || undefined,
    },
  });
}
