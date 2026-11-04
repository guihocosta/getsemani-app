"use client";

import { useState, useTransition, useEffect } from "react";
import { Card } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { CheckCircle2 } from "lucide-react";
import { fmtTime } from "@/lib/time";
import { checkInAllocationAction } from "./respondAllocationActions";
import { OccurrenceLinks } from "./OccurrenceLinks";
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
    <div data-testid="grupo-hoje" className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="eyebrow">Sua Escala Hoje</h2>
        {items.length > 1 && (
          <span className="lg:hidden text-xs font-medium text-text-muted">
            {safeActive + 1} de {items.length}
          </span>
        )}
      </div>

      <div 
        className="flex overflow-x-auto snap-x snap-mandatory pb-1 gap-4 [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-2"
        style={{ scrollbarWidth: "none" }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const index = Math.round(el.scrollLeft / el.offsetWidth);
          setActive(Math.min(items.length - 1, Math.max(0, index)));
        }}
      >
        {items.map((item, idx) => (
          <div key={item.allocationId} className="w-full shrink-0 snap-center lg:only:col-span-2" ref={el => {
            if (el && idx === safeActive && el.parentElement) {
              const container = el.parentElement;
              if (container.scrollLeft !== el.offsetLeft) {
                container.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
              }
            }
          }}>
            <Card
              data-testid="card-escala"
              className="flex flex-col border-primary/20 border-l-4 bg-primary/5"
              style={{ borderLeftColor: item.ministryColor }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-primary">{item.ministry}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xl font-semibold text-text">{item.role}</p>
                    {item.hasSwapOpen && (
                      <Badge tone="info" className="text-[10px] normal-case! tracking-normal! px-1.5 py-0.5">
                        troca pedida
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-muted mt-1">Hoje</p>
                </div>
                <p className="font-title text-4xl text-primary">{fmtTime(item.date)}</p>
              </div>

              <div className="mt-3">
                <OccurrenceLinks occurrenceId={item.occurrenceId} repertoireEnabled={item.repertoireEnabled} />
              </div>

              <div className="mt-4 pt-4 border-t border-border/50">
                {item.checkedInAt ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-primary font-semibold">
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
