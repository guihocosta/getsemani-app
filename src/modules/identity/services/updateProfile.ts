import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";

// Atualiza nome e telefone do usuario logado.
export async function updateProfile(params: { name: string; phone?: string }) {
  const user = await requireUser();

  const name = params.name.trim();
  if (name.length < 2) throw new Error("INVALID_NAME");

  return prisma.user.update({
    where: { id: user.id },
    data: { name, phone: params.phone?.trim() || null },
  });
}
