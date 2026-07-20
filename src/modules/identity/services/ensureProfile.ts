import { prisma } from "@/lib/prisma";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Cria/atualiza o perfil de dominio a partir do usuario autenticado da Supabase.
// User.id == auth.users.id.
export async function ensureProfile(authUser: SupabaseUser) {
  const email = authUser.email ?? `${authUser.id}@sem-email.local`;
  const name =
    (authUser.user_metadata?.full_name as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    email.split("@")[0];
  const avatarUrl = authUser.user_metadata?.avatar_url as string | undefined;

  return prisma.user.upsert({
    where: { id: authUser.id },
    create: { id: authUser.id, email, name, avatarUrl },
    update: { email, avatarUrl },
  });
}
