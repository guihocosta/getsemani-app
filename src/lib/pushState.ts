import type { InstallOS } from "./platform";

// Estados possiveis da secao de notificacoes. "checking" e "error" nao saem de
// resolvePushState — pertencem ao ciclo de vida do componente.
export type PushState =
  | "checking"
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported"
  | "ios-need-install"
  | "error";

export type PushEnv = {
  os: InstallOS;
  standalone: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  hasVapidKey: boolean;
  permission: "default" | "granted" | "denied";
};

// Puro de proposito, igual detectPlatform: da pra testar no vitest sem DOM.
export function resolvePushState(env: PushEnv): PushState {
  // iOS 16.4+ so entrega Web Push em PWA instalado na Tela de Inicio.
  if (env.os === "ios" && !env.standalone) return "ios-need-install";

  if (
    !env.hasServiceWorker ||
    !env.hasPushManager ||
    !env.hasNotification ||
    !env.hasVapidKey
  ) {
    return "unsupported";
  }

  if (env.permission === "granted") return "granted";
  if (env.permission === "denied") return "denied";
  // "default" = nunca respondido. Precisa mostrar o botao que dispara o prompt.
  return "prompt";
}
