import { prisma } from "@/lib/prisma";
import { requireUser, requireLeaderOf, isLeaderOf } from "@/modules/identity/services/authz";
import { assertRepertoireEnabled } from "@/modules/ministries/services/modules";
import { visibleMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { getOccurrenceAccess } from "@/modules/scheduling/services/occurrenceAccess";
import { InvalidInput } from "@/modules/repertoire/domain/validation";

export class AlreadyInSetlist extends Error {
  constructor() {
    super("ALREADY_IN_SETLIST");
  }
}

// Lista de musicas de uma data, em ordem. Membro ativo do ministerio ve; data
// em rascunho so para quem gerencia (mesma regra do calendario).
export async function getSetlist(occurrenceId: string) {
  const user = await requireUser();
  const access = await getOccurrenceAccess(occurrenceId);

  const visible = await visibleMinistryIds(user.id, user.isAdmin);
  if (!visible.includes(access.ministryId)) throw new Error("FORBIDDEN");
  await assertRepertoireEnabled(access.ministryId);

  const canManage = await isLeaderOf(user.id, access.ministryId);
  if (!access.published && !canManage) throw new Error("FORBIDDEN");

  const entries = await prisma.occurrenceSong.findMany({
    where: { occurrenceId },
    include: { version: { include: { song: true } } },
    // id desempata posicoes iguais (duas adicoes simultaneas)
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });

  return {
    ...access,
    canManage,
    entries: entries.map((e) => ({
      entryId: e.id,
      songId: e.version.songId,
      title: e.version.song.title,
      artist: e.version.song.artist,
      versionName: e.version.name,
      key: e.version.key,
      bpm: e.version.bpm,
      durationSec: e.version.durationSec,
      lyricsUrl: e.version.lyricsUrl,
      chordsUrl: e.version.chordsUrl,
      audioUrl: e.version.audioUrl,
      videoUrl: e.version.videoUrl,
    })),
  };
}

// Lider adiciona uma versao ao fim da lista. O unique (occurrenceId,
// songVersionId) resolve a repeticao: P2002 vira AlreadyInSetlist.
export async function addToSetlist(params: { occurrenceId: string; versionId: string }) {
  const access = await getOccurrenceAccess(params.occurrenceId);
  await requireLeaderOf(access.ministryId);
  await assertRepertoireEnabled(access.ministryId);

  const version = await prisma.songVersion.findUniqueOrThrow({
    where: { id: params.versionId },
    include: { song: true },
  });
  if (version.song.ministryId !== access.ministryId) throw new InvalidInput();

  const last = await prisma.occurrenceSong.aggregate({
    where: { occurrenceId: params.occurrenceId },
    _max: { position: true },
  });

  try {
    return await prisma.occurrenceSong.create({
      data: {
        occurrenceId: params.occurrenceId,
        songVersionId: params.versionId,
        position: (last._max.position ?? 0) + 1,
      },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") throw new AlreadyInSetlist();
    throw e;
  }
}

async function ledEntry(entryId: string) {
  const entry = await prisma.occurrenceSong.findUniqueOrThrow({ where: { id: entryId } });
  const access = await getOccurrenceAccess(entry.occurrenceId);
  await requireLeaderOf(access.ministryId);
  await assertRepertoireEnabled(access.ministryId);
  return entry;
}

// Troca a posicao com a vizinha; na borda nao faz nada.
export async function moveInSetlist(params: { entryId: string; direction: "up" | "down" }) {
  const entry = await ledEntry(params.entryId);

  const entries = await prisma.occurrenceSong.findMany({
    where: { occurrenceId: entry.occurrenceId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  const index = entries.findIndex((e) => e.id === entry.id);
  const neighbourIndex = params.direction === "up" ? index - 1 : index + 1;
  const neighbour = entries[neighbourIndex];
  if (!neighbour) return { moved: false as const };

  // Grava o lugar na lista ordenada (indice + 1), nao a posicao da vizinha:
  // assim duas entradas com a mesma posicao (adicoes simultaneas) tambem trocam.
  await prisma.$transaction([
    prisma.occurrenceSong.update({ where: { id: entry.id }, data: { position: neighbourIndex + 1 } }),
    prisma.occurrenceSong.update({ where: { id: neighbour.id }, data: { position: index + 1 } }),
  ]);
  return { moved: true as const };
}

export async function removeFromSetlist(params: { entryId: string }) {
  await ledEntry(params.entryId);
  return prisma.occurrenceSong.delete({ where: { id: params.entryId } });
}
