import { describe, it, expect } from "vitest";
import {
  songSchema,
  versionSchema,
  parseDuration,
  formatDuration,
  filterSongs,
  repertoireEmptyMessage,
} from "@/modules/repertoire/domain/validation";

const x = (n: number) => "x".repeat(n);

describe("songSchema", () => {
  it("songSchema rejeita fora dos limites e aceita os limites", () => {
    expect(songSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(songSchema.safeParse({ title: x(121) }).success).toBe(false);
    expect(songSchema.safeParse({ title: "a", artist: x(121) }).success).toBe(false);
    expect(songSchema.safeParse({ title: "a", category: x(41) }).success).toBe(false);
    expect(songSchema.safeParse({ title: "a", notes: x(501) }).success).toBe(false);

    const ok = songSchema.safeParse({ title: x(120), artist: x(120), category: x(40), notes: x(500) });
    expect(ok.success).toBe(true);
  });
});

describe("versionSchema", () => {
  const base = { name: "Original" };

  it("versionSchema limites de nome, tom, BPM e duracao", () => {
    expect(versionSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(versionSchema.safeParse({ name: x(41) }).success).toBe(false);
    expect(versionSchema.safeParse({ ...base, key: x(11) }).success).toBe(false);
    expect(versionSchema.safeParse({ ...base, bpm: 19 }).success).toBe(false);
    expect(versionSchema.safeParse({ ...base, bpm: 401 }).success).toBe(false);
    expect(versionSchema.safeParse({ ...base, bpm: 68.5 }).success).toBe(false);
    expect(versionSchema.safeParse({ ...base, durationSec: 0 }).success).toBe(false);
    expect(versionSchema.safeParse({ ...base, durationSec: 7201 }).success).toBe(false);

    expect(versionSchema.safeParse({ ...base, bpm: 20, durationSec: 1 }).success).toBe(true);
    expect(versionSchema.safeParse({ ...base, bpm: 400, durationSec: 7200 }).success).toBe(true);
  });

  it.each(["lyricsUrl", "chordsUrl", "audioUrl", "videoUrl"] as const)("links so http(s) em %s", (campo) => {
    expect(versionSchema.safeParse({ ...base, [campo]: "javascript:alert(1)" }).success).toBe(false);
    expect(versionSchema.safeParse({ ...base, [campo]: "ftp://x.com/a" }).success).toBe(false);
    expect(versionSchema.safeParse({ ...base, [campo]: "cifraclub.com/x" }).success).toBe(false);

    expect(versionSchema.safeParse({ ...base, [campo]: "https://cifraclub.com/x" }).success).toBe(true);
    expect(versionSchema.safeParse({ ...base, [campo]: "http://cifraclub.com/x" }).success).toBe(true);
  });
});

describe("duracao", () => {
  it("duracao digitada vira segundos", () => {
    expect(parseDuration("3:45")).toBe(225);
    expect(parseDuration("45")).toBe(45);
    expect(parseDuration("")).toBeNull();
  });

  it("duracao invalida lanca INVALID_INPUT", () => {
    expect(() => parseDuration("3:75")).toThrow("INVALID_INPUT");
    expect(() => parseDuration("abc")).toThrow("INVALID_INPUT");
  });

  it("duracao em segundos vira m:ss", () => {
    expect(formatDuration(225)).toBe("3:45");
    expect(formatDuration(65)).toBe("1:05");
  });
});

describe("filterSongs", () => {
  const songs = [
    { title: "Céu Aberto", artist: "Banda A", category: "Louvor" },
    { title: "Santo", artist: "CÉU", category: "Ceia" },
    { title: "Bondade de Deus", artist: "Banda B", category: "Ceia" },
  ];

  it("filterSongs ignora acento e caixa e filtra por classificacao", () => {
    expect(filterSongs(songs, { q: "ceu" }).map((s) => s.title)).toEqual(["Céu Aberto", "Santo"]);
    expect(filterSongs(songs, { category: "Ceia" }).map((s) => s.title)).toEqual(["Santo", "Bondade de Deus"]);
    expect(filterSongs(songs, { q: "ceu", category: "Ceia" }).map((s) => s.title)).toEqual(["Santo"]);
  });
});

describe("repertoireEmptyMessage", () => {
  it("repertoireEmptyMessage cobre sem modulo, sem musicas e com musicas", () => {
    expect(repertoireEmptyMessage({ enabledMinistries: 0, songs: 0 })).toBe(
      "Repertório não está ativo nos seus ministérios",
    );
    expect(repertoireEmptyMessage({ enabledMinistries: 1, songs: 0 })).toBe("Nenhuma música cadastrada");
    expect(repertoireEmptyMessage({ enabledMinistries: 1, songs: 3 })).toBeNull();
  });
});
