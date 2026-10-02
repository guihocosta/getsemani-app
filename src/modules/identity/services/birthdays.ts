import { prisma } from "@/lib/prisma";
import { birthdaysOfMonth } from "@/modules/identity/domain/birthday";

// Aniversariantes do mes entre os membros ativos dos ministerios informados.
// Sem checagem de permissao: o chamador passa os ministerios de que o usuario e membro.
export async function listBirthdays(month: number, ministryIds: string[]) {
  if (ministryIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: {
      birthDate: { not: null },
      memberships: { some: { status: "ACTIVE", ministryId: { in: ministryIds } } },
    },
    select: { id: true, name: true, birthDate: true },
  });
  return birthdaysOfMonth(
    users.filter((u): u is typeof u & { birthDate: Date } => u.birthDate !== null),
    month,
  );
}
