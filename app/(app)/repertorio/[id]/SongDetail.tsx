"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { useConfirm } from "@/ui/ConfirmDialog";
import { MENSAGENS, type ActionCode } from "@/lib/actionError";
import { formatDuration } from "@/modules/repertoire/domain/validation";
import { VersionMeta } from "../VersionMeta";
import {
  updateSongAction,
  deleteSongAction,
  saveVersionAction,
  deleteVersionAction,
  type VersionFormInput,
} from "../actions";

type Song = {
  id: string;
  title: string;
  artist: string | null;
  category: string | null;
  notes: string | null;
};

type Version = {
  id: string;
  name: string;
  key: string | null;
  bpm: number | null;
  durationSec: number | null;
  notes: string | null;
  lyricsUrl: string | null;
  chordsUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
};

type Failure = { ok: false; code: ActionCode; ref: string };

const VERSION_FIELDS: { name: keyof VersionFormInput; label: string; placeholder?: string; type?: string }[] = [
  { name: "key", label: "Tom", placeholder: "Ex.: A, Bb, F#m" },
  { name: "bpm", label: "BPM", type: "number" },
  { name: "duration", label: "Duração", placeholder: "m:ss" },
  { name: "lyricsUrl", label: "Link da letra", type: "url", placeholder: "https://" },
  { name: "chordsUrl", label: "Link da cifra", type: "url", placeholder: "https://" },
  { name: "audioUrl", label: "Link do áudio", type: "url", placeholder: "https://" },
  { name: "videoUrl", label: "Link do vídeo", type: "url", placeholder: "https://" },
];

function versionDefaults(v: Version | null): VersionFormInput {
  return {
    name: v?.name ?? "",
    key: v?.key ?? "",
    bpm: v?.bpm != null ? String(v.bpm) : "",
    duration: v?.durationSec != null ? formatDuration(v.durationSec) : "",
    notes: v?.notes ?? "",
    lyricsUrl: v?.lyricsUrl ?? "",
    chordsUrl: v?.chordsUrl ?? "",
    audioUrl: v?.audioUrl ?? "",
    videoUrl: v?.videoUrl ?? "",
  };
}

