"use server";

import { revalidatePath } from "next/cache";
import { selfAllocate } from "@/modules/scheduling/services/selfAllocate";
import { requestSwap, claimSwap } from "@/modules/scheduling/services/swap";

export async function selfAllocateAction(slotId: string, acknowledge = false) {
  const res = await selfAllocate({ slotId, acknowledge });
  revalidatePath("/vagas");
  revalidatePath("/");
  return res;
}

export async function requestSwapAction(allocationId: string) {
  await requestSwap({ allocationId });
  revalidatePath("/");
  revalidatePath("/vagas");
}

export async function claimSwapAction(swapRequestId: string) {
  await claimSwap({ swapRequestId });
  revalidatePath("/vagas");
  revalidatePath("/");
}
