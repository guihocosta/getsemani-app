"use server";

import { revalidatePath } from "next/cache";
import { createSong, updateSong, deleteSong, saveVersion, deleteVersion } from "@/modules/repertoire/services/songs";
import { addToSetlist, moveInSetlist, removeFromSetlist } from "@/modules/repertoire/services/setlist";
import { parseDuration } from "@/modules/repertoire/domain/validation";
import { handleActionError, type ActionCode } from "@/lib/actionError";

type Result<T = object> = ({ ok: true } & T) | { ok: false; code: ActionCode; ref: string };

export type SongFormInput = { title: string; artist: string; category: string; notes: string };

export type VersionFormInput = {
  name: string;
  key: string;
  bpm: string;
  duration: string; // "m:ss" ou segundos
  notes: string;
  lyricsUrl: string;
  chordsUrl: string;
  audioUrl: string;
  videoUrl: string;
};

export async function createSongAction(ministryId: string, input: SongFormInput): Promise<Result<{ songId: string }>> {
  try {
    const song = await createSong({ ministryId, ...input });
    revalidatePath("/repertorio");
    return { ok: true, songId: song.id };
  } catch (e) {
    return handleActionError("repertorio.createSong", e, { ministryId });
  }
}

export async function updateSongAction(songId: string, input: SongFormInput): Promise<Result> {
  try {
    await updateSong({ songId, ...input });
    revalidatePath("/repertorio");
    revalidatePath(`/repertorio/${songId}`);
    return { ok: true };
  } catch (e) {
    return handleActionError("repertorio.updateSong", e, { songId });
  }
}

export async function deleteSongAction(songId: string): Promise<Result> {
  try {
    await deleteSong({ songId });
    revalidatePath("/repertorio");
    return { ok: true };
  } catch (e) {
    return handleActionError("repertorio.deleteSong", e, { songId });
  }
}

export async function saveVersionAction(
  songId: string,
  versionId: string | null,
  input: VersionFormInput,
): Promise<Result> {
  try {
    const { bpm, duration, ...rest } = input;
    await saveVersion({
      songId,
      versionId: versionId ?? undefined,
      ...rest,
      bpm: bpm.trim() === "" ? null : Number(bpm),
      durationSec: parseDuration(duration),
    });
    revalidatePath(`/repertorio/${songId}`);
    revalidatePath("/repertorio");
    return { ok: true };
  } catch (e) {
    return handleActionError("repertorio.saveVersion", e, { songId, versionId });
  }
}

export async function deleteVersionAction(songId: string, versionId: string): Promise<Result> {
  try {
    await deleteVersion({ versionId });
    revalidatePath(`/repertorio/${songId}`);
    revalidatePath("/repertorio");
    return { ok: true };
  } catch (e) {
    return handleActionError("repertorio.deleteVersion", e, { versionId });
  }
}

export async function addToSetlistAction(occurrenceId: string, versionId: string): Promise<Result> {
  try {
    await addToSetlist({ occurrenceId, versionId });
    revalidatePath(`/repertorio/escala/${occurrenceId}`);
    return { ok: true };
  } catch (e) {
    return handleActionError("repertorio.addToSetlist", e, { occurrenceId, versionId });
  }
}

export async function moveInSetlistAction(
  occurrenceId: string,
  entryId: string,
  direction: "up" | "down",
): Promise<Result> {
  try {
    await moveInSetlist({ entryId, direction });
    revalidatePath(`/repertorio/escala/${occurrenceId}`);
    return { ok: true };
  } catch (e) {
    return handleActionError("repertorio.moveInSetlist", e, { entryId, direction });
  }
}

export async function removeFromSetlistAction(occurrenceId: string, entryId: string): Promise<Result> {
  try {
    await removeFromSetlist({ entryId });
    revalidatePath(`/repertorio/escala/${occurrenceId}`);
    return { ok: true };
  } catch (e) {
    return handleActionError("repertorio.removeFromSetlist", e, { entryId });
  }
}
