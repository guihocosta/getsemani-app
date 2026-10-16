import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { membership: { count: vi.fn(async () => 3) } },
}));

import { prisma } from "@/lib/prisma";
import { pendingMembershipCount } from "@/modules/identity/services/memberships";

describe("pendingMembershipCount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin conta todos os pedidos PENDING", async () => {
    expect(await pendingMembershipCount("u1", true)).toBe(3);
    expect(prisma.membership.count).toHaveBeenCalledWith({ where: { status: "PENDING" } });
  });

  it("nao-admin so conta pedidos de ministerio que lidera ativamente", async () => {
    await pendingMembershipCount("u1", false);
    expect(prisma.membership.count).toHaveBeenCalledWith({
      where: {
        status: "PENDING",
        ministry: { memberships: { some: { userId: "u1", role: "LEADER", status: "ACTIVE" } } },
      },
    });
  });
});
