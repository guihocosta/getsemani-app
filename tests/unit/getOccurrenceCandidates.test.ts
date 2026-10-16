import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    occurrence: { findUniqueOrThrow: vi.fn() },
    allocation: { findMany: vi.fn() },
  },
}));
vi.mock("@/modules/identity/services/authz", () => ({ requireLeaderOf: vi.fn() }));
vi.mock("@/modules/identity/services/memberships", () => ({ activeMembersWithName: vi.fn() }));
vi.mock("@/modules/reports/services/reports", () => ({ loadByPerson: vi.fn() }));
vi.mock("@/modules/availability/services/checkConflict", () => ({ usersUnavailableAt: vi.fn() }));
vi.mock("@/modules/ministries/services/userSkills", () => ({ capableUserIdsForRole: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { activeMembersWithName } from "@/modules/identity/services/memberships";
import { loadByPerson } from "@/modules/reports/services/reports";
import { usersUnavailableAt } from "@/modules/availability/services/checkConflict";
import { capableUserIdsForRole } from "@/modules/ministries/services/userSkills";
import { getOccurrenceCandidates } from "@/modules/scheduling/services/getOccurrenceCandidates";

const occurrence = {
  id: "o1",
  date: new Date("2026-10-18T22:00:00Z"),
  schedule: { ministryId: "m1" },
  slots: [{ roleId: "r1" }, { roleId: "r1" }, { roleId: "r2" }],
};

describe("getOccurrenceCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue(occurrence as never);
  });

  it("nao-lider: FORBIDDEN antes de ler membros", async () => {
    vi.mocked(requireLeaderOf).mockRejectedValue(new Error("FORBIDDEN"));

    await expect(getOccurrenceCandidates("o1")).rejects.toThrow("FORBIDDEN");
    expect(requireLeaderOf).toHaveBeenCalledWith("m1");
    expect(activeMembersWithName).not.toHaveBeenCalled();
  });

  it("monta candidatos com carga, indisponibilidade, capacitacao por funcao e convidados", async () => {
    vi.mocked(requireLeaderOf).mockResolvedValue({} as never);
    vi.mocked(activeMembersWithName).mockResolvedValue([
      { userId: "u1", role: "VOLUNTEER", user: { name: "Ana" } },
      { userId: "u2", role: "LEADER", user: { name: "Bruno" } },
    ]);
    vi.mocked(loadByPerson).mockResolvedValue([{ userId: "u2", count: 3 }] as never);
    vi.mocked(usersUnavailableAt).mockResolvedValue(new Set(["u1"]));
    vi.mocked(prisma.allocation.findMany).mockResolvedValue([{ guestName: "Zé" }, { guestName: "Caio" }] as never);
    vi.mocked(capableUserIdsForRole).mockImplementation(async (roleId) => (roleId === "r1" ? new Set(["u2"]) : null));

    const res = await getOccurrenceCandidates("o1", new Date("2026-10-16T12:00:00Z"));

    expect(res.candidates).toEqual([
      { userId: "u1", name: "Ana", count30d: 0, unavailable: true, capable: false },
      { userId: "u2", name: "Bruno", count30d: 3, unavailable: false, capable: false },
    ]);
    expect(res.capableUserIdsByRole).toEqual({ r1: ["u2"], r2: null });
    expect(capableUserIdsForRole).toHaveBeenCalledTimes(2);
    expect(res.guestNames).toEqual(["Caio", "Zé"]);
    expect(loadByPerson).toHaveBeenCalledWith(new Date("2026-09-16T12:00:00Z"), new Date("2026-10-16T12:00:00Z"), ["m1"]);
  });
});
