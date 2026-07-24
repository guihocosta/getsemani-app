"use server";

import { revalidatePath } from "next/cache";
import { selfAllocate } from "@/modules/scheduling/services/selfAllocate";
import { requestSwap, claimSwap } from "@/modules/scheduling/services/swap";

export type ActionCode = "SLOT_TAKEN" | "NOT_ELIGIBLE" | "NOT_OWNER" | "UNKNOWN";

function codeFor(e: unknown): ActionCode {
  const msg = (e as Error)?.message;
  if (msg === "SLOT_TAKEN" || msg === "NOT_ELIGIBLE" || msg === "NOT_OWNER") return msg;
  return "UNKNOWN";
}

export async function selfAllocateAction(
  slotId: string,
  acknowledge = false,
): Promise<{ ok: true; warnedUnavailability?: true } | { ok: false; code: ActionCode }> {
  try {
    const res = await selfAllocate({ slotId, acknowledge });
    revalidatePath("/vagas");
    revalidatePath("/");
    if ("warnedUnavailability" in res && res.warnedUnavailability) {
      return { ok: true, warnedUnavailability: true };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, code: codeFor(e) };
  }
}

export async function requestSwapAction(
  allocationId: string,
): Promise<{ ok: true } | { ok: false; code: ActionCode }> {
  try {
    await requestSwap({ allocationId });
    revalidatePath("/");
    revalidatePath("/vagas");
    return { ok: true };
  } catch (e) {
    return { ok: false, code: codeFor(e) };
  }
}

export async function claimSwapAction(
  swapRequestId: string,
): Promise<{ ok: true } | { ok: false; code: ActionCode }> {
  try {
    await claimSwap({ swapRequestId });
    revalidatePath("/vagas");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, code: codeFor(e) };
  }
}
