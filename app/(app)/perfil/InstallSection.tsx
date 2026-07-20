"use client";

import { Download, CheckCircle2 } from "lucide-react";
import { Card } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallSection() {
  const { canPrompt, isStandalone, isIOS, promptInstall } = useInstallPrompt();

  if (isStandalone) {
    return (
      <Card className="flex items-center gap-3">
        <CheckCircle2 size={20} className="text-primary shrink-0" strokeWidth={1.8} />
        <p className="text-sm text-text-muted">App instalado na Tela de Início</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-accent-soft ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0">
          <Download size={18} strokeWidth={1.8} />
        </div>
        <p className="text-sm text-text">Instalar app na Tela de Início</p>
      </div>

      {isIOS ? (
        <p className="text-xs text-text-muted">
          Toque em <span className="text-text font-semibold">Compartilhar</span> e depois em{" "}
          <span className="text-text font-semibold">Adicionar à Tela de Início</span>.
        </p>
      ) : canPrompt ? (
        <Button variant="secondary" className="w-full py-2.5 text-sm" onClick={() => promptInstall()}>
          Instalar
        </Button>
      ) : (
        <p className="text-xs text-text-muted">
          No menu do navegador, procure por &quot;Instalar app&quot; ou &quot;Adicionar à tela de
          início&quot;.
        </p>
      )}
    </Card>
  );
}
