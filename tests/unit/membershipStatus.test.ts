import { describe, it, expect } from "vitest";

// Regra: membership PENDING nao concede elegibilidade (auto-alocar, claim de troca,
// contagem de voluntarios, lideranca) ate ser aprovada (status ACTIVE).
type Status = "PENDING" | "ACTIVE";

function isEligible(status: Status | undefined) {
  return status === "ACTIVE";
}

describe("membership status", () => {
  it("membro ACTIVE e elegivel", () => {
    expect(isEligible("ACTIVE")).toBe(true);
  });
  it("membro PENDING nao e elegivel", () => {
    expect(isEligible("PENDING")).toBe(false);
  });
  it("sem membership nao e elegivel", () => {
    expect(isEligible(undefined)).toBe(false);
  });
});
