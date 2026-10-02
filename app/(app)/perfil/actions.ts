"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateProfile } from "@/modules/identity/services/updateProfile";
import { setOwnSkill } from "@/modules/ministries/services/userSkills";
import { createSupabaseServer } from "@/lib/supabase/server";
import { handleActionError, isRedirectError, type ActionCode } from "@/lib/actionError";
import { logError } from "@/lib/logError";

// Devolve o codigo em vez de lancar: mensagem de erro lancada por Server Action
// nao chega ao client em producao.
export async function updateProfileAction(params: {
  name: string;
  phone?: string;
  birthDate?: string;
}): Promise<{ ok: true } | { ok: false; code: "INVALID_NAME" | "INVALID_BIRTH_DATE" | "UNKNOWN" }> {
  try {
    await updateProfile(params);
    revalidatePath("/perfil");
    revalidatePath("/aniversariantes");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = (e as Error)?.message;
    if (msg === "INVALID_NAME" || msg === "INVALID_BIRTH_DATE") return { ok: false, code: msg };
    logError("perfil.updateProfile", e);
    return { ok: false, code: "UNKNOWN" };
  }
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
