"use client";

import { BottomSheet } from "./BottomSheet";
import type { ReactNode } from "react";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} label={title} title={title}>
      {children}
    </BottomSheet>
  );
}
