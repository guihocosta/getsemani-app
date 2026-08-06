"use server";

import { revalidatePath } from "next/cache";
import { selfAllocate } from "@/modules/scheduling/services/selfAllocate";
import { requestSwap, claimSwap, cancelSwap } from "@/modules/scheduling/services/swap";
import { handleActionError, type ActionCode } from "@/lib/actionError";

export type { ActionCode };

export async function selfAllocateAction(
  slotId: string,
  acknowledge = false,
): Promise<{ ok: true; warnedUnavailability?: true } | { ok: false; code: ActionCode; ref: string }> {
  try {
    const res = await selfAllocate({ slotId, acknowledge });
    revalidatePath("/vagas");
    revalidatePath("/");
    if ("warnedUnavailability" in res && res.warnedUnavailability) {
      return { ok: true, warnedUnavailability: true };
    }
    return { ok: true };
  } catch (e) {
    return handleActionError("vagas.selfAllocate", e, { slotId });
  }
}

export async function requestSwapAction(
  allocationId: string,
): Promise<{ ok: true } | { ok: false; code: ActionCode; ref: string }> {
  try {
    await requestSwap({ allocationId });
    revalidatePath("/");
    revalidatePath("/vagas");
    return { ok: true };
  } catch (e) {
    return handleActionError("vagas.requestSwap", e, { allocationId });
  }
}

export async function cancelSwapAction(
  swapRequestId: string,
): Promise<{ ok: true } | { ok: false; code: ActionCode; ref: string }> {
  try {
    await cancelSwap({ swapRequestId });
    revalidatePath("/");
    revalidatePath("/vagas");
    return { ok: true };
  } catch (e) {
    return handleActionError("vagas.cancelSwap", e, { swapRequestId });
  }
}

export async function claimSwapAction(
  swapRequestId: string,
): Promise<{ ok: true } | { ok: false; code: ActionCode; ref: string }> {
  try {
    await claimSwap({ swapRequestId });
    revalidatePath("/vagas");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return handleActionError("vagas.claimSwap", e, { swapRequestId });
  }
}
