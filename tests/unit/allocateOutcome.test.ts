import { describe, it, expect } from "vitest";
import { decideAllocate, decideReassign } from "@/modules/scheduling/services/allocateVolunteer";

describe("decideAllocate", () => {
  it("OK quando vaga vazia e sem conflito", () => {
    expect(decideAllocate({ hasAllocation: false, hasConflict: false, override: false })).toBe("OK");
  });
  it("SLOT_TAKEN quando ja tem alocacao, mesmo sem conflito", () => {
    expect(decideAllocate({ hasAllocation: true, hasConflict: false, override: false })).toBe("SLOT_TAKEN");
  });
  it("UNAVAILABILITY_BLOCKED quando ha conflito sem override", () => {
    expect(decideAllocate({ hasAllocation: false, hasConflict: true, override: false })).toBe(
      "UNAVAILABILITY_BLOCKED",
    );
  });
  it("OK quando ha conflito mas com override", () => {
    expect(decideAllocate({ hasAllocation: false, hasConflict: true, override: true })).toBe("OK");
  });
  it("SLOT_TAKEN tem prioridade sobre conflito", () => {
    expect(decideAllocate({ hasAllocation: true, hasConflict: true, override: true })).toBe("SLOT_TAKEN");
  });
});

describe("decideReassign", () => {
  it("NO_ALLOCATION quando a vaga esta vazia", () => {
    expect(
      decideReassign({ hasAllocation: false, currentUserId: null, targetUserId: "u2", hasConflict: false, override: false }),
    ).toBe("NO_ALLOCATION");
  });
  it("SAME_USER quando o alvo ja e quem esta alocado (no-op)", () => {
    expect(
      decideReassign({ hasAllocation: true, currentUserId: "u1", targetUserId: "u1", hasConflict: false, override: false }),
    ).toBe("SAME_USER");
  });
  it("UNAVAILABILITY_BLOCKED quando o novo alvo tem conflito sem override", () => {
    expect(
      decideReassign({ hasAllocation: true, currentUserId: "u1", targetUserId: "u2", hasConflict: true, override: false }),
    ).toBe("UNAVAILABILITY_BLOCKED");
  });
  it("OK quando troca pra outro usuario sem conflito", () => {
    expect(
      decideReassign({ hasAllocation: true, currentUserId: "u1", targetUserId: "u2", hasConflict: false, override: false }),
    ).toBe("OK");
  });
  it("OK quando ha conflito mas com override", () => {
    expect(
      decideReassign({ hasAllocation: true, currentUserId: "u1", targetUserId: "u2", hasConflict: true, override: true }),
    ).toBe("OK");
  });
});
