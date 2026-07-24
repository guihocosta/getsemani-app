"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { ensureProfile } from "@/modules/identity/services/ensureProfile";

export type LoginActionState = { ok: boolean; error?: string };

// Envia codigo de 6 digitos por e-mail (sem link — evita a sessao nascer no
// navegador errado quando o app roda instalado como PWA).
export async function sendCodeAction(email: string): Promise<LoginActionState> {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { ok: false, error: "Não deu para enviar o código. Confira o e-mail." };
  return { ok: true };
}

// Verifica o codigo digitado. Roda no servidor: os cookies de sessao saem
// via Set-Cookie do proprio Next, entao ficam validos por 400 dias mesmo
// dentro do PWA instalado (sem depender de storage de cookie do Safari).
export async function verifyCodeAction(email: string, token: string): Promise<LoginActionState> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error || !data.user) return { ok: false, error: "Código inválido ou expirado." };
  await ensureProfile(data.user);
  return { ok: true };
}
