import { logError } from "@/lib/logError";

export type ActionCode =
  | "FORBIDDEN"
  | "SLOT_TAKEN"
  | "NOT_ELIGIBLE"
  | "NOT_OWNER"
  | "UNAVAILABILITY_BLOCKED"
  | "NO_ALLOCATION"
  | "ALREADY_REQUESTED"
  | "ALREADY_REVIEWED"
  | "NOT_GUEST"
  | "UNKNOWN";

export const MENSAGENS: Record<ActionCode, string> = {
  FORBIDDEN: "Você não tem permissão para essa ação.",
  SLOT_TAKEN: "Vaga já preenchida.",
  NOT_ELIGIBLE: "Você não é membro ativo desse ministério.",
  NOT_OWNER: "Essa escala não é sua.",
  UNAVAILABILITY_BLOCKED: "Indisponível nesse horário.",
  NO_ALLOCATION: "Essa vaga não tem ninguém alocado.",
  ALREADY_REQUESTED: "Você já pediu pra entrar nesse ministério.",
  ALREADY_REVIEWED: "Esse pedido já foi analisado.",
  NOT_GUEST: "Essa vaga já está com um usuário cadastrado.",
  UNKNOWN: "Não deu para completar agora. Tente de novo.",
};

const KNOWN_CODES = new Set<string>(Object.keys(MENSAGENS));

// redirect() do Next lanca uma excecao especial — deixamos ela passar direto,
// senao "sua sessao expirou, vai pro login" vira "erro generico".
export function isRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function toActionCode(e: unknown): ActionCode {
  const msg = (e as { message?: unknown })?.message;
  return typeof msg === "string" && KNOWN_CODES.has(msg) ? (msg as ActionCode) : "UNKNOWN";
}

// Helper unico pra todo catch de Server Action: relanca redirect, senao loga
// com ref de correlacao e devolve um resultado tipado pra UI.
export function handleActionError(
  scope: string,
  e: unknown,
  ctx?: Record<string, unknown>,
): { ok: false; code: ActionCode; ref: string } {
  if (isRedirectError(e)) throw e;
  const code = toActionCode(e);
  const ref = logError(scope, e, ctx);
  return { ok: false, code, ref };
}
