import { describe, it, expect } from "vitest";
import { resolveSessionState } from "@/modules/identity/services/authz";

// Antes desta funcao, "sem sessao" e "sessao valida sem perfil Prisma" colapsavam
// no mesmo null em getSessionUser, causando loop de redirect pro /login. Este
// teste fixa que os dois estados sao distintos e tem tratamento distinto.
describe("resolveSessionState", () => {
  it("sem sessao -> anonimo", () => {
    expect(resolveSessionState({ hasSession: false, hasProfile: false })).toBe("anonimo");
  });

  it("sessao com perfil -> ok", () => {
    expect(resolveSessionState({ hasSession: true, hasProfile: true })).toBe("ok");
  });

  it("sessao sem perfil -> reparar (nao anonimo)", () => {
    expect(resolveSessionState({ hasSession: true, hasProfile: false })).toBe("reparar");
  });
});
