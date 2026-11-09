"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";

// Modal fora da arvore da pagina: a transicao de rota (motion.div com
// transform) vira o containing block de `fixed`, e o fundo deixava o menu
// lateral descoberto e clicavel. No servidor nao ha document: renderiza no
// lugar (modal fechado no SSR nao renderiza nada de qualquer jeito).
export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return <>{children}</>;
  return createPortal(children, document.body);
}
