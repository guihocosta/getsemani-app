import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: { findMany: vi.fn() },
    role: { findMany: vi.fn(async () => [{ id: "r1", name: "Som", active: true, ministryId: "m1" }]) },
    userSkill: { findMany: vi.fn(async () => []) },
  },
}));
vi.mock("@/modules/identity/services/authz", () => ({ requireUser: vi.fn(), requireLeaderOf: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { listMinistrySkillMatrix } from "@/modules/ministries/services/userSkills";

describe("listMinistrySkillMatrix", () => {
  it("listMinistrySkillMatrix pede e devolve so id e nome da pessoa", async () => {
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      { userId: "u1", user: { id: "u1", name: "Ana" } },
    ] as never);

    const matrix = await listMinistrySkillMatrix("m1");

    expect(prisma.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { user: { select: { id: true, name: true } } } }),
    );
    expect(matrix[0].user).toEqual({ id: "u1", name: "Ana" });
    expect(Object.keys(matrix[0].user).sort()).toEqual(["id", "name"]);
  });
});
