import { describe, it, expect } from "vitest";
import { resolvePushState, type PushEnv } from "@/lib/pushState";

// Cenario base: iPhone com PWA instalado, tudo suportado, permissao nao respondida.
const base: PushEnv = {
  os: "ios",
  standalone: true,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  hasVapidKey: true,
  permission: "default",
};

describe("resolvePushState", () => {
  // Regressao: com permissao "default" o componente antigo ficava em "idle" e
  // renderizava null, entao o botao "Ativar" nunca aparecia e o prompt do iOS
  // nunca era exibido.
  it('permissao "default" com tudo suportado pede o prompt', () => {
    expect(resolvePushState(base)).toBe("prompt");
  });

  it('permissao "granted" fica ativada', () => {
    expect(resolvePushState({ ...base, permission: "granted" })).toBe("granted");
  });

  it('permissao "denied" fica bloqueada', () => {
    expect(resolvePushState({ ...base, permission: "denied" })).toBe("denied");
  });

  it("iOS fora do standalone pede instalacao, mesmo com permissao concedida", () => {
    expect(
      resolvePushState({ ...base, standalone: false, permission: "granted" }),
    ).toBe("ios-need-install");
  });

  it("Android fora do standalone segue normalmente", () => {
    expect(resolvePushState({ ...base, os: "android", standalone: false })).toBe("prompt");
  });

  it("sem chave VAPID fica sem suporte, mesmo com permissao concedida", () => {
    expect(
      resolvePushState({ ...base, hasVapidKey: false, permission: "granted" }),
    ).toBe("unsupported");
  });

  it("sem service worker fica sem suporte", () => {
    expect(resolvePushState({ ...base, hasServiceWorker: false })).toBe("unsupported");
  });

  it("sem PushManager fica sem suporte", () => {
    expect(resolvePushState({ ...base, hasPushManager: false })).toBe("unsupported");
  });

  it("sem Notification fica sem suporte", () => {
    expect(resolvePushState({ ...base, hasNotification: false })).toBe("unsupported");
  });

  it("instalacao no iOS tem precedencia sobre falta de suporte", () => {
    expect(
      resolvePushState({ ...base, standalone: false, hasPushManager: false }),
    ).toBe("ios-need-install");
  });
});
