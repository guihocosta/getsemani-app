const REF_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateRef(): string {
  let ref = "";
  for (let i = 0; i < 6; i++) ref += REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)];
  return ref;
}

// Loga um erro com codigo curto de correlacao: o ref vai pra tela do usuario
// e pro log da Vercel, entao um relato ("cod. A3F9K2") vira busca direta no log.
export function logError(scope: string, err: unknown, ctx?: Record<string, unknown>): string {
  const ref = generateRef();
  const e = err as { message?: string; code?: string; digest?: string; stack?: string };
  console.error(`[${scope}] ref=${ref}`, {
    message: e?.message,
    code: e?.code,
    digest: e?.digest,
    stack: e?.stack,
    ctx,
  });
  return ref;
}
