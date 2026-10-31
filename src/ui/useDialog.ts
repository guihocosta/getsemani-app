"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

// Confirmacao abre sobre um sheet: so o dialogo do topo reage ao teclado.
const abertos: object[] = [];

// Comportamento de dialogo: foco entra ao abrir, Tab fica dentro, Esc fecha e o
// foco volta para quem abriu. O painel precisa de tabIndex={-1}. Escuta no
// document porque um controle interno que some leva o foco para o body.
export function useDialog(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const dialogo = {};
    abertos.push(dialogo);
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (abertos[abertos.length - 1] !== dialogo) return;
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (!panelRef.current.contains(current)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && (current === first || current === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      abertos.splice(abertos.indexOf(dialogo), 1);
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  return panelRef;
}
