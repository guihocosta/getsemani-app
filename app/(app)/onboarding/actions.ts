"use server";

import { revalidatePath } from "next/cache";
import { updateProfile } from "@/modules/identity/services/updateProfile";
import { requestMembership } from "@/modules/identity/services/requestMembership";

export async function updateProfileAction(params: { name: string; phone?: string }) {
  await updateProfile(params);
  revalidatePath("/onboarding");
  revalidatePath("/");
}

export async function requestMembershipAction(ministryId: string) {
  await requestMembership({ ministryId });
  revalidatePath("/onboarding");
}
