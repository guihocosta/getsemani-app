"use client";

import { CheckCircle2 } from "lucide-react";
import { Card } from "@/ui/Card";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { InstallGuide } from "../InstallGuide";
import { DONE_KEY } from "@/lib/installPopup";

export function InstallSection() {
  const { isStandalone } = useInstallPrompt();

  if (isStandalone) {
    return (
      <Card className="flex items-center gap-3">
        <CheckCircle2 size={20} className="text-primary shrink-0" strokeWidth={1.8} />
        <p className="text-sm text-text-muted">App instalado na Tela de Início</p>
      </Card>
    );
  }

  // No Perfil o guia fica sempre visível: nao ha o que adiar, so marcar como feito.
  return (
    <Card>
      <InstallGuide onDone={() => localStorage.setItem(DONE_KEY, "1")} />
    </Card>
  );
}
