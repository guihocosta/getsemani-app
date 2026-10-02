import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    songVersion: { findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/modules/identity/services/authz", () => ({
  requireUser: vi.fn(),
  requireLeaderOf: vi.fn(),
  isLeaderOf: vi.fn(async () => false),
}));
vi.mock("@/modules/ministries/services/modules", () => ({
  assertRepertoireEnabled: vi.fn(),
  repertoireMinistries: vi.fn(),
}));
vi.mock("@/modules/scheduling/services/listMonthOccurrences", () => ({ visibleMinistryIds: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { requireUser, requireLeaderOf } from "@/modules/identity/services/authz";
import { assertRepertoireEnabled, repertoireMinistries } from "@/modules/ministries/services/modules";
import { visibleMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import {
  listSongs,
  getSong,
  listVersionsForMinistry,
  createSong,
  updateSong,
  deleteSong,
  saveVersion,
  deleteVersion,
} from "@/modules/repertoire/services/songs";

const versao = {
  name: "Original",
  key: "A",
  bpm: 68,
  durationSec: 302,
  notes: "entra no refrão",
  lyricsUrl: "https://letras.mus.br/x",
  chordsUrl: "https://cifraclub.com.br/x",
  audioUrl: "https://open.spotify.com/x",
  videoUrl: "https://youtube.com/x",
};

const writes = () => [
  prisma.song.create,
  prisma.song.update,
  prisma.song.delete,
  prisma.songVersion.create,
  prisma.songVersion.update,
  prisma.songVersion.delete,
];

beforeEach(() => {
  writes().forEach((w) => vi.mocked(w).mockReset());
  vi.mocked(requireLeaderOf).mockReset();
  vi.mocked(assertRepertoireEnabled).mockReset();
  vi.mocked(requireUser).mockResolvedValue({ id: "u1", isAdmin: false } as never);
  vi.mocked(prisma.song.findUniqueOrThrow).mockResolvedValue({
    id: "s1",
    ministryId: "m1",
    versions: [],
    ministry: { name: "Louvor" },
  } as never);
  vi.mocked(prisma.songVersion.findUniqueOrThrow).mockResolvedValue({ id: "v1", songId: "s1" } as never);
});

describe("createSong", () => {
  it("createSong grava titulo aparado, vazios como null e a versao Original", async () => {
    await createSong({ ministryId: "m1", title: "  Bondade de Deus  ", artist: "", category: "", notes: "" });

    expect(prisma.song.create).toHaveBeenCalledWith({
      data: {
        ministryId: "m1",
        title: "Bondade de Deus",
        artist: null,
        category: null,
        notes: null,
        versions: { create: { name: "Original" } },
      },
    });
  });
});

describe("saveVersion", () => {
  it("saveVersion sem versionId cria com todos os campos", async () => {
    await saveVersion({ songId: "s1", ...versao });
    expect(prisma.songVersion.create).toHaveBeenCalledWith({ data: { ...versao, songId: "s1" } });
    expect(prisma.songVersion.update).not.toHaveBeenCalled();
  });

  it("saveVersion com versionId atualiza com todos os campos", async () => {
    await saveVersion({ songId: "s1", versionId: "v1", ...versao });
    expect(prisma.songVersion.update).toHaveBeenCalledWith({ where: { id: "v1", songId: "s1" }, data: versao });
    expect(prisma.songVersion.create).not.toHaveBeenCalled();
  });
});

describe("deleteSong", () => {
  it("deleteSong apaga a musica pelo id", async () => {
    await deleteSong({ songId: "s1" });
    expect(prisma.song.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
  });
});

describe("autorizacao de escrita", () => {
  it("FORBIDDEN nao grava em nenhuma escrita de musica ou versao", async () => {
    vi.mocked(requireLeaderOf).mockRejectedValue(new Error("FORBIDDEN"));

    await expect(createSong({ ministryId: "m1", title: "A" })).rejects.toThrow("FORBIDDEN");
    await expect(updateSong({ songId: "s1", title: "A" })).rejects.toThrow("FORBIDDEN");
    await expect(deleteSong({ songId: "s1" })).rejects.toThrow("FORBIDDEN");
    await expect(saveVersion({ songId: "s1", name: "Original" })).rejects.toThrow("FORBIDDEN");
    await expect(deleteVersion({ versionId: "v1" })).rejects.toThrow("FORBIDDEN");

    writes().forEach((w) => expect(w).not.toHaveBeenCalled());
  });
});

describe("modulo desligado", () => {
  it("modulo desligado barra createSong, listVersionsForMinistry e getSong", async () => {
    vi.mocked(assertRepertoireEnabled).mockRejectedValue(new Error("MODULE_DISABLED"));
    vi.mocked(visibleMinistryIds).mockResolvedValue(["m1"]);

    await expect(createSong({ ministryId: "m1", title: "A" })).rejects.toThrow("MODULE_DISABLED");
    await expect(listVersionsForMinistry("m1")).rejects.toThrow("MODULE_DISABLED");
    await expect(getSong("s1")).rejects.toThrow("MODULE_DISABLED");
    expect(prisma.song.create).not.toHaveBeenCalled();
  });
});

describe("listSongs", () => {
  it("listSongs so consulta ministerios com modulo ligado, em ordem de titulo", async () => {
    vi.mocked(repertoireMinistries).mockResolvedValue([{ id: "m1", name: "Louvor" }]);
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      { id: "s1", ministryId: "m1", title: "Bondade", artist: "Banda", category: "Ceia", _count: { versions: 2 } },
    ] as never);

    const res = await listSongs(["m1", "m2"]);

    expect(repertoireMinistries).toHaveBeenCalledWith(["m1", "m2"]);
    expect(prisma.song.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ministryId: { in: ["m1"] } }, orderBy: { title: "asc" } }),
    );
    expect(res.songs).toEqual([
      { id: "s1", ministryId: "m1", title: "Bondade", artist: "Banda", category: "Ceia", versionCount: 2 },
    ]);
  });
});

describe("getSong", () => {
  it("getSong nao membro do ministerio recebe FORBIDDEN", async () => {
    vi.mocked(visibleMinistryIds).mockResolvedValue(["m2"]);
    await expect(getSong("s1")).rejects.toThrow("FORBIDDEN");
  });
});
