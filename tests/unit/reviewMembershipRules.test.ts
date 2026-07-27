import { describe, it, expect } from "vitest";
import { canReviewMembership } from "@/modules/identity/services/reviewMembership";

describe("canReviewMembership", () => {
  it("OK quando quem revisa lidera o ministerio do pedido", () => {
    expect(
      canReviewMembership({ ledMinistryIds: ["m1"], membershipMinistryId: "m1", status: "PENDING" }),
    ).toBe("OK");
  });

  it("FORBIDDEN quando lider de OUTRO ministerio revisa", () => {
    expect(
      canReviewMembership({ ledMinistryIds: ["m2"], membershipMinistryId: "m1", status: "PENDING" }),
    ).toBe("FORBIDDEN");
  });

  it("ALREADY_REVIEWED quando o pedido ja saiu de PENDING (duplo clique)", () => {
    expect(
      canReviewMembership({ ledMinistryIds: ["m1"], membershipMinistryId: "m1", status: "ACTIVE" }),
    ).toBe("ALREADY_REVIEWED");
  });

  it("ALREADY_REVIEWED tem prioridade sobre FORBIDDEN", () => {
    expect(
      canReviewMembership({ ledMinistryIds: ["m2"], membershipMinistryId: "m1", status: "ACTIVE" }),
    ).toBe("ALREADY_REVIEWED");
  });
});
