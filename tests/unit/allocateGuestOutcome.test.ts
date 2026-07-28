import { describe, it, expect } from "vitest";
import { decideAllocateGuest } from "@/modules/scheduling/services/allocateGuest";

describe("decideAllocateGuest", () => {
  it("OK quando a vaga esta vazia", () => {
    expect(decideAllocateGuest({ hasAllocation: false })).toBe("OK");
  });
  it("SLOT_TAKEN quando a vaga ja tem alocacao", () => {
    expect(decideAllocateGuest({ hasAllocation: true })).toBe("SLOT_TAKEN");
  });
});
