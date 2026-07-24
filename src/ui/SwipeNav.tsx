"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useDragControls, type PanInfo } from "framer-motion";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

const OFFSET_THRESHOLD = 70;
const VELOCITY_THRESHOLD = 450;

function matchIndex(pathname: string, tabs: string[]): number {
  return tabs.findIndex((href) => (href === "/" ? pathname === "/" : pathname.startsWith(href)));
}

// Swipe horizontal troca de aba (mesma ordem da nav de baixo). Ignora o gesto
// se comecar dentro de [data-no-swipe] (dialogos, formularios, calendario).
export function SwipeNav({ tabs, children }: { tabs: string[]; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const controls = useDragControls();
  const idx = matchIndex(pathname, tabs);

  useEffect(() => {
    if (idx < 0) return;
    if (idx > 0) router.prefetch(tabs[idx - 1]);
    if (idx < tabs.length - 1) router.prefetch(tabs[idx + 1]);
  }, [idx, router, tabs]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-swipe]")) return;
    controls.start(e);
  }

  function onDragEnd(_e: unknown, info: PanInfo) {
    if (idx < 0) return;
    const goingNext = info.offset.x < -OFFSET_THRESHOLD || info.velocity.x < -VELOCITY_THRESHOLD;
    const goingPrev = info.offset.x > OFFSET_THRESHOLD || info.velocity.x > VELOCITY_THRESHOLD;
    if (goingNext && idx < tabs.length - 1) router.push(tabs[idx + 1]);
    else if (goingPrev && idx > 0) router.push(tabs[idx - 1]);
  }

  return (
    <motion.div
      onPointerDown={onPointerDown}
      drag="x"
      dragControls={controls}
      dragListener={false}
      dragDirectionLock
      dragElastic={0.12}
      dragConstraints={{ left: 0, right: 0 }}
      dragSnapToOrigin
      onDragEnd={onDragEnd}
      style={{ touchAction: "pan-y" }}
    >
      {children}
    </motion.div>
  );
}
