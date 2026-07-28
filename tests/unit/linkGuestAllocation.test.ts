import { describe, it, expect } from "vitest";
import { decideLinkGuest } from "@/modules/scheduling/services/linkGuestAllocation";

describe("decideLinkGuest", () => {
  it("OK quando a alocacao e guest e sem conflito", () => {
    expect(decideLinkGuest({ hasUserId: false, hasConflict: false, override: false })).toBe("OK");
  });
  it("NOT_GUEST quando a alocacao ja e de um usuario real", () => {
    expect(decideLinkGuest({ hasUserId: true, hasConflict: false, override: false })).toBe("NOT_GUEST");
  });
  it("UNAVAILABILITY_BLOCKED quando o usuario a linkar tem conflito sem override", () => {
    expect(decideLinkGuest({ hasUserId: false, hasConflict: true, override: false })).toBe(
      "UNAVAILABILITY_BLOCKED",
    );
  });
  it("OK quando ha conflito mas com override", () => {
    expect(decideLinkGuest({ hasUserId: false, hasConflict: true, override: true })).toBe("OK");
  });
  it("NOT_GUEST tem prioridade sobre conflito", () => {
    expect(decideLinkGuest({ hasUserId: true, hasConflict: true, override: true })).toBe("NOT_GUEST");
  });
});
