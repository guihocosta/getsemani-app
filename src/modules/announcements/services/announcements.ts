import { prisma } from "@/lib/prisma";
import { requireLeaderOf } from "@/modules/identity/services/authz";
import { activeMemberIds } from "@/modules/identity/services/memberships";
import { notifyUser } from "@/modules/notifications/services/notify";
import { announcementSchema, type AnnouncementInput } from "@/modules/announcements/domain/validation";

// Lider publica um aviso para o ministerio e avisa por push os membros ativos
// (menos ele mesmo). notifyUser nunca lanca: falha de push nao desfaz o aviso.
export async function createAnnouncement(params: { ministryId: string } & AnnouncementInput) {
  const author = await requireLeaderOf(params.ministryId);
  const parsed = announcementSchema.safeParse(params);
  if (!parsed.success) throw new Error("INVALID_INPUT");

  const announcement = await prisma.announcement.create({
    data: { ...parsed.data, ministryId: params.ministryId, authorId: author.id },
  });

  const recipients = (await activeMemberIds(params.ministryId)).filter((id) => id !== author.id);
  await Promise.all(
    recipients.map((userId) =>
      notifyUser({
        userId,
        type: "ANNOUNCEMENT",
        dedupeKey: `announcement:${announcement.id}:${userId}`,
        title: announcement.title,
        body: announcement.body.slice(0, 120),
        url: "/avisos",
      }),
    ),
  );

  return announcement;
}

async function ledAnnouncement(announcementId: string) {
  const announcement = await prisma.announcement.findUniqueOrThrow({ where: { id: announcementId } });
  await requireLeaderOf(announcement.ministryId);
  return announcement;
}

export async function setAnnouncementPinned(params: { announcementId: string; pinned: boolean }) {
  await ledAnnouncement(params.announcementId);
  return prisma.announcement.update({
    where: { id: params.announcementId },
    data: { pinned: params.pinned },
  });
}

export async function deleteAnnouncement(params: { announcementId: string }) {
  await ledAnnouncement(params.announcementId);
  return prisma.announcement.delete({ where: { id: params.announcementId } });
}

type Row = {
  id: string;
  ministryId: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
  ministry: { name: string };
  author: { name: string };
};

function toItem(a: Row) {
  return {
    id: a.id,
    ministryId: a.ministryId,
    title: a.title,
    body: a.body,
    pinned: a.pinned,
    createdAt: a.createdAt,
    ministry: a.ministry.name,
    author: a.author.name,
  };
}

const withNames = { ministry: { select: { name: true } }, author: { select: { name: true } } };

// Avisos dos ministerios informados: destaque primeiro, depois os mais novos.
// Sem checagem de permissao: o chamador passa os ministerios de que o usuario e membro.
export async function listAnnouncements(ministryIds: string[]) {
  if (ministryIds.length === 0) return [];
  const rows = await prisma.announcement.findMany({
    where: { ministryId: { in: ministryIds } },
    include: withNames,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
  return rows.map(toItem);
}

// Destaques para a pagina inicial.
export async function listPinnedAnnouncements(ministryIds: string[]) {
  if (ministryIds.length === 0) return [];
  const rows = await prisma.announcement.findMany({
    where: { ministryId: { in: ministryIds }, pinned: true },
    include: withNames,
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  return rows.map(toItem);
}
