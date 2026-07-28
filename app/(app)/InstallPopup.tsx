"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/ui/BottomSheet";
import { InstallGuide } from "./InstallGuide";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { shouldShowInstallPopup, SNOOZE_KEY, DONE_KEY } from "@/lib/installPopup";

export function InstallPopup() {
  const { canPrompt, isStandalone, platform } = useInstallPrompt();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(SNOOZE_KEY);
    const show = shouldShowInstallPopup({
      standalone: isStandalone,
      done: localStorage.getItem(DONE_KEY) === "1",
      snoozedAt: raw ? Number(raw) : null,
      now: Date.now(),
      canPrompt,
      os: platform.os,
    });
    if (!show) return;

    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [isStandalone, canPrompt, platform.os]);

  function snooze() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setOpen(false);
  }

  function done() {
    localStorage.setItem(DONE_KEY, "1");
    setOpen(false);
  }

  return (
    <BottomSheet open={open} onClose={snooze}>
      <InstallGuide onDone={done} onSnooze={snooze} />
    </BottomSheet>
  );
}
