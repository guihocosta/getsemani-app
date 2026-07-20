"use client";

import { useState, useTransition } from "react";
import { Button } from "@/ui/Button";
import { selfAllocateAction, claimSwapAction } from "./actions";

export function SelfAllocateButton({ slotId }: { slotId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function go(ack: boolean) {
    start(async () => {
      try {
        const res = await selfAllocateAction(slotId, ack);
        if ("warnedUnavailability" in res && res.warnedUnavailability) {
          setMsg("Você marcou indisponibilidade nesse horário. Confirmar mesmo assim?");
        } else {
          setMsg(null);
        }
      } catch (e) {
        setMsg((e as Error).message === "SLOT_TAKEN" ? "Vaga já preenchida" : "Erro");
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
          {msg.includes("mesmo assim") && (
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
            try {
              await claimSwapAction(swapRequestId);
            } catch (e) {
              setMsg((e as Error).message === "SLOT_TAKEN" ? "Já assumida" : "Erro");
            }
          })
        }
      >
        Assumir
      </Button>
      {msg && <div className="mt-1 text-xs text-primary">{msg}</div>}
    </div>
  );
}
