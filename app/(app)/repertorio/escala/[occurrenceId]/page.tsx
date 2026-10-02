import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSetlist } from "@/modules/repertoire/services/setlist";
import { listVersionsForMinistry } from "@/modules/repertoire/services/songs";
import { isRedirectError } from "@/lib/actionError";
import { fmtDateTime } from "@/lib/time";
import { SetlistEditor } from "./SetlistEditor";

export const dynamic = "force-dynamic";

export default async function SetlistPage({ params }: { params: Promise<{ occurrenceId: string }> }) {
  const { occurrenceId } = await params;

  // Sem acesso, rascunho para quem nao gerencia, modulo desligado ou id
  // inexistente: mesma resposta, para nao revelar que a data existe.
  const setlist = await getSetlist(occurrenceId).catch((e) => {
    if (isRedirectError(e)) throw e;
    return null;
  });
  if (!setlist) notFound();

  const options = setlist.canManage ? await listVersionsForMinistry(setlist.ministryId) : [];

  return (
    <div>
      <Link href="/escalas" className="inline-flex items-center gap-1 text-sm text-text-muted mb-4">
        <ChevronLeft size={16} strokeWidth={1.8} />
        Escalas
      </Link>
      <header className="mb-6">
        <p className="eyebrow text-primary">{setlist.title}</p>
        <h1 className="text-3xl text-text">Músicas</h1>
        <p className="text-sm text-text-muted">{fmtDateTime(setlist.date)}</p>
      </header>
      <SetlistEditor
        occurrenceId={occurrenceId}
        entries={setlist.entries}
        options={options}
        canManage={setlist.canManage}
      />
    </div>
  );
}
