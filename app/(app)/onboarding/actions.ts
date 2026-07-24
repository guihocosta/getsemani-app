"use server";

import { revalidatePath } from "next/cache";
import { requestMembership } from "@/modules/identity/services/requestMembership";

export type RequestMembershipCode = "ALREADY_REQUESTED" | "UNKNOWN";

export async function requestMembershipAction(
  ministryId: string,
): Promise<{ ok: true; status: "ACTIVE" | "PENDING" } | { ok: false; code: RequestMembershipCode }> {
  try {
    const membership = await requestMembership({ ministryId });
    revalidatePath("/onboarding");
    revalidatePath("/perfil");
    revalidatePath("/solicitacoes");
    revalidatePath("/admin");
    return { ok: true, status: membership.status };
  } catch (e) {
    const code = (e as Error)?.message === "ALREADY_REQUESTED" ? "ALREADY_REQUESTED" : "UNKNOWN";
    return { ok: false, code };
  }
}
