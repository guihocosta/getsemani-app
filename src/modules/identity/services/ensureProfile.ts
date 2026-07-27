import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logError";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function profileFromAuthUser(authUser: SupabaseUser) {
  const email = authUser.email ?? `${authUser.id}@sem-email.local`;
  const name =
    (authUser.user_metadata?.full_name as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    email.split("@")[0];
  const avatarUrl = authUser.user_metadata?.avatar_url as string | undefined;
  return { id: authUser.id, email, name, avatarUrl };
}

// P2002 no upsert por id so pode vir do @unique email — outra linha ja tem
// esse e-mail com id diferente (troca de provider, conta duplicada etc).
export function shouldRetryWithFallbackEmail(err: unknown): boolean {
  const e = err as { code?: string; meta?: { target?: string[] | string } };
  if (e?.code !== "P2002") return false;
  const target = e?.meta?.target;
  if (Array.isArray(target)) return target.includes("email");
  if (typeof target === "string") return target.includes("email");
  return false;
}

// Cria/atualiza o perfil de dominio a partir do usuario autenticado da Supabase.
// User.id == auth.users.id.
export async function ensureProfile(authUser: SupabaseUser) {
  const profile = profileFromAuthUser(authUser);
  try {
    return await prisma.user.upsert({
      where: { id: profile.id },
      create: { id: profile.id, email: profile.email, name: profile.name, avatarUrl: profile.avatarUrl },
      update: { email: profile.email, avatarUrl: profile.avatarUrl },
    });
  } catch (err) {
    if (!shouldRetryWithFallbackEmail(err)) throw err;
    logError("identity.ensureProfile", err, { userId: profile.id });
    const fallbackEmail = `${profile.id}@sem-email.local`;
    return prisma.user.upsert({
      where: { id: profile.id },
      create: { id: profile.id, email: fallbackEmail, name: profile.name, avatarUrl: profile.avatarUrl },
      update: { avatarUrl: profile.avatarUrl },
    });
  }
}
