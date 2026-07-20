import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { User } from "@prisma/client";

// Usuario da sessao (perfil de dominio) ou null.
// cache() dedup: layout + pagina compartilham UMA resolucao por render.
// getSession() le o cookie local (sem rede); o middleware ja chamou getUser()
// (valida + renova o JWT) a cada request, entao aqui confiamos no cookie.
// Sem upsert: o perfil e criado no callback de auth, nao no caminho quente.
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
});

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.isAdmin) throw new Error("FORBIDDEN");
  return user;
}

// Verdadeiro se o usuario e admin ou lider do ministerio.
export async function isLeaderOf(userId: string, ministryId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.isAdmin) return true;
  const m = await prisma.membership.findFirst({
    where: { userId, ministryId, role: "LEADER", status: "ACTIVE" },
  });
  return !!m;
}

export async function requireLeaderOf(ministryId: string): Promise<User> {
  const user = await requireUser();
  if (!(await isLeaderOf(user.id, ministryId))) throw new Error("FORBIDDEN");
  return user;
}

// Verdadeiro se o usuario lidera pelo menos um ministerio (usado pra exibir nav de Solicitações).
export async function isLeaderOfAny(userId: string): Promise<boolean> {
  const m = await prisma.membership.findFirst({
    where: { userId, role: "LEADER", status: "ACTIVE" },
  });
  return !!m;
}
