"use server";

import { revalidatePath } from "next/cache";
import { approveMembership, rejectMembership } from "@/modules/identity/services/reviewMembership";

export async function approveMembershipAction(membershipId: string) {
  await approveMembership({ membershipId });
  revalidatePath("/solicitacoes");
}

export async function rejectMembershipAction(membershipId: string) {
  await rejectMembership({ membershipId });
  revalidatePath("/solicitacoes");
}
