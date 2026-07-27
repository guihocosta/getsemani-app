// Decide se vale chamar supabase.auth.getUser() (rede) pra revalidar o JWT,
// ou se a sessao local ainda tem vida suficiente e a request pode passar reto.
export function shouldRefreshSession(
  expiresAt: number | null | undefined,
  nowSeconds: number,
  bufferSeconds: number,
): boolean {
  if (expiresAt == null) return true;
  return expiresAt - nowSeconds <= bufferSeconds;
}
