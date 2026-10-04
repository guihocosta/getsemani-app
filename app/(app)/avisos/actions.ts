"use server";

import { revalidatePath } from "next/cache";
import {
  createAnnouncement,
  setAnnouncementPinned,
  deleteAnnouncement,
} from "@/modules/announcements/services/announcements";
import { handleActionError, type ActionCode } from "@/lib/actionError";

type Result = { ok: true } | { ok: false; code: ActionCode; ref: string };

function revalidate() {
  revalidatePath("/avisos");
  revalidatePath("/");
}

export async function createAnnouncementAction(params: {
  ministryId: string;
  title: string;
  body: string;
  pinned: boolean;
}): Promise<Result> {
  try {
    await createAnnouncement(params);
    revalidate();
    return { ok: true };
  } catch (e) {
    return handleActionError("avisos.create", e, { ministryId: params.ministryId });
  }
}

export async function setAnnouncementPinnedAction(announcementId: string, pinned: boolean): Promise<Result> {
  try {
    await setAnnouncementPinned({ announcementId, pinned });
    revalidate();
    return { ok: true };
  } catch (e) {
    return handleActionError("avisos.setPinned", e, { announcementId, pinned });
  }
}

export async function deleteAnnouncementAction(announcementId: string): Promise<Result> {
  try {
    await deleteAnnouncement({ announcementId });
    revalidate();
    return { ok: true };
  } catch (e) {
    return handleActionError("avisos.delete", e, { announcementId });
  }
}
