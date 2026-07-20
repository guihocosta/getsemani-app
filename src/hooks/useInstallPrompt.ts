"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// beforeinstallprompt so dispara uma vez por carregamento de pagina; guardamos
// o evento num modulo compartilhado pra Home (popup) e Perfil (botao) usarem o mesmo.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenerAttached = false;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

function attachListener() {
  if (listenerAttached || typeof window === "undefined") return;
  listenerAttached = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useInstallPrompt() {
  const [canPrompt, setCanPrompt] = useState(false);
  const [standalone, setStandalone] = useState(true); // assume instalado ate checar (evita flash)
  const [ios, setIos] = useState(false);

  useEffect(() => {
    attachListener();
    setStandalone(isStandalone());
    setIos(isIOS());
    setCanPrompt(!!deferredPrompt);

    const onChange = () => {
      setCanPrompt(!!deferredPrompt);
      setStandalone(isStandalone());
    };
    subscribers.add(onChange);
    return () => {
      subscribers.delete(onChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
    return choice.outcome;
  }, []);

  return { canPrompt, isStandalone: standalone, isIOS: ios, promptInstall };
}
