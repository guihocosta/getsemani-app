"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { useConfirm } from "@/ui/ConfirmDialog";
import { MENSAGENS, type ActionCode } from "@/lib/actionError";
import { createAnnouncementAction, setAnnouncementPinnedAction, deleteAnnouncementAction } from "./actions";

type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  ministry: string;
  author: string;
  when: string;
  canManage: boolean;
};

export function AnnouncementBoard({
  announcements,
  manageable,
}: {
  announcements: Announcement[];
  manageable: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  function run(action: () => Promise<{ ok: true } | { ok: false; code: ActionCode; ref: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      const res = await action();
      if (!res.ok) {
        setError(`${MENSAGENS[res.code]} · cód. ${res.ref}`);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  function submit(formData: FormData) {
    run(
      () =>
        createAnnouncementAction({
          ministryId: String(formData.get("ministryId")),
          title: String(formData.get("title") ?? ""),
          body: String(formData.get("body") ?? ""),
          pinned: formData.get("pinned") === "on",
        }),
      () => setCreating(false),
    );
  }

  async function remove(a: Announcement) {
    const ok = await confirm({
      title: "Excluir aviso?",
      description: `"${a.title}" some para todo o ministério.`,
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (ok) run(() => deleteAnnouncementAction(a.id));
  }

  return (
    <div>
      {dialog}

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
                <input name="title" required maxLength={80} className="field w-full" />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Mensagem</label>
                <textarea name="body" required maxLength={1000} rows={4} className="field w-full" />
              </div>
              <label className="flex items-center gap-2 text-sm text-text min-h-11">
                <input name="pinned" type="checkbox" className="h-4 w-4" />
                Destacar na página inicial
              </label>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={pending} className="py-2 px-4 text-sm">
                  Publicar
                </Button>
                <button type="button" onClick={() => setCreating(false)} className="text-sm text-text-muted">
                  Cancelar
                </button>
              </div>
            </form>
          </Card>
        ) : (
          <Button onClick={() => setCreating(true)} className="w-full mb-6">
            Novo aviso
          </Button>
        ))}

      {error && <p className="text-xs text-danger mb-3">{error}</p>}

      <ul className="flex flex-col gap-3">
        {announcements.map((a) => (
          <li key={a.id}>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow text-primary">{a.ministry}</p>
                  <p className="text-lg text-text flex items-center gap-1.5 flex-wrap break-all">
                    {a.title}
                    {a.pinned && (
                      <Badge tone="info" className="text-[10px]">
                        destaque
                      </Badge>
                    )}
                  </p>
                </div>
                {a.canManage && (
                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      aria-label={a.pinned ? "Tirar destaque" : "Destacar"}
                      disabled={pending}
                      onClick={() => run(() => setAnnouncementPinnedAction(a.id, !a.pinned))}
                      className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-text disabled:opacity-40"
                    >
                      {a.pinned ? <PinOff size={16} strokeWidth={1.8} /> : <Pin size={16} strokeWidth={1.8} />}
                    </button>
                    <button
                      type="button"
                      aria-label="Excluir aviso"
                      disabled={pending}
                      onClick={() => remove(a)}
                      className="h-11 w-11 flex items-center justify-center text-danger disabled:opacity-40"
                    >
                      <Trash2 size={16} strokeWidth={1.8} />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-text mt-2 whitespace-pre-line break-words">{a.body}</p>
              <p className="text-xs text-text-muted mt-3">
                {a.author} · {a.when}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
