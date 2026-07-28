import { describe, it, expect } from "vitest";
import { detectPlatform } from "@/lib/platform";

// User agents reais coletados de aparelhos/navegadores em uso.
const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1",
  iphoneFirefox:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15",
  iphoneInstagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 336.0.0.25.90",
  ipadOS:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  androidWebview:
    "Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36",
  desktopChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

describe("detectPlatform — instalacao do PWA", () => {
  it("iPhone Safari: guia com seta na barra de baixo, sem prompt nativo", () => {
    const p = detectPlatform(UA.iphoneSafari, 5);
    expect(p.os).toBe("ios");
    expect(p.browser).toBe("safari");
    expect(p.supportsNativePrompt).toBe(false);
    expect(p.sharePosition).toBe("bottom");
  });

  it("iPhone Chrome: menu fica no topo", () => {
    const p = detectPlatform(UA.iphoneChrome, 5);
    expect(p.browser).toBe("chrome-ios");
    expect(p.sharePosition).toBe("top");
  });

  it("iPhone Firefox e reconhecido", () => {
    expect(detectPlatform(UA.iphoneFirefox, 5).browser).toBe("firefox-ios");
  });

  it("navegador embutido do Instagram: nao da pra instalar", () => {
    const p = detectPlatform(UA.iphoneInstagram, 5);
    expect(p.os).toBe("ios");
    expect(p.browser).toBe("in-app");
    expect(p.supportsNativePrompt).toBe(false);
  });

  it("iPadOS se disfarca de Mac: touch revela que e iOS", () => {
    const p = detectPlatform(UA.ipadOS, 5);
    expect(p.os).toBe("ios");
    expect(p.browser).toBe("safari");
    expect(p.sharePosition).toBe("top"); // no iPad a barra fica em cima
  });

  it("Mac de verdade (sem touch) nao vira iOS", () => {
    expect(detectPlatform(UA.ipadOS, 0).os).toBe("desktop");
  });

  it("Android Chrome: prompt nativo disponivel", () => {
    const p = detectPlatform(UA.androidChrome, 5);
    expect(p.os).toBe("android");
    expect(p.browser).toBe("chromium");
    expect(p.supportsNativePrompt).toBe(true);
    expect(p.sharePosition).toBe("none");
  });

  it("WebView do Android nao suporta prompt nativo", () => {
    const p = detectPlatform(UA.androidWebview, 5);
    expect(p.browser).toBe("in-app");
    expect(p.supportsNativePrompt).toBe(false);
  });

  it("Chrome desktop suporta prompt nativo", () => {
    const p = detectPlatform(UA.desktopChrome, 0);
    expect(p.os).toBe("desktop");
    expect(p.supportsNativePrompt).toBe(true);
  });
});
