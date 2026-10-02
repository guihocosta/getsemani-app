import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSong } from "@/modules/repertoire/services/songs";
import { isRedirectError } from "@/lib/actionError";
import { SongDetail } from "./SongDetail";

export const dynamic = "force-dynamic";

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Sem acesso, modulo desligado ou id inexistente: mesma resposta, para nao
  // revelar que a musica existe.
  const song = await getSong(id).catch((e) => {
    if (isRedirectError(e)) throw e;
    return null;
  });
  if (!song) notFound();

  return (
    <div>
      <Link href="/repertorio" className="inline-flex items-center gap-1 text-sm text-text-muted mb-4">
        <ChevronLeft size={16} strokeWidth={1.8} />
        Repertório
      </Link>
      <SongDetail
        song={{
          id: song.id,
          title: song.title,
          artist: song.artist,
          category: song.category,
          notes: song.notes,
          ministry: song.ministry.name,
        }}
        versions={song.versions.map((v) => ({
          id: v.id,
          name: v.name,
          key: v.key,
          bpm: v.bpm,
          durationSec: v.durationSec,
          notes: v.notes,
          lyricsUrl: v.lyricsUrl,
          chordsUrl: v.chordsUrl,
          audioUrl: v.audioUrl,
          videoUrl: v.videoUrl,
        }))}
        canManage={song.canManage}
      />
    </div>
  );
}
