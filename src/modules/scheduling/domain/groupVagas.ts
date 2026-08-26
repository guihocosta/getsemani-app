// Separa itens de /vagas em "Pra voce" (funcao capacitada) e "Outras vagas",
// preservando a ordem de entrada dentro de cada grupo (a pagina ja ordena por
// data antes de chamar isto). Pura — sem Prisma.
export function groupVagasByCapability<T extends { roleId: string }>(
  items: T[],
  capableRoleIds: Set<string>,
): { praVoce: T[]; outras: T[] } {
  const praVoce: T[] = [];
  const outras: T[] = [];
  for (const item of items) {
    (capableRoleIds.has(item.roleId) ? praVoce : outras).push(item);
  }
  return { praVoce, outras };
}
