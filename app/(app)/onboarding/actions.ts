"use server";

import { revalidatePath } from "next/cache";
import { requestMembership } from "@/modules/identity/services/requestMembership";

export async function requestMembershipAction(ministryId: string) {
  await requestMembership({ ministryId });
  revalidatePath("/onboarding");
  revalidatePath("/perfil");
}
