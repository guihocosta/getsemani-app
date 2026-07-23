"use client";

import { Download, CheckCircle2, Share, SquarePlus } from "lucide-react";
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
        <ol className="flex flex-col gap-2">
          <li className="flex items-center gap-2 text-sm text-text-muted">
            <span className="h-6 w-6 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
              <Share size={13} strokeWidth={2} />
            </span>
            Toque em <span className="text-text font-semibold">Compartilhar</span> na barra do navegador
          </li>
          <li className="flex items-center gap-2 text-sm text-text-muted">
            <span className="h-6 w-6 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
              <SquarePlus size={13} strokeWidth={2} />
            </span>
            Escolha <span className="text-text font-semibold">Adicionar à Tela de Início</span>
          </li>
        </ol>
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
