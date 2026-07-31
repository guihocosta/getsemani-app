import { describe, it, expect, vi } from "vitest";
import { addExtraSlot } from "../../src/modules/scheduling/services/addExtraSlot";
import { prisma } from "../../src/lib/prisma";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    slot: { upsert: vi.fn() }
  }
}));

describe("addExtraSlot", () => {
  it("upserts the slot to be active", async () => {
    vi.mocked(prisma.slot.upsert).mockResolvedValue({ id: "slot-1", active: true } as any);

    const slot = await addExtraSlot("occ-1", "role-1");
    
    expect(prisma.slot.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { occurrenceId_roleId: { occurrenceId: "occ-1", roleId: "role-1" } },
      create: { occurrenceId: "occ-1", roleId: "role-1", active: true },
      update: { active: true },
    }));
    expect(slot.id).toBe("slot-1");
  });
});
