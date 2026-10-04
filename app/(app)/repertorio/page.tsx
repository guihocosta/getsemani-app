import { requireUser } from "@/modules/identity/services/authz";
import { visibleMinistryIds, ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { listSongs } from "@/modules/repertoire/services/songs";
import { repertoireEmptyMessage } from "@/modules/repertoire/domain/validation";
import { EmptyState } from "@/ui/EmptyState";
import { SongList } from "./SongList";

export const dynamic = "force-dynamic";

export default async function RepertorioPage() {
  const user = await requireUser();
  const [memberIds, ledIds] = await Promise.all([
    visibleMinistryIds(user.id, user.isAdmin),
    ledMinistryIds(user.id, user.isAdmin),
  ]);
  const { ministries, songs } = await listSongs(memberIds);
  const manageable = ministries.filter((m) => ledIds.includes(m.id));
  const emptyMessage = repertoireEmptyMessage({ enabledMinistries: ministries.length, songs: songs.length });

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Repertório</h1>
      <SongList songs={songs} ministries={ministries} manageable={manageable} />
      {emptyMessage && (
        <EmptyState
          title={emptyMessage}
          subtitle={
            ministries.length === 0
              ? "Peça a um admin para ativar o repertório no ministério."
              : manageable.length > 0
                ? "Cadastre a primeira música acima."
                : undefined
          }
        />
      )}
    </div>
  );
}
