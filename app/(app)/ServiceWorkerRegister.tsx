"use client";

import { useEffect } from "react";

// Registra o SW em qualquer rota autenticada. Antes isso vivia dentro do
// PushRegister (so no /perfil, e so com chave VAPID) — sem SW o Chrome nunca
// considera o app instalavel e `beforeinstallprompt` nao dispara.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Falha de registro so desliga instalacao/push; o app segue funcionando.
    });
  }, []);

  return null;
}
