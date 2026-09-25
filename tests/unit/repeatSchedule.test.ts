import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    schedule: { findUniqueOrThrow: vi.fn() },
    occurrence: { findMany: vi.fn() },
    membership: { findMany: vi.fn() },
    allocation: { create: vi.fn() },
  },
}));
vi.mock("@/modules/identity/services/authz", () => ({ requireLeaderOf: vi.fn() }));
vi.mock("@/modules/ministries/services/userSkills", () => ({ capableUserIdsForRole: vi.fn() }));
vi.mock("@/modules/availability/services/checkConflict", () => ({
  usersUnavailableAt: vi.fn(async () => new Set<string>()),
}));
vi.mock("@/modules/notifications/services/notify", () => ({ notifyUser: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { capableUserIdsForRole } from "@/modules/ministries/services/userSkills";
import { repeatSchedule, RepeatPartialFailure } from "@/modules/scheduling/services/repeatSchedule";

const PAST = new Date("2000-01-02T12:00:00Z");
const FUTURE = new Date("2999-01-02T12:00:00Z");

function slot(id: string, roleId: string, userId: string | null) {
  return {
    id,
    roleId,
    active: true,
    role: { name: roleId },
    allocation: userId ? { userId, guestName: null } : null,
  };
}

// ciclo 1: origem = ocorrencia passada, alvo = ocorrencia futura com as mesmas funcoes vazias
function setup(sourceSlots: ReturnType<typeof slot>[]) {
  vi.mocked(prisma.schedule.findUniqueOrThrow).mockResolvedValue({
    id: "s1",
    ministryId: "m1",
    rotationCycle: 1,
  } as never);
  vi.mocked(prisma.occurrence.findMany).mockResolvedValue([
    { id: "o-src", date: PAST, slots: sourceSlots },
    {
      id: "o-dst",
      date: FUTURE,
      slots: sourceSlots.map((s) => slot(`dst-${s.id}`, s.roleId, null)),
    },
  ] as never);
  const userIds = sourceSlots.map((s) => s.allocation?.userId).filter(Boolean);
  vi.mocked(prisma.membership.findMany).mockResolvedValue(userIds.map((userId) => ({ userId })) as never);
}

beforeEach(() => {
  vi.mocked(prisma.allocation.create).mockReset();
  vi.mocked(capableUserIdsForRole).mockReset();
});

describe("repeatSchedule", () => {
  it("falha parcial carrega filled quando a 2a copia quebra sem code", async () => {
    setup([slot("a", "r1", "u1"), slot("b", "r2", "u2")]);
    vi.mocked(capableUserIdsForRole).mockResolvedValue(null);
    vi.mocked(prisma.allocation.create)
      .mockResolvedValueOnce({ id: "al1" } as never)
      .mockRejectedValueOnce(new Error("db down"));

    const err = await repeatSchedule("s1").catch((e) => e);
    expect(err).toBeInstanceOf(RepeatPartialFailure);
    expect((err as RepeatPartialFailure).filled).toBe(1);
  });

  it("capacitacao nao declarada (null) nao bloqueia a copia", async () => {
    setup([slot("a", "r1", "u1")]);
    vi.mocked(capableUserIdsForRole).mockResolvedValue(null);
    vi.mocked(prisma.allocation.create).mockResolvedValue({ id: "al1" } as never);

    expect(await repeatSchedule("s1")).toEqual({ filled: 1, skipped: 0 });
  });

  it("capacitacao nao declarada pra origem, mas declarada por outro: pula", async () => {
    setup([slot("a", "r1", "u1")]);
    vi.mocked(capableUserIdsForRole).mockResolvedValue(new Set(["outro"]));

    expect(await repeatSchedule("s1")).toEqual({ filled: 0, skipped: 1 });
    expect(prisma.allocation.create).not.toHaveBeenCalled();
  });
});
