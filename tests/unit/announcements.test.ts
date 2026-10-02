import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    announcement: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));
vi.mock("@/modules/identity/services/authz", () => ({ requireLeaderOf: vi.fn() }));
vi.mock("@/modules/identity/services/memberships", () => ({ activeMemberIds: vi.fn() }));
vi.mock("@/modules/notifications/services/notify", () => ({ notifyUser: vi.fn(async () => "sent") }));

import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { activeMemberIds } from "@/modules/identity/services/memberships";
import { notifyUser } from "@/modules/notifications/services/notify";
import { announcementSchema } from "@/modules/announcements/domain/validation";
import {
  createAnnouncement,
  setAnnouncementPinned,
  deleteAnnouncement,
  listAnnouncements,
  listPinnedAnnouncements,
} from "@/modules/announcements/services/announcements";

const x = (n: number) => "x".repeat(n);

beforeEach(() => {
  vi.mocked(prisma.announcement.create).mockReset();
  vi.mocked(prisma.announcement.update).mockReset();
  vi.mocked(prisma.announcement.delete).mockReset();
  vi.mocked(prisma.announcement.findMany).mockReset();
  vi.mocked(notifyUser).mockClear();
  vi.mocked(requireLeaderOf).mockReset();
  vi.mocked(requireLeaderOf).mockResolvedValue({ id: "u1" } as never);
  vi.mocked(activeMemberIds).mockResolvedValue(["u1", "u2", "u3"]);
  vi.mocked(prisma.announcement.create).mockResolvedValue({
    id: "an1",
    title: "Ensaio",
    body: "Quinta 20h",
  } as never);
  vi.mocked(prisma.announcement.findUniqueOrThrow).mockResolvedValue({ id: "an1", ministryId: "m1" } as never);
});

describe("announcementSchema", () => {
  it("announcementSchema rejeita fora dos limites e aceita os limites", () => {
    expect(announcementSchema.safeParse({ title: "  ", body: "a" }).success).toBe(false);
    expect(announcementSchema.safeParse({ title: x(81), body: "a" }).success).toBe(false);
    expect(announcementSchema.safeParse({ title: "a", body: "  " }).success).toBe(false);
    expect(announcementSchema.safeParse({ title: "a", body: x(1001) }).success).toBe(false);

    expect(announcementSchema.safeParse({ title: x(80), body: x(1000) }).success).toBe(true);
  });
});

describe("createAnnouncement", () => {
  it("createAnnouncement grava ministerio, autor, texto aparado e destaque", async () => {
    await createAnnouncement({ ministryId: "m1", title: "  Ensaio  ", body: " Quinta 20h ", pinned: true });

    expect(prisma.announcement.create).toHaveBeenCalledWith({
      data: { ministryId: "m1", authorId: "u1", title: "Ensaio", body: "Quinta 20h", pinned: true },
    });
  });

  it("INVALID_INPUT nao grava nem notifica", async () => {
    await expect(createAnnouncement({ ministryId: "m1", title: " ", body: "a" })).rejects.toThrow("INVALID_INPUT");
    expect(prisma.announcement.create).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("notifica membros menos o autor, uma vez cada", async () => {
    await createAnnouncement({ ministryId: "m1", title: "Ensaio", body: "Quinta 20h" });

    expect(notifyUser).toHaveBeenCalledTimes(2);
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u2",
        type: "ANNOUNCEMENT",
        dedupeKey: "announcement:an1:u2",
        title: "Ensaio",
        url: "/avisos",
      }),
    );
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u3",
        type: "ANNOUNCEMENT",
        dedupeKey: "announcement:an1:u3",
        title: "Ensaio",
        url: "/avisos",
      }),
    );
  });
});

describe("falha ao avisar", () => {
  it("falha ao buscar membros nao desfaz nem relanca: o aviso gravado e devolvido", async () => {
    vi.mocked(activeMemberIds).mockRejectedValueOnce(new Error("db down"));

    const saved = await createAnnouncement({ ministryId: "m1", title: "Ensaio", body: "Quinta 20h" });

    expect(saved).toMatchObject({ id: "an1" });
    expect(prisma.announcement.create).toHaveBeenCalledTimes(1);
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("requireLeaderOf recebe o ministerio do proprio aviso ao destacar e apagar", async () => {
    vi.mocked(prisma.announcement.findUniqueOrThrow).mockResolvedValue({ id: "an1", ministryId: "m7" } as never);

    await setAnnouncementPinned({ announcementId: "an1", pinned: true });
    await deleteAnnouncement({ announcementId: "an1" });

    expect(requireLeaderOf).toHaveBeenNthCalledWith(1, "m7");
    expect(requireLeaderOf).toHaveBeenNthCalledWith(2, "m7");
  });
});

describe("gerenciar aviso", () => {
  it("setAnnouncementPinned grava o destaque", async () => {
    await setAnnouncementPinned({ announcementId: "an1", pinned: true });
    expect(prisma.announcement.update).toHaveBeenCalledWith({ where: { id: "an1" }, data: { pinned: true } });
  });

  it("deleteAnnouncement apaga pelo id", async () => {
    await deleteAnnouncement({ announcementId: "an1" });
    expect(prisma.announcement.delete).toHaveBeenCalledWith({ where: { id: "an1" } });
  });

  it("FORBIDDEN nao grava em nenhuma escrita", async () => {
    vi.mocked(requireLeaderOf).mockRejectedValue(new Error("FORBIDDEN"));

    await expect(createAnnouncement({ ministryId: "m1", title: "a", body: "b" })).rejects.toThrow("FORBIDDEN");
    await expect(setAnnouncementPinned({ announcementId: "an1", pinned: true })).rejects.toThrow("FORBIDDEN");
    await expect(deleteAnnouncement({ announcementId: "an1" })).rejects.toThrow("FORBIDDEN");

    expect(prisma.announcement.create).not.toHaveBeenCalled();
    expect(prisma.announcement.update).not.toHaveBeenCalled();
    expect(prisma.announcement.delete).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });
});

describe("leitura", () => {
  const row = {
    id: "an1",
    ministryId: "m1",
    title: "Ensaio",
    body: "Quinta 20h",
    pinned: true,
    createdAt: new Date("2026-10-02T12:00:00Z"),
    ministry: { name: "Louvor" },
    author: { name: "Ana" },
  };

  it("listAnnouncements filtra ministerios, destaque primeiro, limite 50", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([row] as never);

    const items = await listAnnouncements(["m1"]);

    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ministryId: { in: ["m1"] } },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 50,
      }),
    );
    expect(items[0]).toMatchObject({ id: "an1", ministry: "Louvor", author: "Ana", pinned: true });
  });

  it("listPinnedAnnouncements traz so destaque, mais novo primeiro, limite 3", async () => {
    vi.mocked(prisma.announcement.findMany).mockResolvedValue([row] as never);

    await listPinnedAnnouncements(["m1"]);

    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ministryId: { in: ["m1"] }, pinned: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    );
  });

  it("listPinnedAnnouncements sem ministerios nao consulta", async () => {
    expect(await listPinnedAnnouncements([])).toEqual([]);
    expect(prisma.announcement.findMany).not.toHaveBeenCalled();
  });
});
