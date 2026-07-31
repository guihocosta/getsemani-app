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
    <BottomSheet open={open} onClose={onClose}>
      {title && (
        <div className="pb-3 border-b border-border mb-3">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
        </div>
      )}
      {children}
    </BottomSheet>
  );
}
