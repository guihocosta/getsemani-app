import { describe, it, expect, vi, beforeEach } from "vitest";

// notifyUser nao pode derrubar o fluxo de dominio que a chama (alocar, aprovar,
// pedir troca...) — falha de push ja era tolerada, mas as chamadas Prisma nao.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    pushSubscription: {
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/push", () => ({ sendPush: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/modules/notifications/services/notify";

const base = { userId: "u1", type: "ASSIGNMENT" as const, title: "t", body: "b" };

describe("notifyUser nunca lanca", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolve 'failed' se o create de Notification falhar", async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.notification.create).mockRejectedValue(new Error("db down"));

    const result = await notifyUser({ ...base, dedupeKey: "k1" });
    expect(result).toBe("failed");
  });

  it("resolve 'failed' se o update final (sentAt) falhar", async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "n1" } as never);
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.notification.update).mockRejectedValue(new Error("db down"));

    const result = await notifyUser({ ...base, dedupeKey: "k2" });
    expect(result).toBe("failed");
  });

  it("resolve 'duplicate' se ja foi enviado", async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue({ sentAt: new Date() } as never);

    const result = await notifyUser({ ...base, dedupeKey: "k3" });
    expect(result).toBe("duplicate");
  });

  it("resolve 'sent' no caminho feliz", async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "n1" } as never);
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.notification.update).mockResolvedValue({} as never);

    const result = await notifyUser({ ...base, dedupeKey: "k4" });
    expect(result).toBe("sent");
  });
});
