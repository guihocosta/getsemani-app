import { describe, it, expect } from "vitest";

// Teste de logica pura da maquina de estados do swap (sem DB).
// Regras: OPEN -> CLAIMED (por outro voluntario elegivel); nao pode claim proprio.
type Status = "OPEN" | "CLAIMED" | "CANCELLED";

function canClaim(status: Status, requesterId: string, claimerId: string, isMember: boolean) {
  if (status !== "OPEN") return "SLOT_TAKEN";
  if (requesterId === claimerId) return "NOT_OWNER";
  if (!isMember) return "NOT_ELIGIBLE";
  return "OK";
}

describe("swap state machine", () => {
  it("permite claim por outro membro", () => {
    expect(canClaim("OPEN", "u1", "u2", true)).toBe("OK");
  });
  it("bloqueia claim quando ja resolvido", () => {
    expect(canClaim("CLAIMED", "u1", "u2", true)).toBe("SLOT_TAKEN");
  });
  it("bloqueia claim do proprio solicitante", () => {
    expect(canClaim("OPEN", "u1", "u1", true)).toBe("NOT_OWNER");
  });
  it("bloqueia nao-membro", () => {
    expect(canClaim("OPEN", "u1", "u2", false)).toBe("NOT_ELIGIBLE");
  });
});
