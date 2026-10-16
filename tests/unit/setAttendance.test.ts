import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { allocation: { findUniqueOrThrow: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/modules/identity/services/authz", () => ({ requireLeaderOf: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { setAttendance } from "@/modules/scheduling/services/setAttendance";

const ONTEM = new Date(Date.now() - 24 * 60 * 60 * 1000);
const AMANHA = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

function allocation(
  over: { userId?: string | null; date?: Date; checkedInAt?: Date | null; status?: "PENDING" | "CONFIRMED" } = {},
) {
  return {
    id: "a1",
    userId: over.userId === undefined ? "u1" : over.userId,
    status: over.status ?? "CONFIRMED",
    checkedInAt: over.checkedInAt ?? null,
    slot: { occurrence: { date: over.date ?? ONTEM, schedule: { ministryId: "m1" } } },
  };
}

beforeEach(() => {
  vi.mocked(prisma.allocation.update).mockReset();
  vi.mocked(requireLeaderOf).mockReset();
});

describe("setAttendance", () => {
  it("marca presente em dia passado", async () => {
    vi.mocked(prisma.allocation.findUniqueOrThrow).mockResolvedValue(allocation() as never);
    await setAttendance({ allocationId: "a1", present: true });

    expect(requireLeaderOf).toHaveBeenCalledWith("m1");
    const data = vi.mocked(prisma.allocation.update).mock.calls[0][0].data as { checkedInAt: Date };
    expect(data.checkedInAt).toBeInstanceOf(Date);
  });

  it("mantem o horario do check-in que o voluntario ja fez", async () => {
    const feito = new Date("2026-10-01T22:05:00Z");
    vi.mocked(prisma.allocation.findUniqueOrThrow).mockResolvedValue(allocation({ checkedInAt: feito }) as never);
    await setAttendance({ allocationId: "a1", present: true });

    expect(prisma.allocation.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { checkedInAt: feito } });
  });

  it("presente em PENDING confirma a escala", async () => {
    vi.mocked(prisma.allocation.findUniqueOrThrow).mockResolvedValue(allocation({ status: "PENDING" }) as never);
    await setAttendance({ allocationId: "a1", present: true });

    const data = vi.mocked(prisma.allocation.update).mock.calls[0][0].data as {
      status: string;
      respondedAt: Date;
    };
    expect(data.status).toBe("CONFIRMED");
    expect(data.respondedAt).toBeInstanceOf(Date);
  });

  it("desmarcar zera checkedInAt", async () => {
    vi.mocked(prisma.allocation.findUniqueOrThrow).mockResolvedValue(
      allocation({ checkedInAt: new Date() }) as never,
    );
    await setAttendance({ allocationId: "a1", present: false });

    expect(prisma.allocation.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { checkedInAt: null } });
  });

  it("recusa dia futuro e convidado sem conta", async () => {
    for (const a of [allocation({ date: AMANHA }), allocation({ userId: null })]) {
      vi.mocked(prisma.allocation.findUniqueOrThrow).mockResolvedValue(a as never);
      await expect(setAttendance({ allocationId: "a1", present: true })).rejects.toThrow("ATTENDANCE_NOT_ALLOWED");
    }
    expect(prisma.allocation.update).not.toHaveBeenCalled();
  });

  it("quem nao lidera o ministerio recebe FORBIDDEN e nada e gravado", async () => {
    vi.mocked(prisma.allocation.findUniqueOrThrow).mockResolvedValue(allocation() as never);
    vi.mocked(requireLeaderOf).mockRejectedValue(new Error("FORBIDDEN"));

    await expect(setAttendance({ allocationId: "a1", present: true })).rejects.toThrow("FORBIDDEN");
    expect(prisma.allocation.update).not.toHaveBeenCalled();
  });
});
