"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Share, SquarePlus, MoreHorizontal, Link2, Check, Download } from "lucide-react";
import { Button } from "@/ui/Button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import type { InstallPlatform } from "@/lib/platform";

function Passo({
  n,
  Icon,
  children,
}: {
  n: number;
  Icon: typeof Share;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 text-sm text-text-muted">
      <span className="h-7 w-7 shrink-0 rounded-full bg-surface-2 text-text flex items-center justify-center text-xs font-semibold">
        {n}
      </span>
      <span className="h-7 w-7 shrink-0 rounded-full bg-accent-soft text-primary flex items-center justify-center">
        <Icon size={14} strokeWidth={2} />
      </span>
      <span>{children}</span>
    </li>
  );
}

// Seta piscando pra barra do navegador. No iPhone o Compartilhar fica embaixo;
// no iPad e no Chrome iOS o menu fica em cima.
function Seta({ position }: { position: "bottom" | "top" }) {
  return (
    <motion.div
      aria-hidden
      className={
        position === "bottom"
          ? "pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4px)] z-[60] flex justify-center"
          : "pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4px)] z-[60] flex justify-center"
      }
      animate={{ y: position === "bottom" ? [0, 8, 0] : [0, -8, 0] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-premium">
        {position === "bottom" ? "aqui embaixo ↓" : "aqui em cima ↑"}
      </span>
    </motion.div>
  );
}

function GuiaIOS({ platform }: { platform: InstallPlatform }) {
  const viaMenu = platform.browser !== "safari";
  return (
    <>
      <ol className="flex flex-col gap-3">
        {viaMenu ? (
          <Passo n={1} Icon={MoreHorizontal}>
            Toque no menu <span className="text-text font-semibold">⋯</span> e escolha{" "}
            <span className="text-text font-semibold">Compartilhar</span>
          </Passo>
        ) : (
          <Passo n={1} Icon={Share}>
            Toque em <span className="text-text font-semibold">Compartilhar</span> na barra do
            navegador
          </Passo>
        )}
        <Passo n={2} Icon={SquarePlus}>
          Role e escolha{" "}
          <span className="text-text font-semibold">Adicionar à Tela de Início</span>
        </Passo>
        <Passo n={3} Icon={Check}>
          Confirme em <span className="text-text font-semibold">Adicionar</span> — o ícone aparece
          na sua tela
        </Passo>
      </ol>
      {platform.sharePosition !== "none" && <Seta position={platform.sharePosition} />}
    </>
  );
}

function GuiaInApp() {
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState(false);
  const url = typeof window === "undefined" ? "" : window.location.origin;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      setErro(true);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">
        Você abriu o app dentro de outro aplicativo, e daqui não dá pra instalar. Toque no menu{" "}
        <span className="text-text font-semibold">⋯</span> e escolha{" "}
        <span className="text-text font-semibold">Abrir no navegador</span>, ou copie o link e cole
        no Safari.
      </p>
      {erro ? (
        <p className="select-all break-all rounded-xl bg-surface-2 px-3 py-2 text-sm text-text">
          {url}
        </p>
      ) : (
        <Button variant="secondary" className="w-full py-2.5 text-sm" onClick={copiar}>
          {copiado ? <Check size={16} /> : <Link2 size={16} />}
          {copiado ? "Link copiado" : "Copiar link"}
        </Button>
      )}
    </div>
  );
}

export function InstallGuide({ onDone, onSnooze }: { onDone: () => void; onSnooze?: () => void }) {
  const { canPrompt, platform, promptInstall } = useInstallPrompt();

  async function instalar() {
    const r = await promptInstall();
    if (r !== "unavailable") onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- icone estatico do PWA, sem ganho em otimizar */}
        <img
          src="/icons/icon-192.png"
          alt=""
          className="h-12 w-12 rounded-2xl ring-1 ring-border"
          width={48}
          height={48}
        />
        <div>
          <p className="text-base text-text">Getsemani na Tela de Início</p>
          <p className="text-xs text-text-muted">Abre direto, sem procurar no navegador.</p>
        </div>
      </div>

      {canPrompt ? (
        <Button className="w-full" onClick={instalar}>
          <Download size={18} strokeWidth={1.8} />
          Instalar
        </Button>
      ) : platform.browser === "in-app" ? (
        <GuiaInApp />
      ) : platform.os === "ios" ? (
        <GuiaIOS platform={platform} />
      ) : (
        <p className="text-sm text-text-muted">
          No menu do navegador, procure por{" "}
          <span className="text-text font-semibold">Instalar app</span> ou{" "}
          <span className="text-text font-semibold">Adicionar à tela de início</span>.
        </p>
      )}

      {!canPrompt && (
        <div className="flex gap-2">
          {onSnooze && (
            <Button variant="ghost" className="flex-1 py-2.5 text-sm" onClick={onSnooze}>
              Agora não
            </Button>
          )}
          <Button variant="secondary" className="flex-1 py-2.5 text-sm" onClick={onDone}>
            Já instalei
          </Button>
        </div>
      )}
    </div>
  );
}
