"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/identity/services/authz";
import { addUnavailability, removeUnavailability } from "@/modules/availability/services/unavailability";

export async function addUnavailabilityAction(formData: FormData) {
  const user = await requireUser();
  const date = String(formData.get("date"));
  const allDay = formData.get("allDay") === "on";
  await addUnavailability({
    userId: user.id,
    date,
    allDay,
    startTime: (formData.get("startTime") as string) || undefined,
    endTime: (formData.get("endTime") as string) || undefined,
  });
  revalidatePath("/indisponibilidade");
}

export async function removeUnavailabilityAction(id: string) {
  const user = await requireUser();
  await removeUnavailability(id, user.id);
  revalidatePath("/indisponibilidade");
}
