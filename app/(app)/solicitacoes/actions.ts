"use server";

import { revalidatePath } from "next/cache";
import { approveMembership, rejectMembership } from "@/modules/identity/services/reviewMembership";
import { handleActionError, type ActionCode } from "@/lib/actionError";

export type { ActionCode };

function revalidateAfterReview() {
  revalidatePath("/solicitacoes");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function approveMembershipAction(
  membershipId: string,
): Promise<{ ok: true } | { ok: false; code: ActionCode; ref: string }> {
  try {
    await approveMembership({ membershipId });
    revalidateAfterReview();
    return { ok: true };
  } catch (e) {
    return handleActionError("solicitacoes.approve", e, { membershipId });
  }
}

export async function rejectMembershipAction(
  membershipId: string,
): Promise<{ ok: true } | { ok: false; code: ActionCode; ref: string }> {
  try {
    await rejectMembership({ membershipId });
    revalidateAfterReview();
    return { ok: true };
  } catch (e) {
    return handleActionError("solicitacoes.reject", e, { membershipId });
  }
}
