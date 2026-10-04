import { formatDuration } from "@/modules/repertoire/domain/validation";

export type VersionData = {
  key: string | null;
  bpm: number | null;
  durationSec: number | null;
  lyricsUrl: string | null;
  chordsUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
};

const LINKS = [
  ["lyricsUrl", "Letra"],
  ["chordsUrl", "Cifra"],
  ["audioUrl", "Áudio"],
  ["videoUrl", "Vídeo"],
] as const;

// Tom, BPM, duracao e links de uma versao: igual na pagina da musica e na
// lista de musicas da escala.
export function VersionMeta({ version }: { version: VersionData }) {
  const facts = [
    version.key ? `Tom ${version.key}` : null,
    version.bpm ? `${version.bpm} BPM` : null,
    version.durationSec ? formatDuration(version.durationSec) : null,
  ].filter(Boolean);
  const links = LINKS.filter(([field]) => version[field]);

  if (facts.length === 0 && links.length === 0) return null;

  return (
    <div className="mt-1">
      {facts.length > 0 && <p className="text-xs text-text-muted">{facts.join(" · ")}</p>}
      {links.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-1.5">
          {links.map(([field, label]) => (
            <a
              key={field}
              href={version[field]!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary underline underline-offset-2"
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
