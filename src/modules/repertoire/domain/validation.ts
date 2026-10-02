import { z } from "zod";

export class InvalidInput extends Error {
  constructor() {
    super("INVALID_INPUT");
  }
}

// Texto opcional: aparado; vazio vira null.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

// Link opcional: so http(s). Barra javascript:, ftp: e texto sem esquema, porque
// o valor vira href na tela.
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\/\S+$/i.test(v));

export const songSchema = z.object({
  title: z.string().trim().min(1).max(120),
  artist: optionalText(120),
  category: optionalText(40),
  notes: optionalText(500),
});

export const versionSchema = z.object({
  name: z.string().trim().min(1).max(40),
  key: optionalText(10),
  bpm: z.number().int().min(20).max(400).nullish().transform((v) => v ?? null),
  durationSec: z.number().int().min(1).max(7200).nullish().transform((v) => v ?? null),
  notes: optionalText(500),
  lyricsUrl: optionalUrl,
  chordsUrl: optionalUrl,
  audioUrl: optionalUrl,
  videoUrl: optionalUrl,
});

export type SongInput = z.input<typeof songSchema>;
export type VersionInput = z.input<typeof versionSchema>;

// Falha de validacao vira o codigo de dominio que a action traduz.
export function parseOrInvalid<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const res = schema.safeParse(input);
  if (!res.success) throw new InvalidInput();
  return res.data;
}

// Duracao digitada: "m:ss" ou so segundos. Vazio = sem duracao.
export function parseDuration(raw: string): number | null {
  const text = raw.trim();
  if (text === "") return null;
  const match = text.match(/^(?:(\d{1,3}):)?(\d{1,4})$/);
  if (!match) throw new InvalidInput();
  const minutes = match[1] === undefined ? 0 : Number(match[1]);
  const seconds = Number(match[2]);
  if (match[1] !== undefined && seconds >= 60) throw new InvalidInput();
  return minutes * 60 + seconds;
}

export function formatDuration(totalSec: number): string {
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Busca por titulo ou artista (sem acento, sem caixa) e classificacao exata.
export function filterSongs<T extends { title: string; artist: string | null; category: string | null }>(
  songs: T[],
  filter: { q?: string; category?: string | null },
): T[] {
  const q = normalize(filter.q?.trim() ?? "");
  return songs.filter((s) => {
    if (filter.category && s.category !== filter.category) return false;
    if (!q) return true;
    return normalize(s.title).includes(q) || normalize(s.artist ?? "").includes(q);
  });
}

export function repertoireEmptyMessage(params: { enabledMinistries: number; songs: number }): string | null {
  if (params.enabledMinistries === 0) return "Repertório não está ativo nos seus ministérios";
  if (params.songs === 0) return "Nenhuma música cadastrada";
  return null;
}
