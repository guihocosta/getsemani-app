"use client";

import { useRef, useState } from "react";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { AllocationActions } from "./AllocationActions";
import { fmtDate, fmtTime, dateKey } from "@/lib/time";
import type { UpcomingItem } from "@/modules/scheduling/services/getMySchedule";

export function UpcomingCarousel({ items, todayKey }: { items: UpcomingItem[]; todayKey: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;
    const cardWidth = el.scrollWidth / items.length;
    const index = Math.round(el.scrollLeft / cardWidth);
    setActive(Math.min(items.length - 1, Math.max(0, index)));
  }

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        data-no-swipe
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((it) => (
          <div key={it.allocationId} className="w-[85%] shrink-0 snap-center">
            <Card className="flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-primary">{it.ministry}</p>
                  <p className="text-lg text-text">{it.role}</p>
                  <p className="text-sm text-text-muted">{fmtDate(it.date)}</p>
                </div>
                <p className="font-title text-2xl text-primary">{fmtTime(it.date)}</p>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
                <div>
                  {it.status === "PENDING" && (
                    <Badge tone="info" className="normal-case! tracking-normal!">
                      Aguardando confirmação
                    </Badge>
                  )}
                </div>
                <AllocationActions
                  allocationId={it.allocationId}
                  status={it.status}
                  isToday={dateKey(it.date) === todayKey}
                  checkedIn={!!it.checkedInAt}
                  hasSwapOpen={it.hasSwapOpen}
                />
              </div>
            </Card>
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <p className="text-center text-xs text-text-muted mt-2">
          {active + 1} de {items.length}
        </p>
      )}
    </div>
  );
}