export function SongDetail({ song, versions, canManage }: { song: Song; versions: Version[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editingSong, setEditingSong] = useState(false);
  // id da versao em edicao, "new" para nova, null para nenhuma
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  function fail(res: Failure) {
    setError(`${MENSAGENS[res.code]} · cód. ${res.ref}`);
  }

  function submitSong(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await updateSongAction(song.id, {
        title: String(formData.get("title") ?? ""),
        artist: String(formData.get("artist") ?? ""),
        category: String(formData.get("category") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      });
      if (!res.ok) return fail(res);
      setEditingSong(false);
      router.refresh();
    });
  }

  async function removeSong() {
    const ok = await confirm({
      title: "Excluir música?",
      description: `"${song.title}" sai do repertório com todas as versões e das escalas em que está.`,
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    setError(null);
    start(async () => {
      const res = await deleteSongAction(song.id);
      if (!res.ok) return fail(res);
      router.push("/repertorio");
    });
  }

  function submitVersion(versionId: string | null, formData: FormData) {
    setError(null);
    const input = Object.fromEntries(
      (["name", "notes", ...VERSION_FIELDS.map((f) => f.name)] as const).map((k) => [k, String(formData.get(k) ?? "")]),
    ) as VersionFormInput;
    start(async () => {
      const res = await saveVersionAction(song.id, versionId, input);
      if (!res.ok) return fail(res);
      setEditingVersion(null);
      router.refresh();
    });
  }

  async function removeVersion(v: Version) {
    const ok = await confirm({
      title: "Excluir versão?",
      description: `"${v.name}" sai da música e das escalas em que está.`,
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    setError(null);
    start(async () => {
      const res = await deleteVersionAction(song.id, v.id);
      if (!res.ok) return fail(res);
      router.refresh();
    });
  }

  function versionForm(v: Version | null) {
    const d = versionDefaults(v);
    return (
      <form data-no-swipe action={(fd) => submitVersion(v?.id ?? null, fd)} className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-text-muted block mb-1">Nome da versão</label>
          <input
            name="name"
            required
            maxLength={40}
            defaultValue={d.name}
            className="field w-full"
            placeholder="Ex.: Acústica, Ao vivo"
          />
        </div>
        {VERSION_FIELDS.map((f) => (
          <div key={f.name}>
            <label className="text-xs text-text-muted block mb-1">{f.label}</label>
            <input
              name={f.name}
              type={f.type ?? "text"}
              defaultValue={d[f.name]}
              placeholder={f.placeholder ?? "Opcional"}
              className="field w-full"
              {...(f.name === "bpm" ? { min: 20, max: 400, step: 1 } : {})}
            />
          </div>
        ))}
        <div>
          <label className="text-xs text-text-muted block mb-1">Observações</label>
          <textarea name="notes" maxLength={500} defaultValue={d.notes} rows={2} className="field w-full" />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending} className="py-2 px-4 text-sm">
            Salvar
          </Button>
          <button type="button" onClick={() => setEditingVersion(null)} className="text-sm text-text-muted">
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      {dialog}

      {editingSong ? (
        <Card className="mb-6">
          <form data-no-swipe action={submitSong} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">Título</label>
              <input name="title" required maxLength={120} defaultValue={song.title} className="field w-full" />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Artista</label>
              <input name="artist" maxLength={120} defaultValue={song.artist ?? ""} className="field w-full" />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Classificação</label>
              <input name="category" maxLength={40} defaultValue={song.category ?? ""} className="field w-full" />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Observações</label>
              <textarea
                name="notes"
                maxLength={500}
                defaultValue={song.notes ?? ""}
                rows={3}
                className="field w-full"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={pending} className="py-2 px-4 text-sm">
                Salvar
              </Button>
              <button type="button" onClick={() => setEditingSong(false)} className="text-sm text-text-muted">
                Cancelar
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <header className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-3xl text-text">{song.title}</h1>
              {song.artist && <p className="text-sm text-text-muted">{song.artist}</p>}
            </div>
            {canManage && (
              <div className="flex items-center shrink-0">
                <button
                  type="button"
                  aria-label="Editar música"
                  onClick={() => setEditingSong(true)}
                  className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-text"
                >
                  <Pencil size={16} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  aria-label="Excluir música"
                  disabled={pending}
                  onClick={removeSong}
                  className="h-11 w-11 flex items-center justify-center text-danger disabled:opacity-40"
                >
                  <Trash2 size={16} strokeWidth={1.8} />
                </button>
              </div>
            )}
          </div>
          {song.category && (
            <Badge tone="muted" className="mt-2 text-[10px]">
              {song.category}
            </Badge>
          )}
          {song.notes && <p className="text-sm text-text-muted mt-3 whitespace-pre-line">{song.notes}</p>}
        </header>
      )}

      {error && <p className="text-xs text-danger mb-3">{error}</p>}

      <h2 className="eyebrow mb-3">Versões</h2>
      {versions.length === 0 && editingVersion !== "new" && (
        <p className="text-sm text-text-muted mb-3">Nenhuma versão cadastrada.</p>
      )}
      <ul className="flex flex-col gap-2 mb-4">
        {versions.map((v) => (
          <li key={v.id}>
            <Card>
              {editingVersion === v.id ? (
                versionForm(v)
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-text">{v.name}</p>
                    <VersionMeta version={v} />
                    {v.notes && <p className="text-xs text-text-muted mt-1.5 whitespace-pre-line">{v.notes}</p>}
                  </div>
                  {canManage && (
                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        aria-label="Editar versão"
                        onClick={() => setEditingVersion(v.id)}
                        className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-text"
                      >
                        <Pencil size={16} strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        aria-label="Excluir versão"
                        disabled={pending}
                        onClick={() => removeVersion(v)}
                        className="h-11 w-11 flex items-center justify-center text-danger disabled:opacity-40"
                      >
                        <Trash2 size={16} strokeWidth={1.8} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {canManage &&
        (editingVersion === "new" ? (
          <Card>{versionForm(null)}</Card>
        ) : (
          <Button variant="secondary" onClick={() => setEditingVersion("new")} className="w-full">
            Nova versão
          </Button>
        ))}
    </div>
  );
}
