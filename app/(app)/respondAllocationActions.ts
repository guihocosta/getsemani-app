"use server";

import { revalidatePath } from "next/cache";
import { confirmAllocation, declineAllocation, checkInAllocation } from "@/modules/scheduling/services/respondAllocation";

export async function confirmAllocationAction(allocationId: string) {
  await confirmAllocation({ allocationId });
  revalidatePath("/");
}

export async function declineAllocationAction(allocationId: string) {
  await declineAllocation({ allocationId });
  revalidatePath("/");
  revalidatePath("/vagas");
}

export async function checkInAllocationAction(allocationId: string) {
  try {
    await checkInAllocation({ allocationId });
    revalidatePath("/");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
