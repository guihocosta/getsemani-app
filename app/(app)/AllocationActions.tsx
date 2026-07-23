"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { useConfirm } from "@/ui/ConfirmDialog";
import { RequestSwapButton } from "./RequestSwapButton";
import { confirmAllocationAction, declineAllocationAction, checkInAllocationAction } from "./respondAllocationActions";
import type { AllocationStatus } from "@prisma/client";

export function AllocationActions(props: {
  allocationId: string;
  status: AllocationStatus;
  isToday: boolean;
  checkedIn: boolean;
  hasSwapOpen: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  async function decline() {
    const ok = await confirm({
      title: "Recusar esta escala?",
      description: "A vaga volta a ficar aberta pros outros voluntários do ministério e o líder é avisado.",
      confirmLabel: "Recusar",
      tone: "danger",
    });
    if (ok) start(() => declineAllocationAction(props.allocationId));
  }

  function checkIn() {
    setError(null);
    start(async () => {
      const res = await checkInAllocationAction(props.allocationId);
      if (!res.ok) setError("Não deu pra fazer check-in agora.");
    });
  }

  if (props.status === "PENDING") {
    return (
      <div className="flex flex-col items-end gap-1">
        {dialog}
        <div className="flex gap-2">
          <button
            className="text-xs text-danger disabled:opacity-40"
            disabled={pending}
            onClick={decline}
          >
            Não posso
          </button>
          <Button
            className="py-1.5 px-3 text-xs"
            disabled={pending}
            onClick={() => start(() => confirmAllocationAction(props.allocationId))}
          >
            Confirmar
          </Button>
        </div>
      </div>
    );
  }

  if (props.isToday) {
    if (props.checkedIn) {
      return (
        <span className="flex items-center gap-1 text-xs text-primary font-semibold">
          <CheckCircle2 size={14} strokeWidth={1.8} />
          Check-in feito
        </span>
      );
    }
    return (
      <div className="flex flex-col items-end gap-1">
        <Button className="py-1.5 px-3 text-xs" disabled={pending} onClick={checkIn}>
          Fazer check-in
        </Button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    );
  }

  return props.hasSwapOpen ? (
    <Badge tone="info">troca pedida</Badge>
  ) : (
    <RequestSwapButton allocationId={props.allocationId} />
  );
}
