"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { MENSAGENS } from "@/lib/actionError";
import { filterSongs } from "@/modules/repertoire/domain/validation";
import { createSongAction } from "./actions";

type Song = {
  id: string;
  ministryId: string;
  title: string;
  artist: string | null;
  category: string | null;
  versionCount: number;
};
type Ministry = { id: string; name: string };

export function SongList({
  songs,
  ministries,
  manageable,
}: {
  songs: Song[];
  ministries: Ministry[];
  manageable: Ministry[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const categories = [...new Set(songs.map((s) => s.category).filter((c): c is string => !!c))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const visible = filterSongs(songs, { q, category });
  const ministryName = new Map(ministries.map((m) => [m.id, m.name]));

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await createSongAction(String(formData.get("ministryId")), {
        title: String(formData.get("title") ?? ""),
        artist: String(formData.get("artist") ?? ""),
        category: String(formData.get("category") ?? ""),
        notes: "",
      });
      if (!res.ok) {
        setError(`${MENSAGENS[res.code]} · cód. ${res.ref}`);
        return;
      }
      setCreating(false);
      router.push(`/repertorio/${res.songId}`);
    });
  }

  return (
    <div>
      {manageable.length > 0 &&
        (creating ? (
          <Card className="mb-6">
            <form data-no-swipe action={submit} className="flex flex-col gap-3">
              {manageable.length > 1 ? (
                <div>
                  <label className="text-xs text-text-muted block mb-1">Ministério</label>
                  <select name="ministryId" className="field w-full">
                    {manageable.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input type="hidden" name="ministryId" value={manageable[0].id} />
              )}
              <div>
                <label className="text-xs text-text-muted block mb-1">Título</label>
                <input name="title" required maxLength={120} className="field w-full" />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Artista</label>
                <input name="artist" maxLength={120} className="field w-full" placeholder="Opcional" />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Classificação</label>
                <input
                  name="category"
                  maxLength={40}
                  list="classificacoes"
                  className="field w-full"
                  placeholder="Ex.: Louvor, Adoração, Ceia"
                />
                <datalist id="classificacoes">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={pending} className="py-2 px-4 text-sm">
                  Salvar
                </Button>
                <button type="button" onClick={() => setCreating(false)} className="text-sm text-text-muted">
                  Cancelar
                </button>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
            </form>
          </Card>
        ) : (
          <Button onClick={() => setCreating(true)} className="w-full mb-6">
            Nova música
          </Button>
        ))}

      {songs.length > 0 && (
        <>
          <input
            data-no-swipe
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título ou artista"
            className="field w-full mb-3"
          />
          {categories.length > 0 && (
            <div data-no-swipe className="flex gap-2 overflow-x-auto pb-1 mb-4">
              {[null, ...categories].map((c) => (
                <button
                  key={c ?? "todas"}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                    category === c
                      ? "bg-primary/10 text-primary ring-primary/30"
                      : "bg-surface-2 text-text-muted ring-border"
                  }`}
                >
                  {c ?? "Todas"}
                </button>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">Nenhuma música encontrada.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visible.map((s) => (
                <li key={s.id}>
                  <Link href={`/repertorio/${s.id}`}>
                    <Card className="flex items-center gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-text truncate">{s.title}</p>
                        <p className="text-xs text-text-muted truncate">
                          {[
                            s.artist,
                            ministries.length > 1 ? ministryName.get(s.ministryId) : null,
                            `${s.versionCount} ${s.versionCount === 1 ? "versão" : "versões"}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {s.category && (
                        <Badge tone="muted" className="text-[10px]">
                          {s.category}
                        </Badge>
                      )}
                      <ChevronRight size={18} className="text-text-muted shrink-0" strokeWidth={1.8} />
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
