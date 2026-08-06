"use client";

import { useState, useTransition } from "react";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { useConfirm } from "@/ui/ConfirmDialog";
import { CancelSwapButton } from "./CancelSwapButton";
import { confirmAllocationAction, declineAllocationAction } from "./respondAllocationActions";
import { fmtDate, fmtTime } from "@/lib/time";
import type { UpcomingItem } from "@/modules/scheduling/services/getMySchedule";

export function PendingConfirmationsCard({ items }: { items: UpcomingItem[] }) {
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const { confirm, dialog } = useConfirm();

  if (!items || items.length === 0) return null;

  // Garantir que o índice ativo não ultrapasse caso a lista diminua
  const safeActive = Math.min(active, items.length - 1);

  async function decline(allocationId: string) {
    const ok = await confirm({
      title: "Recusar esta escala?",
      description: "A vaga volta a ficar aberta pros outros voluntários do ministério e o líder é avisado.",
      confirmLabel: "Recusar",
      tone: "danger",
    });
    if (ok) {
      start(async () => {
        await declineAllocationAction(allocationId);
        if (safeActive > 0 && safeActive === items.length - 1) {
          setActive(safeActive - 1);
        }
      });
    }
  }

  return (
    <div className="mb-8">
      {dialog}
      <div className="flex items-center justify-between mb-3">
        <h2 className="eyebrow">Você foi escalado!</h2>
        {items.length > 1 && (
          <span className="text-xs font-medium text-text-muted">
            {safeActive + 1} de {items.length}
          </span>
        )}
      </div>

      <div 
        className="flex overflow-x-auto snap-x snap-mandatory pb-1 gap-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const index = Math.round(el.scrollLeft / el.offsetWidth);
          setActive(Math.min(items.length - 1, Math.max(0, index)));
        }}
      >
        {items.map((item) => (
          <div key={item.allocationId} className="w-full shrink-0 snap-center">
            <Card className="flex flex-col border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-primary">{item.ministry}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xl font-semibold text-text">{item.role}</p>
                    <Badge tone="info" className="text-[10px] normal-case! tracking-normal! px-1.5 py-0.5">
                      Aguardando confirmação
                    </Badge>
                    {item.hasSwapOpen && (
                      <Badge tone="info" className="text-[10px] normal-case! tracking-normal! px-1.5 py-0.5">
                        troca pedida
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-muted mt-1">{fmtDate(item.date)}</p>
                </div>
                <p className="font-title text-3xl text-primary">{fmtTime(item.date)}</p>
              </div>

              {item.hasSwapOpen && item.swapRequestId && (
                <div className="mt-3">
                  <CancelSwapButton swapRequestId={item.swapRequestId} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-border/50">
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => decline(item.allocationId)}
                >
                  Não posso
                </Button>
                <Button
                  variant="primary"
                  disabled={pending}
                  onClick={() => start(() => confirmAllocationAction(item.allocationId))}
                >
                  Confirmar
                </Button>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
