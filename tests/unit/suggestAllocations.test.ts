import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    occurrence: { findUniqueOrThrow: vi.fn() },
    allocation: { create: vi.fn() },
  },
}));
vi.mock("@/modules/identity/services/authz", () => ({ requireLeaderOf: vi.fn() }));
vi.mock("@/modules/identity/services/memberships", () => ({ activeMemberIds: vi.fn() }));
vi.mock("@/modules/availability/services/checkConflict", () => ({
  usersUnavailableAt: vi.fn(async () => new Set<string>()),
}));
vi.mock("@/modules/ministries/services/userSkills", () => ({ capableUserIdsForRole: vi.fn(async () => null) }));
vi.mock("@/modules/reports/services/reports", () => ({
  loadByPerson: vi.fn(async () => []),
  attendanceRows: vi.fn(async () => []),
}));
vi.mock("@/modules/notifications/services/notify", () => ({
  notifyUser: vi.fn(async () => "sent"),
  wasNotified: vi.fn(async () => false),
}));

import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { activeMemberIds } from "@/modules/identity/services/memberships";
import { loadByPerson, attendanceRows } from "@/modules/reports/services/reports";
import { notifyUser } from "@/modules/notifications/services/notify";
import { suggestAllocations } from "@/modules/scheduling/services/suggestAllocations";

const NOW = new Date("2026-10-02T15:00:00Z");
const DATA = new Date("2026-10-11T22:00:00Z");
const DIA = 864e5;

function slot(id: string, roleId: string, over: { active?: boolean; userId?: string } = {}) {
  return {
    id,
    roleId,
    active: over.active ?? true,
    role: { name: roleId },
    allocation: over.userId ? { userId: over.userId } : null,
  };
}

function occurrence(
  over: { published?: boolean; date?: Date; status?: string; slots?: ReturnType<typeof slot>[] } = {},
) {
  return {
    id: "o1",
    status: over.status ?? "ACTIVE",
    date: over.date ?? DATA,
    published: over.published ?? true,
    schedule: { ministryId: "m1" },
    slots: over.slots ?? [slot("s1", "r1"), slot("s2", "r2")],
  };
}

beforeEach(() => {
  vi.mocked(prisma.allocation.create).mockReset();
  let n = 0;
  vi.mocked(prisma.allocation.create).mockImplementation((async () => ({ id: `al${++n}` })) as never);
  vi.mocked(notifyUser).mockClear();
  vi.mocked(loadByPerson).mockClear();
  vi.mocked(attendanceRows).mockClear();
  vi.mocked(requireLeaderOf).mockReset();
  vi.mocked(activeMemberIds).mockResolvedValue(["u1", "u2", "u3"]);
  vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue(occurrence() as never);
});

describe("suggestAllocations", () => {
  it("grava PENDING so nas vagas abertas ativas", async () => {
    vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue(
      occurrence({
        slots: [
          slot("s1", "r1"),
          slot("s2", "r2"),
          slot("s3", "r3", { active: false }),
          slot("s4", "r4", { userId: "u3" }),
        ],
      }) as never,
    );

    const res = await suggestAllocations("o1", NOW);

    expect(res).toEqual({ filled: 2, unfilled: 0 });
    expect(prisma.allocation.create).toHaveBeenCalledTimes(2);
    expect(prisma.allocation.create).toHaveBeenCalledWith({
      data: { slotId: "s1", userId: "u1", source: "LEADER", status: "PENDING" },
    });
    expect(prisma.allocation.create).toHaveBeenCalledWith({
      data: { slotId: "s2", userId: "u2", source: "LEADER", status: "PENDING" },
    });
  });

  it("notifica so se publicada, com assign:<id>", async () => {
    await suggestAllocations("o1", NOW);
    expect(notifyUser).toHaveBeenCalledTimes(2);
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", type: "ASSIGNMENT", dedupeKey: "assign:al1" }),
    );
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u2", type: "ASSIGNMENT", dedupeKey: "assign:al2" }),
    );

    vi.mocked(notifyUser).mockClear();
    vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue(occurrence({ published: false }) as never);
    await suggestAllocations("o1", NOW);
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("FORBIDDEN nao grava", async () => {
    vi.mocked(requireLeaderOf).mockRejectedValue(new Error("FORBIDDEN"));
    await expect(suggestAllocations("o1", NOW)).rejects.toThrow("FORBIDDEN");
    expect(prisma.allocation.create).not.toHaveBeenCalled();
  });

  it("OCCURRENCE_PAST para data que ja passou, sem gravar", async () => {
    vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue(
      occurrence({ date: new Date("2026-10-01T22:00:00Z") }) as never,
    );
    await expect(suggestAllocations("o1", NOW)).rejects.toThrow("OCCURRENCE_PAST");
    expect(prisma.allocation.create).not.toHaveBeenCalled();
  });

  it("OCCURRENCE_PAST tambem quando a data e exatamente agora", async () => {
    vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue(occurrence({ date: NOW }) as never);
    await expect(suggestAllocations("o1", NOW)).rejects.toThrow("OCCURRENCE_PAST");
    expect(prisma.allocation.create).not.toHaveBeenCalled();
  });

  it("OCCURRENCE_CANCELLED para data cancelada, sem gravar nem notificar", async () => {
    vi.mocked(prisma.occurrence.findUniqueOrThrow).mockResolvedValue(
      occurrence({ status: "CANCELLED" }) as never,
    );
    await expect(suggestAllocations("o1", NOW)).rejects.toThrow("OCCURRENCE_CANCELLED");
    expect(prisma.allocation.create).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("P2002 conta a vaga como nao preenchida e segue", async () => {
    vi.mocked(prisma.allocation.create)
      .mockReset()
      .mockRejectedValueOnce({ code: "P2002" })
      .mockResolvedValueOnce({ id: "al2" } as never);

    expect(await suggestAllocations("o1", NOW)).toEqual({ filled: 1, unfilled: 1 });
    expect(prisma.allocation.create).toHaveBeenCalledTimes(2);
  });

  it("janelas: carga em torno da data, faltas nos 30 dias encerrados antes de hoje", async () => {
    await suggestAllocations("o1", NOW);

    expect(loadByPerson).toHaveBeenCalledWith(
      new Date(DATA.getTime() - 30 * DIA),
      new Date(DATA.getTime() + 30 * DIA),
      ["m1"],
    );
    expect(attendanceRows).toHaveBeenCalledWith(
      new Date("2026-09-02T03:00:00.000Z"),
      new Date("2026-10-02T03:00:00.000Z"),
      ["m1"],
    );
  });
});
