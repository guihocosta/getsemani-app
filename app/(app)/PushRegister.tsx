"use client";

import { useEffect, useState } from "react";
import { Button } from "@/ui/Button";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Registra SW e assina Web Push. Degrada graciosamente quando sem suporte/permissao (FR-017).
export function PushRegister() {
  const [state, setState] = useState<"idle" | "granted" | "denied" | "unsupported">("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker.register("/sw.js");
    if (Notification.permission === "granted") setState("granted");
    if (Notification.permission === "denied") setState("denied");
  }, []);

  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setState("denied");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
      ),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sub),
    });
    setState("granted");
  }

  if (state === "granted" || state === "unsupported") return null;

  return (
    <div className="mb-4 rounded-[14px] bg-accent-soft ring-1 ring-primary/20 px-4 py-3 flex items-center justify-between">
      <span className="text-sm text-text-muted">
        {state === "denied" ? "Notificações bloqueadas" : "Ativar lembretes das escalas"}
      </span>
      {state !== "denied" && (
        <Button variant="secondary" className="py-2 px-3 text-sm" onClick={enable}>
          Ativar
        </Button>
      )}
    </div>
  );
}
