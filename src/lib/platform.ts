// Deteccao de plataforma para instalacao do PWA.
// Puro de proposito: `detectPlatform` recebe o user agent, entao da pra testar
// no vitest (environment: "node", sem window).

export type InstallOS = "ios" | "android" | "desktop" | "other";
export type InstallBrowser =
  | "safari"
  | "chrome-ios"
  | "firefox-ios"
  | "in-app"
  | "chromium"
  | "other";

export type InstallPlatform = {
  os: InstallOS;
  browser: InstallBrowser;
  /** true quando `beforeinstallprompt` pode existir nesse contexto */
  supportsNativePrompt: boolean;
  /** onde fica o botao Compartilhar/menu, pra apontar a seta do guia */
  sharePosition: "bottom" | "top" | "none";
};

// Navegadores embutidos de apps: nunca instalam PWA.
const IN_APP = /FBAN|FBAV|Instagram|Line\/|WhatsApp|Messenger|; wv\)/i;

export function detectPlatform(ua: string, maxTouchPoints = 0): InstallPlatform {
  const inApp = IN_APP.test(ua);
  // iPadOS 13+ manda user agent de Mac; o touch e o que denuncia.
  const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  const ios = /iPhone|iPod/.test(ua) || isIPad;
  const android = /Android/.test(ua);

  let browser: InstallBrowser = "other";
  if (inApp) browser = "in-app";
  else if (ios) {
    if (/CriOS/.test(ua)) browser = "chrome-ios";
    else if (/FxiOS/.test(ua)) browser = "firefox-ios";
    else browser = "safari";
  } else if (/Chrome|Chromium|Edg\//.test(ua)) browser = "chromium";

  let os: InstallOS = "other";
  if (ios) os = "ios";
  else if (android) os = "android";
  else if (/Windows|Macintosh|X11|Linux/.test(ua)) os = "desktop";

  const sharePosition: InstallPlatform["sharePosition"] = !ios
    ? "none"
    : browser === "safari" && !isIPad
      ? "bottom"
      : "top";

  return {
    os,
    browser,
    supportsNativePrompt: !ios && !inApp && browser === "chromium",
    sharePosition,
  };
}

export function currentPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return detectPlatform("", 0);
  return detectPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
