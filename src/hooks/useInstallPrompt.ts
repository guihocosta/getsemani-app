"use client";

import { useCallback, useEffect, useState } from "react";
import { currentPlatform, isStandalone, type InstallPlatform } from "@/lib/platform";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// beforeinstallprompt so dispara uma vez por carregamento de pagina; guardamos
// o evento num modulo compartilhado pra Home (popup) e Perfil (botao) usarem o mesmo.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenerAttached = false;
let installed = false;
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
    installed = true;
    notify();
  });
}

/** true depois do evento `appinstalled` nesta aba. */
export function wasInstalledNow() {
  return installed;
}

const UNKNOWN: InstallPlatform = {
  os: "other",
  browser: "other",
  supportsNativePrompt: false,
  sharePosition: "none",
};

export function useInstallPrompt() {
  const [canPrompt, setCanPrompt] = useState(false);
  const [standalone, setStandalone] = useState(true); // assume instalado ate checar (evita flash)
  const [platform, setPlatform] = useState<InstallPlatform>(UNKNOWN);

  useEffect(() => {
    attachListener();
    setStandalone(isStandalone());
    setPlatform(currentPlatform());
    setCanPrompt(!!deferredPrompt);

    const onChange = () => {
      setCanPrompt(!!deferredPrompt);
      setStandalone(isStandalone() || wasInstalledNow());
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

  return { canPrompt, isStandalone: standalone, platform, promptInstall };
}
