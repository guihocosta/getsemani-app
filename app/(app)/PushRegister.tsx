"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { currentPlatform, isStandalone } from "@/lib/platform";
import { resolvePushState, type PushState } from "@/lib/pushState";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Evita que syncSubscription() trave para sempre: navigator.serviceWorker.ready
// nunca rejeita se o registro do SW falhou (ServiceWorkerRegister.tsx engole o erro
// silenciosamente), entao sem timeout a UI ficaria presa em "Verificando..." pra sempre.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), ms)),
  ]);
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Garante que existe uma assinatura viva e que o servidor conhece ela.
// O POST acontece sempre, mesmo quando getSubscription() ja devolveu uma: o
// upsert por endpoint em /api/push/subscribe e idempotente, e re-postar e o que
// recria a linha que notify.ts apagou ao receber 410.
async function syncSubscription() {
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY as string),
    }));

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sub),
  });
  if (!res.ok) throw new Error("SUBSCRIBE_FAILED");
}

// Registra o SW e assina Web Push. Degrada graciosamente quando falta suporte ou
// permissao (FR-017) — mas nunca renderiza vazio: o cabecalho "Notificacoes" em
// perfil/page.tsx aparece sempre, entao um null aqui deixa a secao orfa.
export function PushRegister() {
  const [state, setState] = useState<PushState>("checking");
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = resolvePushState({
      os: currentPlatform().os,
      standalone: isStandalone(),
      hasServiceWorker: "serviceWorker" in navigator,
      hasPushManager: "PushManager" in window,
      hasNotification: typeof Notification !== "undefined",
      hasVapidKey: Boolean(VAPID_KEY),
      permission: typeof Notification !== "undefined" ? Notification.permission : "default",
    });
    setState(next);

    // Permissao concedida nao garante assinatura viva: o iOS descarta a
    // subscription ao reinstalar o PWA ou apos muito tempo sem uso.
    if (next === "granted") {
      withTimeout(syncSubscription(), 10000).catch(() => setState("error"));
    }
  }, []);

  const enable = useCallback(async () => {
    // requestPermission tem que ser a primeira instrucao: o iOS so aceita o
    // prompt dentro do gesto direto do usuario, sem await antes.
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setState("denied");
      return;
    }
    // Feedback visual imediato: sem isso o botao "Ativar" continua clicavel
    // durante o SW ready + subscribe + POST, que pode demorar.
    setState("checking");
    try {
      await withTimeout(syncSubscription(), 10000);
      setState("granted");
    } catch {
      setState("error");
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; sent?: number };
      if (!res.ok || !data.ok) {
        setTestMsg("Falha ao enviar. Tente de novo.");
      } else if (!data.sent) {
        // Sem assinatura viva no servidor: volta para o estado "error", que
        // reaproveita o botao "Tentar de novo" (retry -> syncSubscription) em
        // vez de deixar o usuario preso sem saida alem de recarregar a pagina.
        setState("error");
      } else {
        setTestMsg("Enviada! Deve chegar em instantes.");
      }
    } catch {
      setTestMsg("Falha ao enviar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }, []);

  const retry = useCallback(async () => {
    setState("checking");
    try {
      await withTimeout(syncSubscription(), 10000);
      setState("granted");
    } catch {
      setState("error");
    }
  }, []);

  if (state === "checking") {
    return (
      <Card>
        <p className="text-sm text-text-muted">Verificando…</p>
      </Card>
    );
  }

  if (state === "granted") {
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-text">Notificações ativadas</p>
          <Button
            variant="secondary"
            className="py-2 px-3 text-sm shrink-0"
            onClick={sendTest}
            disabled={busy}
          >
            {busy ? "Enviando…" : "Enviar teste"}
          </Button>
        </div>
        {testMsg && <p className="text-xs text-text-muted">{testMsg}</p>}
      </Card>
    );
  }

  if (state === "prompt") {
    return (
      <Card className="flex items-center justify-between gap-3">
        <span className="text-sm text-text">Ativar lembretes das escalas</span>
        <Button variant="secondary" className="py-2 px-3 text-sm shrink-0" onClick={enable}>
          Ativar
        </Button>
      </Card>
    );
  }

  if (state === "denied") {
    return (
      <Card>
        <p className="text-sm text-text mb-1">Notificações bloqueadas</p>
        <p className="text-xs text-text-muted">
          O iPhone não pergunta de novo depois de bloqueado. Para liberar, vá em{" "}
          <span className="text-text font-semibold">Ajustes</span> →{" "}
          <span className="text-text font-semibold">Notificações</span> →{" "}
          <span className="text-text font-semibold">Getsemani</span> e ative{" "}
          <span className="text-text font-semibold">Permitir notificações</span>.
        </p>
      </Card>
    );
  }

  if (state === "ios-need-install") {
    return (
      <Card>
        <p className="text-sm text-text mb-1">Notificações</p>
        <p className="text-xs text-text-muted">
          Pra receber lembretes, adicione o app à Tela de Início: toque em{" "}
          <span className="text-text font-semibold">Compartilhar</span> e depois em{" "}
          <span className="text-text font-semibold">Adicionar à Tela de Início</span>.
        </p>
      </Card>
    );
  }

  if (state === "error") {
    return (
      <Card className="flex items-center justify-between gap-3">
        <span className="text-sm text-text-muted">Não deu pra ativar as notificações.</span>
        <Button variant="secondary" className="py-2 px-3 text-sm shrink-0" onClick={retry}>
          Tentar de novo
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm text-text mb-1">Notificações</p>
      <p className="text-xs text-text-muted">
        Este navegador não suporta notificações. Abra o app pelo Safari e adicione à Tela de
        Início.
      </p>
    </Card>
  );
}
