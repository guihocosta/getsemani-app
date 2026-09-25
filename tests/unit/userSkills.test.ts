import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    role: { findUniqueOrThrow: vi.fn() },
    membership: { findFirst: vi.fn() },
    userSkill: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));
vi.mock("@/modules/identity/services/authz", () => ({
  requireUser: vi.fn(),
  requireLeaderOf: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { capableUserIdsForRole, setMemberSkill, setOwnSkill } from "@/modules/ministries/services/userSkills";

beforeEach(() => {
  vi.mocked(prisma.role.findUniqueOrThrow).mockResolvedValue({
    id: "r1",
    ministryId: "m1",
    active: true,
  } as never);
  vi.mocked(prisma.userSkill.upsert).mockReset();
  vi.mocked(prisma.userSkill.deleteMany).mockReset();
});

describe("capableUserIdsForRole", () => {
  it("devolve null quando ninguem ativo declarou a funcao", async () => {
    vi.mocked(prisma.userSkill.findMany).mockResolvedValue([]);
    expect(await capableUserIdsForRole("r1")).toBeNull();
  });

  it("devolve o Set dos declarados quando ha pelo menos um", async () => {
    vi.mocked(prisma.userSkill.findMany).mockResolvedValue([{ userId: "u1" }, { userId: "u2" }] as never);
    expect(await capableUserIdsForRole("r1")).toEqual(new Set(["u1", "u2"]));
  });
});

describe("setOwnSkill", () => {
  it("usa o usuario da sessao no upsert/deleteMany", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: "me" } as never);
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: "ms1" } as never);
    await setOwnSkill({ roleId: "r1", enabled: true });
    expect(prisma.userSkill.upsert).toHaveBeenCalledWith({
      where: { userId_roleId: { userId: "me", roleId: "r1" } },
      create: { userId: "me", roleId: "r1" },
      update: {},
    });
    await setOwnSkill({ roleId: "r1", enabled: false });
    expect(prisma.userSkill.deleteMany).toHaveBeenCalledWith({ where: { userId: "me", roleId: "r1" } });
  });
});

describe("setMemberSkill", () => {
  beforeEach(() => {
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({ id: "ms1" } as never);
  });

  it("enabled true faz upsert em (userId, roleId)", async () => {
    await setMemberSkill({ userId: "u9", roleId: "r1", enabled: true });
    expect(prisma.userSkill.upsert).toHaveBeenCalledWith({
      where: { userId_roleId: { userId: "u9", roleId: "r1" } },
      create: { userId: "u9", roleId: "r1" },
      update: {},
    });
    expect(prisma.userSkill.deleteMany).not.toHaveBeenCalled();
  });

  it("enabled false faz deleteMany em (userId, roleId)", async () => {
    await setMemberSkill({ userId: "u9", roleId: "r1", enabled: false });
    expect(prisma.userSkill.deleteMany).toHaveBeenCalledWith({ where: { userId: "u9", roleId: "r1" } });
    expect(prisma.userSkill.upsert).not.toHaveBeenCalled();
  });
});
