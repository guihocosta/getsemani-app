"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useDialog } from "./useDialog";
import { Portal } from "./Portal";

export function BottomSheet({
  open,
  onClose,
  label = "Detalhes",
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label?: string;
  title?: string;
  children: ReactNode;
}) {
  const panelRef = useDialog(open, onClose);

  return (
    <Portal>
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
              aria-label={label}
              tabIndex={-1}
              className="w-full max-w-md max-h-[85vh] flex flex-col rounded-t-[2rem] lg:rounded-[2rem] outline-none bg-surface ring-1 ring-border shadow-[0_-25px_60px_-15px_rgba(15,23,42,0.35)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Alca so indica que o painel e de baixo; fechar e pelo X, fora ou Esc. */}
              <div
                data-testid="alca"
                aria-hidden
                className="lg:hidden flex justify-center pt-3 shrink-0"
              >
                <span className="h-1.5 w-10 rounded-full bg-border" />
              </div>
              <div
                className={
                  "flex items-center gap-3 pl-4 pr-2 pt-2 lg:pt-3 shrink-0 " +
                  (title ? "pb-3 mb-3 border-b border-border" : "pb-1")
                }
              >
                <div className="flex-1 min-w-0">
                  {title && <h2 className="text-lg font-semibold text-text">{title}</h2>}
                </div>
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={onClose}
                  className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
                >
                  <X size={20} strokeWidth={1.8} />
                </button>
              </div>
              <div className="overflow-y-auto px-4 pb-6">{children}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
