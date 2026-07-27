"use client";

import { useState, useTransition } from "react";
import { Button } from "@/ui/Button";
import { approveMembershipAction, rejectMembershipAction } from "./actions";
import { MENSAGENS } from "@/lib/actionError";

export function ReviewButtons({ membershipId }: { membershipId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          className="py-2 px-3 text-sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await approveMembershipAction(membershipId);
              if (res.ok) setDone(true);
              else setMsg(`${MENSAGENS[res.code]} · cód. ${res.ref}`);
            })
          }
        >
          Aprovar
        </Button>
        <Button
          variant="danger"
          className="py-2 px-3 text-sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await rejectMembershipAction(membershipId);
              if (res.ok) setDone(true);
              else setMsg(`${MENSAGENS[res.code]} · cód. ${res.ref}`);
            })
          }
        >
          Recusar
        </Button>
      </div>
      {msg && <span className="text-xs text-primary">{msg}</span>}
    </div>
  );
}
