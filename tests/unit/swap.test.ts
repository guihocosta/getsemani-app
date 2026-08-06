import { describe, it, expect } from "vitest";
import { decideRequestSwap, decideCancelSwap } from "@/modules/scheduling/services/swap";

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

describe("decideRequestSwap", () => {
  it("sem swap anterior -> CREATE", () => {
    expect(decideRequestSwap(null)).toBe("CREATE");
  });
  it("swap ja aberto -> REUSE (protege duplo clique)", () => {
    expect(decideRequestSwap("OPEN")).toBe("REUSE");
  });
  it("swap ja assumido -> REOPEN", () => {
    expect(decideRequestSwap("CLAIMED")).toBe("REOPEN");
  });
  it("swap cancelado -> REOPEN", () => {
    expect(decideRequestSwap("CANCELLED")).toBe("REOPEN");
  });
});

describe("decideCancelSwap", () => {
  it("dono cancela pedido aberto -> OK", () => {
    expect(decideCancelSwap({ requestedBy: "u1", userId: "u1", status: "OPEN" })).toBe("OK");
  });
  it("outro usuario nao pode cancelar -> NOT_OWNER", () => {
    expect(decideCancelSwap({ requestedBy: "u1", userId: "u2", status: "OPEN" })).toBe("NOT_OWNER");
  });
  it("pedido ja assumido nao pode ser cancelado -> NOT_OPEN", () => {
    expect(decideCancelSwap({ requestedBy: "u1", userId: "u1", status: "CLAIMED" })).toBe("NOT_OPEN");
  });
  it("pedido ja cancelado nao pode ser cancelado de novo -> NOT_OPEN", () => {
    expect(decideCancelSwap({ requestedBy: "u1", userId: "u1", status: "CANCELLED" })).toBe("NOT_OPEN");
  });
});
