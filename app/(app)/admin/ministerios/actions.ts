"use server";

import { revalidatePath } from "next/cache";
import { createMinistry } from "@/modules/ministries/services/createMinistry";
import { addRole } from "@/modules/ministries/services/addRole";
import { removeRole } from "@/modules/ministries/services/removeRole";

export async function createMinistryAction(params: { name: string; color?: string; description?: string }) {
  await createMinistry(params);
  revalidatePath("/admin/ministerios");
}

export async function addRoleAction(params: { ministryId: string; name: string }) {
  await addRole(params);
  revalidatePath("/admin/ministerios");
}

export async function removeRoleAction(roleId: string) {
  await removeRole({ roleId });
  revalidatePath("/admin/ministerios");
}
