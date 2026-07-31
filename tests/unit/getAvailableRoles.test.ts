import { describe, it, expect, vi } from "vitest";
import { getAvailableRoles } from "@/modules/scheduling/services/getAvailableRoles";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    occurrence: { findUniqueOrThrow: vi.fn() },
    role: { findMany: vi.fn() }
  }
}));

describe("getAvailableRoles", () => {
  it("returns active roles not currently active in the occurrence", async () => {
    vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue({
      id: "occ-1", schedule: { ministryId: "min-1" },
      slots: [{ roleId: "role-1", active: true }, { roleId: "role-2", active: false }]
    } as any);

    vi.mocked(prisma.role.findMany).mockResolvedValue([
      { id: "role-1", name: "Singer" },
      { id: "role-2", name: "Guitar" },
      { id: "role-3", name: "Drums" }
    ] as any);

    const roles = await getAvailableRoles("occ-1");
    // role-1 is active, so it should be excluded
    // role-2 is inactive in slot, so it should be available
    // role-3 has no slot, so it should be available
    expect(roles.map(r => r.id)).toEqual(["role-2", "role-3"]);
  });
});
