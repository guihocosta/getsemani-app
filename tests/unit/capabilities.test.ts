import { describe, it, expect } from "vitest";
import { decideSetSkill } from "@/modules/ministries/domain/capabilities";

describe("decideSetSkill", () => {
  it("sem membership ACTIVE retorna FORBIDDEN", () => {
    expect(
      decideSetSkill({ hasActiveMembership: false, roleActive: true }),
    ).toBe("FORBIDDEN");
  });

  it("funcao inativa retorna ROLE_INACTIVE", () => {
    expect(
      decideSetSkill({ hasActiveMembership: true, roleActive: false }),
    ).toBe("ROLE_INACTIVE");
  });

  it("membership ACTIVE e funcao ativa retorna OK", () => {
    expect(
      decideSetSkill({ hasActiveMembership: true, roleActive: true }),
    ).toBe("OK");
  });
});
