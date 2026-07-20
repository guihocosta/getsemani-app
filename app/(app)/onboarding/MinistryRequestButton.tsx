"use client";

import { useState, useTransition } from "react";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { requestMembershipAction } from "./actions";
import type { MembershipStatus } from "@prisma/client";

export function MinistryRequestButton({
  ministryId,
  status,
}: {
  ministryId: string;
  status: MembershipStatus | null;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState(status);

  if (localStatus === "PENDING") {
    return <Badge tone="muted">Aguardando aprovação</Badge>;
  }
  if (localStatus === "ACTIVE") {
    return <Badge tone="info">Você já participa</Badge>;
  }

  return (
    <div className="text-right">
      <Button
        variant="secondary"
        className="py-2 px-3 text-sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await requestMembershipAction(ministryId);
              setLocalStatus("PENDING");
            } catch (e) {
              setMsg((e as Error).message === "ALREADY_REQUESTED" ? "Já pedido" : "Erro");
            }
          })
        }
      >
        Pedir para participar
      </Button>
      {msg && <div className="mt-1 text-xs text-primary">{msg}</div>}
    </div>
  );
}
