import { cache } from "react";
import { redirect } from "next/navigation";
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

// Sessao ausente/expirada aqui e sempre inesperada (o layout ja redireciona antes de
// renderizar a pagina) — mas se acontecer (race de cookie, cold start), redireciona
// pro login em vez de estourar um erro 500 sem tratamento.
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.isAdmin) throw new Error("FORBIDDEN");
  return user;
}

// Verdadeiro se o usuario e admin ou lider do ministerio.
// Reusa o user da sessao (getSessionUser e cache()) quando o id bate, evitando
// um findUnique redundante no caminho quente (requireLeaderOf sempre passa o proprio id).
export async function isLeaderOf(userId: string, ministryId: string): Promise<boolean> {
  const sessionUser = await getSessionUser();
  const user = sessionUser?.id === userId ? sessionUser : await prisma.user.findUnique({ where: { id: userId } });
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
// cache() dedup: layout e paginas (ex: /admin) compartilham UMA resolucao por render.
export const isLeaderOfAny = cache(async (userId: string): Promise<boolean> => {
  const m = await prisma.membership.findFirst({
    where: { userId, role: "LEADER", status: "ACTIVE" },
  });
  return !!m;
});
