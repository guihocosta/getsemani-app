"use server";

import { revalidatePath } from "next/cache";
import { createMinistry } from "@/modules/ministries/services/createMinistry";
import { updateMinistry } from "@/modules/ministries/services/updateMinistry";
import { addRole } from "@/modules/ministries/services/addRole";
import { setRoleActive, deleteRole, renameRole } from "@/modules/ministries/services/removeRole";

export async function createMinistryAction(params: { name: string; color?: string; description?: string }) {
  await createMinistry(params);
  revalidatePath("/admin/ministerios");
}

export async function updateMinistryAction(params: {
  ministryId: string;
  name?: string;
  color?: string;
  description?: string;
}) {
  await updateMinistry(params);
  revalidatePath("/admin/ministerios");
}

export async function addRoleAction(params: { ministryId: string; name: string }) {
  await addRole(params);
  revalidatePath("/admin/ministerios");
}

export async function setRoleActiveAction(roleId: string, active: boolean) {
  await setRoleActive({ roleId, active });
  revalidatePath("/admin/ministerios");
}

export async function deleteRoleAction(roleId: string) {
  await deleteRole({ roleId });
  revalidatePath("/admin/ministerios");
}

export async function renameRoleAction(roleId: string, name: string) {
  await renameRole({ roleId, name });
  revalidatePath("/admin/ministerios");
}
