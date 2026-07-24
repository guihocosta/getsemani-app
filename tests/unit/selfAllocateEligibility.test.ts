import { describe, it, expect } from "vitest";

// Regra de elegibilidade de selfAllocate/claimSwap: admin sempre pode;
// nao-admin precisa de membership ACTIVE no ministerio do slot.
function isEligible(isAdmin: boolean, hasActiveMembership: boolean) {
  return isAdmin || hasActiveMembership;
}

describe("elegibilidade de auto-alocacao", () => {
  it("admin e elegivel mesmo sem membership", () => {
    expect(isEligible(true, false)).toBe(true);
  });
  it("membro ACTIVE e elegivel", () => {
    expect(isEligible(false, true)).toBe(true);
  });
  it("nao-admin sem membership ACTIVE nao e elegivel", () => {
    expect(isEligible(false, false)).toBe(false);
  });
});
