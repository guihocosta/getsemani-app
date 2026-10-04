import { describe, it, expect, vi, beforeEach } from "vitest";

const tx = {
  swapRequest: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  membership: { findFirst: vi.fn() },
  allocation: { update: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    allocation: { findUniqueOrThrow: vi.fn(), update: vi.fn(), delete: vi.fn() },
    swapRequest: { create: vi.fn(), update: vi.fn() },
    membership: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}));
vi.mock("@/modules/identity/services/authz", () => ({ requireUser: vi.fn() }));
vi.mock("@/modules/notifications/services/notify", () => ({
  notifyUser: vi.fn(async () => "sent"),
  wasNotified: vi.fn(async () => false),
}));

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { notifyUser, wasNotified } from "@/modules/notifications/services/notify";
import { requestSwap, claimSwap } from "@/modules/scheduling/services/swap";
import {
  confirmAllocation,
  declineAllocation,
  checkInAllocation,
} from "@/modules/scheduling/services/respondAllocation";
import { notifyRemoval } from "@/modules/scheduling/services/notifyIfPublished";

const FUTURE = new Date("2999-01-02T12:00:00Z");

function draftOccurrence() {
  return {
    status: "ACTIVE",
    published: false,
    date: FUTURE,
    schedule: { ministryId: "m1", ministry: { name: "Louvor" } },
  };
}

function draftAllocation(userId: string) {
  return {
    id: "al1",
    userId,
    user: { name: "Ana" },
    swapRequest: null,
    slot: { occurrenceId: "o1", role: { name: "Som" }, occurrence: draftOccurrence() },
  };
}

beforeEach(() => {
  vi.mocked(notifyUser).mockClear();
  vi.mocked(wasNotified).mockReset();
  vi.mocked(wasNotified).mockResolvedValue(false);
  vi.mocked(prisma.allocation.update).mockReset();
  vi.mocked(prisma.allocation.delete).mockReset();
  vi.mocked(prisma.swapRequest.create).mockReset();
  tx.allocation.update.mockReset();
  tx.swapRequest.update.mockReset();
  vi.mocked(requireUser).mockResolvedValue({ id: "u1", name: "Ana", isAdmin: false } as never);
});

describe("troca em rascunho", () => {
  it("requestSwap em rascunho rejeita com NOT_PUBLISHED sem criar pedido nem notificar", async () => {
    vi.mocked(prisma.allocation.findUniqueOrThrow).mockResolvedValue(draftAllocation("u1") as never);

    await expect(requestSwap({ allocationId: "al1" })).rejects.toThrow("NOT_PUBLISHED");
    expect(prisma.swapRequest.create).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("claimSwap em rascunho rejeita com NOT_PUBLISHED sem reatribuir nem notificar", async () => {
    tx.swapRequest.findUniqueOrThrow.mockResolvedValue({
      id: "sw1",
      status: "OPEN",
      requestedBy: "u2",
      allocationId: "al1",
      allocation: draftAllocation("u2"),
    });
    tx.membership.findFirst.mockResolvedValue({ id: "ms1" });

    await expect(claimSwap({ swapRequestId: "sw1" })).rejects.toThrow("NOT_PUBLISHED");
    expect(tx.allocation.update).not.toHaveBeenCalled();
    expect(tx.swapRequest.update).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });
});

describe("resposta em rascunho", () => {
  beforeEach(() => {
    vi.mocked(prisma.allocation.findUniqueOrThrow).mockResolvedValue(draftAllocation("u1") as never);
  });

  it("confirmar em rascunho rejeita com NOT_PUBLISHED sem gravar", async () => {
    await expect(confirmAllocation({ allocationId: "al1" })).rejects.toThrow("NOT_PUBLISHED");
    expect(prisma.allocation.update).not.toHaveBeenCalled();
  });

  it("recusar em rascunho rejeita com NOT_PUBLISHED sem apagar", async () => {
    await expect(declineAllocation({ allocationId: "al1" })).rejects.toThrow("NOT_PUBLISHED");
    expect(prisma.allocation.delete).not.toHaveBeenCalled();
  });

  it("check-in em rascunho rejeita com NOT_PUBLISHED sem gravar", async () => {
    await expect(checkInAllocation({ allocationId: "al1" })).rejects.toThrow("NOT_PUBLISHED");
    expect(prisma.allocation.update).not.toHaveBeenCalled();
  });
});

describe("notifyRemoval", () => {
  const params = {
    userId: "u1",
    type: "ASSIGNMENT" as const,
    dedupeKey: "unassign:al1",
    title: "Você foi removido de uma escala",
    body: "Som",
  };

  it("notifyRemoval em rascunho pula quem nunca soube da escalacao", async () => {
    expect(await notifyRemoval(false, { id: "al1", status: "PENDING" }, params)).toBe("skipped");
    expect(wasNotified).toHaveBeenCalledWith("assign:al1");
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("notifyRemoval em rascunho avisa quem ja tinha sido avisado da escalacao", async () => {
    vi.mocked(wasNotified).mockResolvedValue(true);
    expect(await notifyRemoval(false, { id: "al1", status: "PENDING" }, params)).toBe("sent");
    expect(notifyUser).toHaveBeenCalledWith(params);
  });

  it("notifyRemoval em rascunho avisa quem ja tinha confirmado", async () => {
    expect(await notifyRemoval(false, { id: "al1", status: "CONFIRMED" }, params)).toBe("sent");
    expect(notifyUser).toHaveBeenCalledWith(params);
  });

  it("notifyRemoval em publicada sempre avisa", async () => {
    expect(await notifyRemoval(true, { id: "al1", status: "PENDING" }, params)).toBe("sent");
    expect(wasNotified).not.toHaveBeenCalled();
  });
});
