"use server";

import { revalidatePath } from "next/cache";
import { updateProfile } from "@/modules/identity/services/updateProfile";

export async function updateProfileAction(params: { name: string; phone?: string }) {
  await updateProfile(params);
  revalidatePath("/perfil");
  revalidatePath("/");
}
