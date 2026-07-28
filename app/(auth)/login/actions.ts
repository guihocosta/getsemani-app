"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { ensureProfile } from "@/modules/identity/services/ensureProfile";

export type LoginActionState = { ok: boolean; error?: string };

// Envia codigo de 6 digitos por e-mail (sem link — evita a sessao nascer no
// navegador errado quando o app roda instalado como PWA).
export async function sendCodeAction(rawEmail: string): Promise<LoginActionState> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  if (!cleanEmail) {
    return { ok: false, error: "Informe um e-mail válido." };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: { shouldCreateUser: true },
  });
  if (error) {
    console.error("[sendCodeAction] Supabase signInWithOtp error:", error);
    return { ok: false, error: "Não deu para enviar o código. Confira o e-mail." };
  }
  return { ok: true };
}

// Verifica o codigo digitado. Roda no servidor: os cookies de sessao saem
// via Set-Cookie do proprio Next, entao ficam validos por 400 dias mesmo
// dentro do PWA instalado (sem depender de storage de cookie do Safari).
export async function verifyCodeAction(rawEmail: string, rawToken: string): Promise<LoginActionState> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  const cleanToken = rawToken.trim();
  if (!cleanEmail || !cleanToken) {
    return { ok: false, error: "Código ou e-mail inválido." };
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: "email",
  });
  if (error || !data.user) {
    if (error) {
      console.error("[verifyCodeAction] Supabase verifyOtp error:", error);
    }
    return { ok: false, error: "Código inválido ou expirado." };
  }
  await ensureProfile(data.user);
  return { ok: true };
}
