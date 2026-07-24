"use client";

import { useState, useTransition } from "react";
import { Button } from "@/ui/Button";
import { selfAllocateAction, claimSwapAction, type ActionCode } from "./actions";

const MENSAGENS: Record<ActionCode, string> = {
  SLOT_TAKEN: "Vaga já preenchida",
  NOT_ELIGIBLE: "Você não é membro ativo desse ministério",
  NOT_OWNER: "Essa escala não é sua",
  UNKNOWN: "Não deu para completar agora. Tente de novo.",
};

export function SelfAllocateButton({ slotId }: { slotId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function go(ack: boolean) {
    start(async () => {
      const res = await selfAllocateAction(slotId, ack);
      if (!res.ok) {
        setMsg(MENSAGENS[res.code]);
        setConfirming(false);
        return;
      }
      if (res.warnedUnavailability) {
        setMsg("Você marcou indisponibilidade nesse horário. Confirmar mesmo assim?");
        setConfirming(true);
      } else {
        setMsg(null);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="text-right">
      <Button className="py-2 px-3 text-sm" disabled={pending} onClick={() => go(false)}>
        Pegar
      </Button>
      {msg && (
        <div className="mt-1 text-xs text-primary max-w-[9rem]">
          {msg}
          {confirming && (
            <button className="block underline underline-offset-2 mt-1" onClick={() => go(true)}>
              Confirmar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ClaimSwapButton({ swapRequestId }: { swapRequestId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="text-right">
      <Button
        variant="secondary"
        className="py-2 px-3 text-sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await claimSwapAction(swapRequestId);
            if (!res.ok) setMsg(MENSAGENS[res.code]);
          })
        }
      >
        Assumir
      </Button>
      {msg && <div className="mt-1 text-xs text-primary">{msg}</div>}
    </div>
  );
}
