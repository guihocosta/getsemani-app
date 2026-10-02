import { prisma } from "@/lib/prisma";
import { requireUser, requireLeaderOf, isLeaderOf } from "@/modules/identity/services/authz";
import { assertRepertoireEnabled, repertoireMinistries } from "@/modules/ministries/services/modules";
import { visibleMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import {
  parseOrInvalid,
  songSchema,
  versionSchema,
  type SongInput,
  type VersionInput,
} from "@/modules/repertoire/domain/validation";

// Musicas dos ministerios informados que tem o repertorio ligado. Sem checagem
// de permissao: o chamador passa os ministerios de que o usuario e membro.
export async function listSongs(ministryIds: string[]) {
  const ministries = await repertoireMinistries(ministryIds);
  if (ministries.length === 0) return { ministries, songs: [] };

  const songs = await prisma.song.findMany({
    where: { ministryId: { in: ministries.map((m) => m.id) } },
    include: { _count: { select: { versions: true } } },
    orderBy: { title: "asc" },
  });
  return {
    ministries,
    songs: songs.map((s) => ({
      id: s.id,
      ministryId: s.ministryId,
      title: s.title,
      artist: s.artist,
      category: s.category,
      versionCount: s._count.versions,
    })),
  };
}

// Musica com versoes, para membro ativo do ministerio dela (ou admin).
export async function getSong(songId: string) {
  const user = await requireUser();
  const song = await prisma.song.findUniqueOrThrow({
    where: { id: songId },
    include: { versions: { orderBy: { createdAt: "asc" } } },
  });
  const visible = await visibleMinistryIds(user.id, user.isAdmin);
  if (!visible.includes(song.ministryId)) throw new Error("FORBIDDEN");
  await assertRepertoireEnabled(song.ministryId);

  return { ...song, canManage: await isLeaderOf(user.id, song.ministryId) };
}

// Todas as versoes do repertorio de um ministerio, para o lider montar a escala.
export async function listVersionsForMinistry(ministryId: string) {
  await requireLeaderOf(ministryId);
  await assertRepertoireEnabled(ministryId);

  const songs = await prisma.song.findMany({
    where: { ministryId },
    include: { versions: { orderBy: { createdAt: "asc" } } },
    orderBy: { title: "asc" },
  });
  return songs.flatMap((s) =>
    s.versions.map((v) => ({ versionId: v.id, title: s.title, versionName: v.name, key: v.key })),
  );
}

// Toda musica nasce com a versao "Original": e a versao que entra na escala.
export async function createSong(params: { ministryId: string } & SongInput) {
  await requireLeaderOf(params.ministryId);
  await assertRepertoireEnabled(params.ministryId);
  const data = parseOrInvalid(songSchema, params);

  return prisma.song.create({
    data: { ...data, ministryId: params.ministryId, versions: { create: { name: "Original" } } },
  });
}

async function ledSong(songId: string) {
  const song = await prisma.song.findUniqueOrThrow({ where: { id: songId } });
  await requireLeaderOf(song.ministryId);
  await assertRepertoireEnabled(song.ministryId);
  return song;
}

export async function updateSong(params: { songId: string } & SongInput) {
  await ledSong(params.songId);
  const data = parseOrInvalid(songSchema, params);
  return prisma.song.update({ where: { id: params.songId }, data });
}

// Versoes e entradas de escala saem em cascata (schema).
export async function deleteSong(params: { songId: string }) {
  await ledSong(params.songId);
  return prisma.song.delete({ where: { id: params.songId } });
}

export async function saveVersion(params: { songId: string; versionId?: string } & VersionInput) {
  await ledSong(params.songId);
  const data = parseOrInvalid(versionSchema, params);

  if (params.versionId) {
    // where com songId: impede editar versao de outra musica passando um id alheio.
    return prisma.songVersion.update({ where: { id: params.versionId, songId: params.songId }, data });
  }
  return prisma.songVersion.create({ data: { ...data, songId: params.songId } });
}

export async function deleteVersion(params: { versionId: string }) {
  const version = await prisma.songVersion.findUniqueOrThrow({ where: { id: params.versionId } });
  await ledSong(version.songId);
  return prisma.songVersion.delete({ where: { id: params.versionId } });
}
