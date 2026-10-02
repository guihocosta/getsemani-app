import { describe, it, expect } from "vitest";
import { isRedirectError, toActionCode, MENSAGENS, type ActionCode } from "@/lib/actionError";

// Toda action de dominio devolve um desses codigos — se um novo for adicionado
// ao union sem entrada em MENSAGENS, o TS ja quebra a build (Record completo);
// este teste garante que a mensagem tambem nao fica vazia.
const ALL_CODES: ActionCode[] = [
  "FORBIDDEN",
  "SLOT_TAKEN",
  "NOT_ELIGIBLE",
  "NOT_PUBLISHED",
  "MODULE_DISABLED",
  "INVALID_INPUT",
  "ALREADY_IN_SETLIST",
  "OCCURRENCE_PAST",
  "OCCURRENCE_CANCELLED",
  "NOT_OWNER",
  "UNAVAILABILITY_BLOCKED",
  "NO_ALLOCATION",
  "ALREADY_REQUESTED",
  "ALREADY_REVIEWED",
  "UNKNOWN",
];

describe("isRedirectError", () => {
  it("reconhece o sinal de redirect do Next", () => {
    expect(isRedirectError({ digest: "NEXT_REDIRECT;replace;/login;307;" })).toBe(true);
  });
  it("rejeita um Error comum", () => {
    expect(isRedirectError(new Error("FORBIDDEN"))).toBe(false);
  });
  it("rejeita valores nao-objeto", () => {
    expect(isRedirectError("erro")).toBe(false);
    expect(isRedirectError(null)).toBe(false);
    expect(isRedirectError(undefined)).toBe(false);
  });
});

describe("toActionCode", () => {
  it.each(ALL_CODES.filter((c) => c !== "UNKNOWN"))("mapeia Error(%s) pro codigo certo", (code) => {
    expect(toActionCode(new Error(code))).toBe(code);
  });

  it("cai em UNKNOWN pra mensagem desconhecida", () => {
    expect(toActionCode(new Error("ALGO_NAO_MAPEADO"))).toBe("UNKNOWN");
  });

  it("cai em UNKNOWN pra erro sem mensagem", () => {
    expect(toActionCode({})).toBe("UNKNOWN");
    expect(toActionCode(null)).toBe("UNKNOWN");
  });
});

describe("MENSAGENS", () => {
  it("OCCURRENCE_CANCELLED avisa que a data foi cancelada", () => {
    expect(toActionCode(new Error("OCCURRENCE_CANCELLED"))).toBe("OCCURRENCE_CANCELLED");
    expect(MENSAGENS.OCCURRENCE_CANCELLED).toBe("Essa data foi cancelada.");
  });

  it("OCCURRENCE_PAST avisa que a data ja passou", () => {
    expect(toActionCode(new Error("OCCURRENCE_PAST"))).toBe("OCCURRENCE_PAST");
    expect(MENSAGENS.OCCURRENCE_PAST).toBe("Essa data já passou.");
  });

  it("NOT_PUBLISHED avisa que a escala ainda nao foi publicada", () => {
    expect(toActionCode(new Error("NOT_PUBLISHED"))).toBe("NOT_PUBLISHED");
    expect(MENSAGENS.NOT_PUBLISHED).toBe("Essa escala ainda não foi publicada.");
  });

  it.each(ALL_CODES)("tem texto pt-BR nao vazio pro codigo %s", (code) => {
    expect(MENSAGENS[code]).toBeTruthy();
    expect(typeof MENSAGENS[code]).toBe("string");
  });
});
