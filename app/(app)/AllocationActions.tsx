"use client";

import { Badge } from "@/ui/Badge";
import { RequestSwapButton } from "./RequestSwapButton";
import { CancelSwapButton } from "./CancelSwapButton";
import type { AllocationStatus } from "@prisma/client";

export function AllocationActions(props: {
  allocationId: string;
  status: AllocationStatus;
  hasSwapOpen: boolean;
  swapRequestId?: string | null;
}) {
  if (props.hasSwapOpen && props.swapRequestId) {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="info">troca pedida</Badge>
        <CancelSwapButton swapRequestId={props.swapRequestId} />
      </div>
    );
  }
  if (props.hasSwapOpen) {
    return <Badge tone="info">troca pedida</Badge>;
  }
  return <RequestSwapButton allocationId={props.allocationId} />;
}
