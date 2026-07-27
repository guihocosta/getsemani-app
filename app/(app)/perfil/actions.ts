"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateProfile } from "@/modules/identity/services/updateProfile";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function updateProfileAction(params: { name: string; phone?: string }) {
  await updateProfile(params);
  revalidatePath("/perfil");
  revalidatePath("/");
}

// Ultima escapatoria manual: se a sessao ficar num estado ruim, sair permite
// entrar de novo do zero em vez de ficar preso sem nenhuma acao possivel.
export async function signOutAction() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
