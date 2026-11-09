import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { notification: { findFirst: vi.fn() } } }));
vi.mock("@/lib/push", () => ({ sendPush: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { lastNotificationAt } from "@/modules/notifications/services/notify";

describe("lastNotificationAt", () => {
  it("ultimo pelo prefixo", async () => {
    const quando = new Date("2026-10-15T14:30:00.000Z");
    vi.mocked(prisma.notification.findFirst).mockResolvedValueOnce({ createdAt: quando } as never);
    expect(await lastNotificationAt("lembrete-manual:a1:")).toEqual(quando);
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: { dedupeKey: { startsWith: "lembrete-manual:a1:" } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    vi.mocked(prisma.notification.findFirst).mockResolvedValueOnce(null as never);
    expect(await lastNotificationAt("lembrete-manual:a2:")).toBeNull();
  });
});
