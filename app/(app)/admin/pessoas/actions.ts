"use server";

import { revalidatePath } from "next/cache";
import { setAdmin } from "@/modules/identity/services/setAdmin";
import { setMembershipRole, removeMembership } from "@/modules/identity/services/setMembershipRole";

export async function setAdminAction(userId: string, isAdmin: boolean) {
  await setAdmin({ userId, isAdmin });
  revalidatePath("/admin/pessoas");
}

export async function setMembershipRoleAction(membershipId: string, role: "LEADER" | "VOLUNTEER") {
  await setMembershipRole({ membershipId, role });
  revalidatePath("/admin/pessoas");
}

export async function removeMembershipAction(membershipId: string) {
  await removeMembership({ membershipId });
  revalidatePath("/admin/pessoas");
}
