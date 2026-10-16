import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ensureProfile } from "@/modules/identity/services/ensureProfile";
import { logError } from "@/lib/logError";
import { ACTIVE_LEADER } from "@/modules/identity/services/memberships";
import type { User } from "@prisma/client";

// "anonimo": sem sessao (usuario deslogado). "ok": sessao com perfil, caminho normal.
// "reparar": sessao Supabase valida mas falta a linha User no Prisma — estado raro
// (callback falhou antes do ensureProfile, ou P2002 de email nao tratado antigamente).
// Os dois primeiros costumavam colapsar no mesmo null e causavam loop de redirect pro /login.
export function resolveSessionState(params: { hasSession: boolean; hasProfile: boolean }): "anonimo" | "reparar" | "ok" {
  if (!params.hasSession) return "anonimo";
  return params.hasProfile ? "ok" : "reparar";
}

// Usuario da sessao (perfil de dominio) ou null.
// cache() dedup: layout + pagina compartilham UMA resolucao por render.
// Identidade vem de getClaims(), que VERIFICA a assinatura do JWT (JWKS em cache
// com chave assimetrica; senao valida no servidor de Auth). Nunca usar
// getSession().user aqui: ele le o cookie sem verificar, e um cookie forjado
// com o UUID de outra pessoa viraria aquela pessoa (inclusive admin).
// O perfil normalmente e criado no callback de auth, nao no caminho quente —
// mas se a sessao existe e o perfil nao, reparamos aqui em vez de entrar em loop.
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServer();
  // getClaims lanca (em vez de devolver error) quando o JWT nem decodifica —
  // cookie corrompido/forjado e "sem sessao", nao erro 500.
  let userId: string | undefined;
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (!error) userId = data?.claims?.sub;
  } catch (err) {
    logError("authz.getClaims", err);
    return null;
  }
  if (!userId) return null;

  const profile = await prisma.user.findUnique({ where: { id: userId } });
  const state = resolveSessionState({ hasSession: true, hasProfile: !!profile });
  if (state === "ok") return profile;

  // Reparo (raro): ensureProfile precisa do usuario completo do Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return null;
  return ensureProfile(user);
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
    where: { userId, ministryId, ...ACTIVE_LEADER },
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
    where: { userId, ...ACTIVE_LEADER },
  });
  return !!m;
});
