"use server";

import { revalidatePath } from "next/cache";
import { createSchedule } from "@/modules/scheduling/services/createSchedule";
import { allocateVolunteer } from "@/modules/scheduling/services/allocateVolunteer";
import { deleteScheduleOccurrence } from "@/modules/scheduling/services/deleteSchedule";
import { materializeOccurrences } from "@/modules/scheduling/services/materializeOccurrences";

export async function createScheduleAction(formData: FormData) {
  await createSchedule({
    ministryId: String(formData.get("ministryId")),
    title: String(formData.get("title")),
    recurrenceRule: String(formData.get("recurrenceRule")),
    startDate: String(formData.get("startDate")),
    startTime: String(formData.get("startTime")),
    roleIds: formData.getAll("roleIds").map(String),
  });
  await materializeOccurrences();
  revalidatePath("/escalas");
}

export async function allocateAction(slotId: string, userId: string, override = false) {
  try {
    await allocateVolunteer({ slotId, userId, override });
    revalidatePath("/escalas");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function deleteOccurrenceAction(occurrenceId: string, scope: "SINGLE" | "FROM_HERE") {
  await deleteScheduleOccurrence({ occurrenceId, scope });
  revalidatePath("/escalas");
}
