// Decide se uma alteracao de capacitacao (marcar/desmarcar Role que a pessoa
// sabe executar) e permitida. Pura — sem Prisma.
export function decideSetSkill(params: {
  hasActiveMembership: boolean;
  roleActive: boolean;
}): "OK" | "FORBIDDEN" | "ROLE_INACTIVE" {
  if (!params.hasActiveMembership) return "FORBIDDEN";
  if (!params.roleActive) return "ROLE_INACTIVE";
  return "OK";
}
