"use client";

import { Badge } from "@/ui/Badge";
import { RequestSwapButton } from "./RequestSwapButton";
import type { AllocationStatus } from "@prisma/client";

export function AllocationActions(props: {
  allocationId: string;
  status: AllocationStatus;
  hasSwapOpen: boolean;
}) {
  return props.hasSwapOpen ? (
    <Badge tone="info">troca pedida</Badge>
  ) : (
    <RequestSwapButton allocationId={props.allocationId} />
  );
}
