import { requireUser } from "@/modules/identity/services/authz";
import { listMinistries } from "@/modules/ministries/services/listMinistries";
import { visibleMinistryIds, ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { listAnnouncements } from "@/modules/announcements/services/announcements";
import { EmptyState } from "@/ui/EmptyState";
import { fmtDate } from "@/lib/time";
import { AnnouncementBoard } from "./AnnouncementBoard";

export const dynamic = "force-dynamic";

export default async function AvisosPage() {
  const user = await requireUser();
  const [memberIds, ledIds] = await Promise.all([
    visibleMinistryIds(user.id, user.isAdmin),
    ledMinistryIds(user.id, user.isAdmin),
  ]);
  const [announcements, ministries] = await Promise.all([
    listAnnouncements(memberIds),
    ledIds.length > 0 ? listMinistries() : Promise.resolve([]),
  ]);
  const manageable = ministries.filter((m) => ledIds.includes(m.id)).map((m) => ({ id: m.id, name: m.name }));

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Avisos</h1>
      <AnnouncementBoard
        announcements={announcements.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          pinned: a.pinned,
          ministry: a.ministry,
          author: a.author,
          when: fmtDate(a.createdAt),
          canManage: ledIds.includes(a.ministryId),
        }))}
        manageable={manageable}
      />
      {announcements.length === 0 && (
        <EmptyState
          title="Nenhum aviso por aqui"
          subtitle={manageable.length > 0 ? "Publique o primeiro aviso acima." : undefined}
        />
      )}
    </div>
  );
}
