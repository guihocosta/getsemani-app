"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
import { Button } from "@/ui/Button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const SEEN_KEY = "install-popup-seen";

export function InstallPopup() {
  const { canPrompt, isStandalone, isIOS, promptInstall } = useInstallPrompt();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone) return;
    if (localStorage.getItem(SEEN_KEY)) return;
    if (!isIOS && !canPrompt) return; // sem suporte a instalar ainda (evento pode chegar depois)

    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [isStandalone, isIOS, canPrompt]);

  function dismiss() {
    localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  }

  async function install() {
    await promptInstall();
    dismiss();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            className="w-full max-w-md rounded-[2rem] bg-surface ring-1 ring-border p-6 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="h-12 w-12 rounded-2xl bg-accent-soft ring-1 ring-primary/20 flex items-center justify-center text-primary">
                <Download size={22} strokeWidth={1.8} />
              </div>
              <button onClick={dismiss} className="text-text-muted hover:text-text" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <p className="text-lg text-text mb-1">Instale o app na Tela de Início</p>
            <p className="text-sm text-text-muted mb-5">
              {isIOS
                ? "Acesso rápido às escalas, sem abrir o navegador. Toque em Compartilhar e depois em Adicionar à Tela de Início."
                : "Acesso rápido às escalas e notificações de lembrete, sem abrir o navegador."}
            </p>

            {isIOS ? (
              <Button variant="secondary" className="w-full" onClick={dismiss}>
                Entendi
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={dismiss}>
                  Agora não
                </Button>
                <Button className="flex-1" onClick={install}>
                  Instalar
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
