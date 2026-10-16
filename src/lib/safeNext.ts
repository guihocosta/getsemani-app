// Destino pos-login vindo de query string: so caminho relativo do proprio app.
// `${origin}${next}` com next="@evil.com" ou ".evil.com" troca o host (open redirect);
// "//evil.com" e "/\evil.com" viram URL de outro host no navegador.
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
