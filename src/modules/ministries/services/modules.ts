import { prisma } from "@/lib/prisma";

export class ModuleDisabled extends Error {
  constructor() {
    super("MODULE_DISABLED");
  }
}

// Dos ministerios informados, os que tem o repertorio ligado. Sem checagem de
// permissao aqui: o chamador ja resolveu de quais ministerios o usuario e membro.
export async function repertoireMinistries(ministryIds: string[]): Promise<{ id: string; name: string }[]> {
  if (ministryIds.length === 0) return [];
  return prisma.ministry.findMany({
    where: { id: { in: ministryIds }, repertoireEnabled: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// Modulo desligado preserva os dados e bloqueia o acesso.
export async function assertRepertoireEnabled(ministryId: string): Promise<void> {
  const ministry = await prisma.ministry.findUnique({
    where: { id: ministryId },
    select: { repertoireEnabled: true },
  });
  if (!ministry?.repertoireEnabled) throw new ModuleDisabled();
}
