import { describe, it, expect } from "vitest";
import { decideLinkAllGuests } from "@/modules/scheduling/services/linkAllGuestAllocations";

describe("decideLinkAllGuests", () => {
  it("NO_GUESTS_FOUND quando nao ha alocacoes correspondentes", () => {
    expect(
      decideLinkAllGuests({ matchingCount: 0, hasConflict: false, override: false }),
    ).toBe("NO_GUESTS_FOUND");
  });

  it("UNAVAILABILITY_BLOCKED quando ha conflito sem override", () => {
    expect(
      decideLinkAllGuests({ matchingCount: 2, hasConflict: true, override: false }),
    ).toBe("UNAVAILABILITY_BLOCKED");
  });

  it("OK quando ha conflito mas com override", () => {
    expect(
      decideLinkAllGuests({ matchingCount: 2, hasConflict: true, override: true }),
    ).toBe("OK");
  });

  it("OK quando ha alocacoes e nao ha conflito", () => {
    expect(
      decideLinkAllGuests({ matchingCount: 3, hasConflict: false, override: false }),
    ).toBe("OK");
  });

  it("NO_GUESTS_FOUND tem prioridade sobre conflito", () => {
    expect(
      decideLinkAllGuests({ matchingCount: 0, hasConflict: true, override: false }),
    ).toBe("NO_GUESTS_FOUND");
  });
});
