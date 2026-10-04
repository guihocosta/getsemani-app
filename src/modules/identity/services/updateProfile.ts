import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { parseBirthDate } from "@/modules/identity/domain/birthday";
import { dateKey } from "@/lib/time";

// Atualiza nome, telefone e data de nascimento do usuario logado.
// birthDate: "yyyy-MM-dd" grava, "" limpa, ausente nao altera.
export async function updateProfile(params: { name: string; phone?: string; birthDate?: string }) {
  const user = await requireUser();

  const name = params.name.trim();
  if (name.length < 2) throw new Error("INVALID_NAME");

  const birthDate =
    params.birthDate === undefined
      ? undefined
      : params.birthDate.trim() === ""
        ? null
        : parseBirthDate(params.birthDate.trim(), dateKey(new Date()));

  return prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      phone: params.phone?.trim() || null,
      ...(birthDate !== undefined ? { birthDate } : {}),
    },
  });
}
