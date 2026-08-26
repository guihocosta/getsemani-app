"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateProfile } from "@/modules/identity/services/updateProfile";
import { setOwnSkill } from "@/modules/ministries/services/userSkills";
import { createSupabaseServer } from "@/lib/supabase/server";
import { handleActionError, type ActionCode } from "@/lib/actionError";

export async function updateProfileAction(params: { name: string; phone?: string }) {
  await updateProfile(params);
  revalidatePath("/perfil");
  revalidatePath("/");
}

export async function setOwnSkillAction(
  roleId: string,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; code: ActionCode; ref: string }> {
  try {
    await setOwnSkill({ roleId, enabled });
    revalidatePath("/perfil");
    return { ok: true };
  } catch (e) {
    return handleActionError("perfil.setOwnSkill", e, { roleId, enabled });
  }
}

// Ultima escapatoria manual: se a sessao ficar num estado ruim, sair permite
// entrar de novo do zero em vez de ficar preso sem nenhuma acao possivel.
export async function signOutAction() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
