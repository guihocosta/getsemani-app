"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type PendingState = ConfirmOptions & { open: boolean };

const DEFAULT_STATE: PendingState = { open: false, title: "" };

// Dialogo de confirmacao reutilizavel: const { confirm, dialog } = useConfirm();
// if (await confirm({ title: "Excluir escala?", tone: "danger" })) { ... }
export function useConfirm() {
  const [state, setState] = useState<PendingState>(DEFAULT_STATE);
  const resolver = useRef<(value: boolean) => void>(undefined);

  const confirm = useCallback((options: ConfirmOptions) => {
    setState({ ...options, open: true });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(value: boolean) {
    setState(DEFAULT_STATE);
    resolver.current?.(value);
  }

  const dialog = (
    <AnimatePresence>
      {state.open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => settle(false)}
        >
          <motion.div
            className="w-full max-w-md rounded-[2rem] bg-surface ring-1 ring-border p-6 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={
                "h-12 w-12 rounded-2xl flex items-center justify-center mb-3 " +
                (state.tone === "danger"
                  ? "bg-danger/10 text-danger ring-1 ring-danger/25"
                  : "bg-accent-soft text-primary ring-1 ring-primary/20")
              }
            >
              <AlertTriangle size={22} strokeWidth={1.8} />
            </div>

            <p className="text-lg text-text mb-1">{state.title}</p>
            {state.description && (
              <p className="text-sm text-text-muted mb-5">{state.description}</p>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => settle(false)}>
                {state.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                variant="primary"
                className={state.tone === "danger" ? "flex-1 !bg-danger hover:!bg-danger/90" : "flex-1"}
                onClick={() => settle(true)}
              >
                {state.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { confirm, dialog };
}
