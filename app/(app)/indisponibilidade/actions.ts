"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/identity/services/authz";
import { addUnavailability, removeUnavailability } from "@/modules/availability/services/unavailability";

export async function addUnavailabilityAction(formData: FormData) {
  const user = await requireUser();
  const startDate = String(formData.get("startDate"));
  const endDateRaw = String(formData.get("endDate") ?? "");
  const allDay = formData.get("allDay") === "on";
  await addUnavailability({
    userId: user.id,
    startDate,
    endDate: endDateRaw || startDate,
    allDay,
    startTime: (formData.get("startTime") as string) || undefined,
    endTime: (formData.get("endTime") as string) || undefined,
  });
  revalidatePath("/indisponibilidade");
}

export async function removeUnavailabilityAction(ids: string[]) {
  const user = await requireUser();
  await removeUnavailability(ids, user.id);
  revalidatePath("/indisponibilidade");
}
