"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Card } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { MENSAGENS, type ActionCode } from "@/lib/actionError";
import { VersionMeta, type VersionData } from "../../VersionMeta";
import { addToSetlistAction, moveInSetlistAction, removeFromSetlistAction } from "../../actions";

type Entry = VersionData & {
  entryId: string;
  songId: string;
  title: string;
  artist: string | null;
  versionName: string;
};

type Option = { versionId: string; title: string; versionName: string; key: string | null };

export function SetlistEditor({
  occurrenceId,
  entries,
  options,
  canManage,
}: {
  occurrenceId: string;
  entries: Entry[];
  options: Option[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState("");

  function run(action: () => Promise<{ ok: true } | { ok: false; code: ActionCode; ref: string }>) {
    setError(null);
    start(async () => {
      const res = await action();
      if (!res.ok) {
        setError(`${MENSAGENS[res.code]} · cód. ${res.ref}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      {canManage &&
        (options.length === 0 ? (
          <p className="text-sm text-text-muted mb-6">
            O repertório deste ministério está vazio.{" "}
            <Link href="/repertorio" className="text-primary underline underline-offset-2">
              Cadastrar músicas
            </Link>
          </p>
        ) : (
          <div data-no-swipe className="flex gap-2 mb-6">
            <select
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              className="field flex-1 min-w-0"
              aria-label="Música para adicionar"
            >
              <option value="">Escolha uma música</option>
              {options.map((o) => (
                <option key={o.versionId} value={o.versionId}>
                  {o.title} — {o.versionName}
                  {o.key ? ` (${o.key})` : ""}
                </option>
              ))}
            </select>
            <Button
              disabled={pending || picked === ""}
              onClick={() =>
                run(async () => {
                  const res = await addToSetlistAction(occurrenceId, picked);
                  if (res.ok) setPicked("");
                  return res;
                })
              }
              className="py-2 px-4 text-sm shrink-0"
            >
              Adicionar
            </Button>
          </div>
        ))}

      {error && <p className="text-xs text-danger mb-3">{error}</p>}

      {entries.length === 0 ? (
        <EmptyState title="Nenhuma música nesta escala" />
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((e, i) => (
            <li key={e.entryId}>
              <Card className="flex items-start gap-3">
                <span className="font-title text-xl text-primary w-6 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <Link href={`/repertorio/${e.songId}`} className="text-text">
                    {e.title}
                  </Link>
                  <p className="text-xs text-text-muted">
                    {[e.artist, e.versionName].filter(Boolean).join(" · ")}
                  </p>
                  <VersionMeta version={e} />
                </div>
                {canManage && (
                  <div className="flex flex-col shrink-0 -my-1">
                    <button
                      type="button"
                      aria-label="Mover para cima"
                      disabled={pending || i === 0}
                      onClick={() => run(() => moveInSetlistAction(occurrenceId, e.entryId, "up"))}
                      className="h-9 w-9 flex items-center justify-center text-text-muted disabled:opacity-30"
                    >
                      <ArrowUp size={16} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      aria-label="Mover para baixo"
                      disabled={pending || i === entries.length - 1}
                      onClick={() => run(() => moveInSetlistAction(occurrenceId, e.entryId, "down"))}
                      className="h-9 w-9 flex items-center justify-center text-text-muted disabled:opacity-30"
                    >
                      <ArrowDown size={16} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      aria-label="Remover da escala"
                      disabled={pending}
                      onClick={() => run(() => removeFromSetlistAction(occurrenceId, e.entryId))}
                      className="h-9 w-9 flex items-center justify-center text-danger disabled:opacity-30"
                    >
                      <X size={16} strokeWidth={1.8} />
                    </button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
