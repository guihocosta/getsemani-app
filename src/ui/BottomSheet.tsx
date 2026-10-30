"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useDialog } from "./useDialog";

export function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { panelRef, onKeyDown } = useDialog(open, onClose);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-no-swipe
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onKeyDown={onKeyDown}
            className="w-full max-w-md max-h-[85vh] flex flex-col rounded-t-[2rem] lg:rounded-[2rem] outline-none bg-surface ring-1 ring-border shadow-[0_-25px_60px_-15px_rgba(15,23,42,0.35)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="w-full min-h-11 flex items-center justify-center shrink-0"
            >
              <span className="h-1.5 w-10 rounded-full bg-border lg:hidden" />
              <span aria-hidden className="hidden lg:inline text-sm text-text-muted">
                Fechar
              </span>
            </button>
            <div className="overflow-y-auto px-4 pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
