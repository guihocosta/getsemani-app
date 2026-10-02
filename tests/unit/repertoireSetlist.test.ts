import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    occurrenceSong: {
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn((args: unknown) => args),
      delete: vi.fn(),
    },
    songVersion: { findUniqueOrThrow: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));
vi.mock("@/modules/identity/services/authz", () => ({
  requireUser: vi.fn(),
  requireLeaderOf: vi.fn(),
  isLeaderOf: vi.fn(),
}));
vi.mock("@/modules/ministries/services/modules", () => ({ assertRepertoireEnabled: vi.fn() }));
vi.mock("@/modules/scheduling/services/listMonthOccurrences", () => ({ visibleMinistryIds: vi.fn() }));
vi.mock("@/modules/scheduling/services/occurrenceAccess", () => ({ getOccurrenceAccess: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { requireUser, requireLeaderOf, isLeaderOf } from "@/modules/identity/services/authz";
import { assertRepertoireEnabled } from "@/modules/ministries/services/modules";
import { visibleMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { getOccurrenceAccess } from "@/modules/scheduling/services/occurrenceAccess";
import { getSetlist, addToSetlist, moveInSetlist, removeFromSetlist } from "@/modules/repertoire/services/setlist";

function access(published = true) {
  return {
    occurrenceId: "o1",
    ministryId: "m1",
    published,
    date: new Date("2026-10-11T22:00:00Z"),
    title: "Louvor · Culto",
  };
}

const versaoRow = {
  id: "v1",
  songId: "s1",
  name: "Original",
  key: "A",
  bpm: 68,
  durationSec: 302,
  lyricsUrl: "https://letras.mus.br/x",
  chordsUrl: "https://cifraclub.com.br/x",
  audioUrl: null,
  videoUrl: null,
  song: { title: "Bondade de Deus", artist: "Banda", ministryId: "m1" },
};

const tres = [
  { id: "e1", occurrenceId: "o1", position: 1 },
  { id: "e2", occurrenceId: "o1", position: 2 },
  { id: "e3", occurrenceId: "o1", position: 3 },
];

beforeEach(() => {
  vi.mocked(prisma.occurrenceSong.create).mockReset();
  vi.mocked(prisma.occurrenceSong.update).mockClear();
  vi.mocked(prisma.occurrenceSong.delete).mockReset();
  vi.mocked(requireLeaderOf).mockReset();
  vi.mocked(assertRepertoireEnabled).mockReset();
  vi.mocked(requireUser).mockResolvedValue({ id: "u1", isAdmin: false } as never);
  vi.mocked(visibleMinistryIds).mockResolvedValue(["m1"]);
  vi.mocked(isLeaderOf).mockResolvedValue(false);
  vi.mocked(getOccurrenceAccess).mockResolvedValue(access());
  vi.mocked(prisma.songVersion.findUniqueOrThrow).mockResolvedValue(versaoRow as never);
  vi.mocked(prisma.occurrenceSong.findMany).mockResolvedValue(tres as never);
  vi.mocked(prisma.occurrenceSong.aggregate).mockResolvedValue({ _max: { position: null } } as never);
});

describe("addToSetlist", () => {
  it("posicao e a maior existente + 1, ou 1 na lista vazia", async () => {
    await addToSetlist({ occurrenceId: "o1", versionId: "v1" });
    expect(prisma.occurrenceSong.create).toHaveBeenLastCalledWith({
      data: { occurrenceId: "o1", songVersionId: "v1", position: 1 },
    });

    vi.mocked(prisma.occurrenceSong.aggregate).mockResolvedValue({ _max: { position: 2 } } as never);
    await addToSetlist({ occurrenceId: "o1", versionId: "v1" });
    expect(prisma.occurrenceSong.create).toHaveBeenLastCalledWith({
      data: { occurrenceId: "o1", songVersionId: "v1", position: 3 },
    });
  });

  it("P2002 vira ALREADY_IN_SETLIST", async () => {
    vi.mocked(prisma.occurrenceSong.create).mockRejectedValue({ code: "P2002" });
    await expect(addToSetlist({ occurrenceId: "o1", versionId: "v1" })).rejects.toThrow("ALREADY_IN_SETLIST");
  });

  it("versao de outro ministerio rejeita com INVALID_INPUT sem gravar", async () => {
    vi.mocked(prisma.songVersion.findUniqueOrThrow).mockResolvedValue({
      ...versaoRow,
      song: { ...versaoRow.song, ministryId: "m2" },
    } as never);

    await expect(addToSetlist({ occurrenceId: "o1", versionId: "v1" })).rejects.toThrow("INVALID_INPUT");
    expect(prisma.occurrenceSong.create).not.toHaveBeenCalled();
  });
});

describe("moveInSetlist", () => {
  it("moveInSetlist do meio para cima troca as posicoes 1 e 2", async () => {
    vi.mocked(prisma.occurrenceSong.findUniqueOrThrow).mockResolvedValue(tres[1] as never);
    await moveInSetlist({ entryId: "e2", direction: "up" });

    expect(prisma.occurrenceSong.update).toHaveBeenCalledTimes(2);
    expect(prisma.occurrenceSong.update).toHaveBeenCalledWith({ where: { id: "e2" }, data: { position: 1 } });
    expect(prisma.occurrenceSong.update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { position: 2 } });
  });

  it("moveInSetlist na borda nao altera nada", async () => {
    vi.mocked(prisma.occurrenceSong.findUniqueOrThrow).mockResolvedValue(tres[0] as never);
    await moveInSetlist({ entryId: "e1", direction: "up" });
    vi.mocked(prisma.occurrenceSong.findUniqueOrThrow).mockResolvedValue(tres[2] as never);
    await moveInSetlist({ entryId: "e3", direction: "down" });

    expect(prisma.occurrenceSong.update).not.toHaveBeenCalled();
  });
});

describe("removeFromSetlist", () => {
  it("removeFromSetlist apaga a entrada pelo id", async () => {
    vi.mocked(prisma.occurrenceSong.findUniqueOrThrow).mockResolvedValue(tres[0] as never);
    await removeFromSetlist({ entryId: "e1" });
    expect(prisma.occurrenceSong.delete).toHaveBeenCalledWith({ where: { id: "e1" } });
  });
});

describe("getSetlist", () => {
  beforeEach(() => {
    vi.mocked(prisma.occurrenceSong.findMany).mockResolvedValue([{ id: "e1", version: versaoRow }] as never);
  });

  it("getSetlist devolve as entradas em ordem de posicao com os dados da versao", async () => {
    const res = await getSetlist("o1");

    expect(prisma.occurrenceSong.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { occurrenceId: "o1" },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      }),
    );
    expect(res.entries).toEqual([
      {
        entryId: "e1",
        songId: "s1",
        title: "Bondade de Deus",
        artist: "Banda",
        versionName: "Original",
        key: "A",
        bpm: 68,
        durationSec: 302,
        lyricsUrl: "https://letras.mus.br/x",
        chordsUrl: "https://cifraclub.com.br/x",
        audioUrl: null,
        videoUrl: null,
      },
    ]);
  });

  it("rascunho: quem nao lidera recebe FORBIDDEN, quem lidera ve a lista", async () => {
    vi.mocked(getOccurrenceAccess).mockResolvedValue(access(false));
    await expect(getSetlist("o1")).rejects.toThrow("FORBIDDEN");

    vi.mocked(isLeaderOf).mockResolvedValue(true);
    const res = await getSetlist("o1");
    expect(res.entries).toHaveLength(1);
    expect(res.canManage).toBe(true);
  });

  it("modulo desligado barra getSetlist", async () => {
    vi.mocked(assertRepertoireEnabled).mockRejectedValue(new Error("MODULE_DISABLED"));
    await expect(getSetlist("o1")).rejects.toThrow("MODULE_DISABLED");
  });
});

describe("autorizacao de escrita", () => {
  it("FORBIDDEN nao grava ao adicionar, mover ou remover", async () => {
    vi.mocked(requireLeaderOf).mockRejectedValue(new Error("FORBIDDEN"));
    vi.mocked(prisma.occurrenceSong.findUniqueOrThrow).mockResolvedValue(tres[1] as never);

    await expect(addToSetlist({ occurrenceId: "o1", versionId: "v1" })).rejects.toThrow("FORBIDDEN");
    await expect(moveInSetlist({ entryId: "e2", direction: "up" })).rejects.toThrow("FORBIDDEN");
    await expect(removeFromSetlist({ entryId: "e2" })).rejects.toThrow("FORBIDDEN");

    expect(prisma.occurrenceSong.create).not.toHaveBeenCalled();
    expect(prisma.occurrenceSong.update).not.toHaveBeenCalled();
    expect(prisma.occurrenceSong.delete).not.toHaveBeenCalled();
  });
});
