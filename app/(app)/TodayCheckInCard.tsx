"use client";

import { useState, useTransition, useEffect } from "react";
import { Card } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { CheckCircle2 } from "lucide-react";
import { fmtTime } from "@/lib/time";
import { checkInAllocationAction } from "./respondAllocationActions";
import type { UpcomingItem } from "@/modules/scheduling/services/getMySchedule";

export function TodayCheckInCard({ items }: { items: UpcomingItem[] }) {
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();

  // Focus on the first item that doesn't have a check-in
  useEffect(() => {
    if (!items || items.length === 0) return;
    const firstPendingIndex = items.findIndex((it) => !it.checkedInAt);
    if (firstPendingIndex !== -1) {
      setActive(firstPendingIndex);
    }
  }, [items]);

  if (!items || items.length === 0) return null;

  const safeActive = Math.min(active, items.length - 1);

  async function checkIn(allocationId: string) {
    start(async () => {
      await checkInAllocationAction(allocationId);
    });
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="eyebrow">Sua Escala Hoje</h2>
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
        {items.map((item, idx) => (
          <div key={item.allocationId} className="w-full shrink-0 snap-center" ref={el => {
            if (el && idx === safeActive && el.parentElement) {
              const container = el.parentElement;
              if (container.scrollLeft !== el.offsetLeft) {
                container.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
              }
            }
          }}>
            <Card className="flex flex-col border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-primary">{item.ministry}</p>
                  <p className="text-xl font-semibold text-text mt-0.5">{item.role}</p>
                  <p className="text-sm text-text-muted mt-1">Hoje</p>
                </div>
                <p className="font-title text-4xl text-primary">{fmtTime(item.date)}</p>
              </div>

              <div className="mt-5 pt-4 border-t border-border/50">
                {item.checkedInAt ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-success font-semibold">
                    <CheckCircle2 size={20} />
                    <span>Check-in feito</span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    disabled={pending}
                    onClick={() => checkIn(item.allocationId)}
                    className="w-full py-2.5 text-base"
                  >
                    Fazer Check-in
                  </Button>
                )}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
