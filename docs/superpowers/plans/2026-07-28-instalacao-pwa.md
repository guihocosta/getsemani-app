# Instalação PWA: install nativo real + tutorial guiado no iOS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o botão "Instalar" abrir o diálogo nativo do sistema onde isso é possível (Chromium) e, no iOS, substituir a lista estática de instruções por um guia passo a passo que reconhece o navegador do usuário.

**Architecture:** Toda a detecção de plataforma vira uma função pura em `src/lib/platform.ts`, coberta por testes com user agents reais. O Service Worker passa a ser registrado num componente próprio montado no layout de `(app)` e ganha um handler de `fetch` — os dois critérios que hoje impedem o Chrome de disparar `beforeinstallprompt`. Um único componente `InstallGuide` concentra os quatro estados possíveis de instalação e é consumido tanto pelo popup da Home quanto pela seção do Perfil.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4 (tokens do tema), framer-motion, lucide-react, vitest.

**Spec:** `docs/superpowers/specs/2026-07-28-instalacao-pwa-design.md`

## Global Constraints

- Toda a interface é em pt-BR. Comentários no código também.
- Cores só via tokens do tema (`bg-surface`, `bg-surface-2`, `text-text`, `text-text-muted`, `text-primary`, `ring-border`, `bg-accent-soft`) — nunca cores cruas do Tailwind, senão o tema escuro (`.dark`) quebra.
- Mobile-first, `max-w-md`.
- Commits em Conventional Commits pt-BR (`feat: adicionar…`, `fix: corrigir…`, `refactor: …`, `test: …`).
- Aliases: `@/*` → `src/*`, `@app/*` → `app/*`.
- Testes unitários rodam em `environment: "node"` (`vitest.config.ts`) — só testar funções puras, sem `window`/`navigator`.
- Componentes que usam hooks ou eventos de browser precisam de `"use client"` no topo.
- Rodar `npm run typecheck` antes de cada commit.

---

## File Structure

**Criar:**
- `src/lib/platform.ts` — detecção pura de SO/navegador/posição do botão Compartilhar + helpers que leem `navigator`.
- `src/lib/installPopup.ts` — chaves de localStorage e regra pura de quando exibir o popup.
- `tests/unit/platform.test.ts` — tabela de user agents.
- `tests/unit/installPopup.test.ts` — regra de adiamento.
- `app/(app)/ServiceWorkerRegister.tsx` — registra `/sw.js`, sem UI.
- `app/(app)/InstallGuide.tsx` — os quatro estados de instalação.
- `public/offline.html` — página estática de fallback offline.

**Modificar:**
- `public/sw.js` — handler de `fetch` + pré-cache do offline + `CACHE` v3.
- `app/(app)/layout.tsx` — montar `ServiceWorkerRegister`.
- `app/(app)/PushRegister.tsx` — parar de registrar o SW, usar `platform.ts`.
- `src/hooks/useInstallPrompt.ts` — expor `platform`, remover detecção duplicada.
- `app/(app)/InstallPopup.tsx` — usar `BottomSheet` + `InstallGuide` + adiamento.
- `app/(app)/perfil/InstallSection.tsx` — usar `InstallGuide`.

---

### Task 1: Detecção de plataforma

**Files:**
- Create: `src/lib/platform.ts`
- Test: `tests/unit/platform.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type InstallOS = "ios" | "android" | "desktop" | "other"`
  - `type InstallBrowser = "safari" | "chrome-ios" | "firefox-ios" | "in-app" | "chromium" | "other"`
  - `type InstallPlatform = { os: InstallOS; browser: InstallBrowser; supportsNativePrompt: boolean; sharePosition: "bottom" | "top" | "none" }`
  - `detectPlatform(ua: string, maxTouchPoints?: number): InstallPlatform`
  - `currentPlatform(): InstallPlatform`
  - `isStandalone(): boolean`

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/unit/platform.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm run test -- tests/unit/platform.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/platform"`.

- [ ] **Step 3: Implementar `src/lib/platform.ts`**

```ts
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
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm run test -- tests/unit/platform.test.ts`
Expected: PASS, 9 testes.

- [ ] **Step 5: Typecheck e commit**

```bash
npm run typecheck
git add src/lib/platform.ts tests/unit/platform.test.ts
git commit -m "feat(pwa): adicionar deteccao de plataforma para instalacao"
```

---

### Task 2: Regra de exibição do popup (adiamento de 14 dias)

**Files:**
- Create: `src/lib/installPopup.ts`
- Test: `tests/unit/installPopup.test.ts`

**Interfaces:**
- Consumes: `InstallOS` de `@/lib/platform` (Task 1).
- Produces:
  - `SNOOZE_MS: number`
  - `SNOOZE_KEY = "install-popup-snooze"`, `DONE_KEY = "install-popup-done"`
  - `shouldShowInstallPopup(input: { standalone: boolean; done: boolean; snoozedAt: number | null; now: number; canPrompt: boolean; os: InstallOS }): boolean`

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/unit/installPopup.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shouldShowInstallPopup, SNOOZE_MS } from "@/lib/installPopup";

const base = {
  standalone: false,
  done: false,
  snoozedAt: null as number | null,
  now: 1_800_000_000_000,
  canPrompt: true,
  os: "android" as const,
};

describe("shouldShowInstallPopup", () => {
  it("nao mostra quando o app ja esta instalado", () => {
    expect(shouldShowInstallPopup({ ...base, standalone: true })).toBe(false);
  });

  it("nao mostra quando o usuario marcou que ja instalou", () => {
    expect(shouldShowInstallPopup({ ...base, done: true })).toBe(false);
  });

  it("nao mostra dentro da janela de adiamento", () => {
    const snoozedAt = base.now - (SNOOZE_MS - 1000);
    expect(shouldShowInstallPopup({ ...base, snoozedAt })).toBe(false);
  });

  it("volta a mostrar depois do adiamento", () => {
    const snoozedAt = base.now - (SNOOZE_MS + 1000);
    expect(shouldShowInstallPopup({ ...base, snoozedAt })).toBe(true);
  });

  it("fora do iOS so mostra quando ha prompt nativo disponivel", () => {
    expect(shouldShowInstallPopup({ ...base, canPrompt: false })).toBe(false);
  });

  it("no iOS mostra mesmo sem prompt nativo (guia manual)", () => {
    expect(shouldShowInstallPopup({ ...base, os: "ios", canPrompt: false })).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm run test -- tests/unit/installPopup.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/installPopup"`.

- [ ] **Step 3: Implementar `src/lib/installPopup.ts`**

```ts
import type { InstallOS } from "./platform";

// "Agora nao" adia por 14 dias em vez de esconder pra sempre.
export const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
export const SNOOZE_KEY = "install-popup-snooze";
export const DONE_KEY = "install-popup-done";

export function shouldShowInstallPopup(input: {
  standalone: boolean;
  done: boolean;
  snoozedAt: number | null;
  now: number;
  canPrompt: boolean;
  os: InstallOS;
}): boolean {
  if (input.standalone || input.done) return false;
  if (input.snoozedAt !== null && input.now - input.snoozedAt < SNOOZE_MS) return false;
  // No iOS nunca existe prompt nativo: o popup e o proprio guia manual.
  if (input.os === "ios") return true;
  return input.canPrompt;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm run test -- tests/unit/installPopup.test.ts`
Expected: PASS, 6 testes.

- [ ] **Step 5: Typecheck e commit**

```bash
npm run typecheck
git add src/lib/installPopup.ts tests/unit/installPopup.test.ts
git commit -m "feat(pwa): adicionar regra de adiamento do popup de instalacao"
```

---

### Task 3: Service Worker registrado em todo o app

**Files:**
- Create: `app/(app)/ServiceWorkerRegister.tsx`
- Modify: `app/(app)/layout.tsx`
- Modify: `app/(app)/PushRegister.tsx:16-25` (remove `isIOS`/`isStandalone` locais), `app/(app)/PushRegister.tsx:31-48` (remove `register`)

**Interfaces:**
- Consumes: `currentPlatform`, `isStandalone` de `@/lib/platform` (Task 1).
- Produces: componente `ServiceWorkerRegister` (sem props, sem UI).

- [ ] **Step 1: Criar `app/(app)/ServiceWorkerRegister.tsx`**

```tsx
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
```

- [ ] **Step 2: Montar no layout**

Em `app/(app)/layout.tsx`, adicionar o import junto dos outros e renderizar dentro do `AppShell`:

```tsx
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
```

```tsx
    <AppShell isAdmin={user.isAdmin} isLeader={isLeader} pendingCount={pendingCount}>
      <ServiceWorkerRegister />
      {children}
    </AppShell>
```

- [ ] **Step 3: Tirar o registro do `PushRegister`**

Em `app/(app)/PushRegister.tsx`: apagar as funções locais `isIOS` e `isStandalone` (linhas 16-25) e importar de `@/lib/platform`:

```tsx
import { currentPlatform, isStandalone } from "@/lib/platform";
```

Trocar o `useEffect` (linhas 31-48) por:

```tsx
  useEffect(() => {
    if (currentPlatform().os === "ios" && !isStandalone()) {
      setState("ios-need-install");
      return;
    }
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      typeof Notification === "undefined" ||
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    ) {
      setState("unsupported");
      return;
    }
    // O SW e registrado pelo ServiceWorkerRegister no layout; aqui so lemos a permissao.
    if (Notification.permission === "granted") setState("granted");
    if (Notification.permission === "denied") setState("denied");
  }, []);
```

`enable()` continua igual — `navigator.serviceWorker.ready` resolve com o registro feito pelo layout.

- [ ] **Step 4: Verificar**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: sem erros; suíte unitária toda verde.

Run: `npm run dev`, abrir `http://localhost:3000` logado, DevTools → Application → Service Workers.
Expected: `/sw.js` ativado já na Home, sem passar pelo `/perfil`.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/ServiceWorkerRegister.tsx app/\(app\)/layout.tsx app/\(app\)/PushRegister.tsx
git commit -m "fix(pwa): registrar service worker em todas as rotas do app"
```

---

### Task 4: Handler de `fetch` no Service Worker + página offline

**Files:**
- Create: `public/offline.html`
- Modify: `public/sw.js:2` (versão do cache), `public/sw.js:4-16` (install/activate), fim do arquivo (novo handler)

**Interfaces:**
- Consumes: nada.
- Produces: `/offline.html` disponível offline; SW com handler de `fetch` (critério de instalabilidade do Chrome).

- [ ] **Step 1: Criar `public/offline.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sem conexão · Getsemani</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        background: #f8fafc;
        color: #0f172a;
        text-align: center;
        padding: 24px;
      }
      p {
        margin: 0;
        color: #64748b;
        font-size: 14px;
      }
      @media (prefers-color-scheme: dark) {
        body {
          background: #0f172a;
          color: #f8fafc;
        }
        p {
          color: #94a3b8;
        }
      }
    </style>
  </head>
  <body>
    <img src="/icons/icon-192.png" alt="" width="64" height="64" />
    <h1>Sem conexão</h1>
    <p>Conecte-se à internet para ver suas escalas.</p>
  </body>
</html>
```

- [ ] **Step 2: Atualizar `public/sw.js`**

Trocar a versão do cache na linha 2:

```js
const CACHE = "getsemani-v3";
```

Trocar o handler de `install` (linhas 4-6) por um que pré-cacheia a página offline:

```js
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/offline.html", "/icons/icon-192.png"])));
  self.skipWaiting();
});
```

Adicionar no fim do arquivo, substituindo o comentário final:

```js
// Handler de fetch: o Chrome so considera o app instalavel se o SW tiver um.
// Continua sem cachear HTML autenticado (paginas sao force-dynamic) — so
// intercepta navegacao pra servir a pagina estatica de offline quando a rede cai.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
});
```

- [ ] **Step 3: Verificar no navegador**

Run: `npm run dev`, abrir logado, DevTools → Application → Service Workers → marcar **Update on reload**, recarregar.
Expected: SW `getsemani-v3` ativo; caches antigos sumiram em Cache Storage.

DevTools → Network → Offline, recarregar.
Expected: aparece "Sem conexão", não o dinossauro do Chrome.

- [ ] **Step 4: Confirmar instalabilidade**

Run: DevTools → Application → Manifest.
Expected: nenhum erro em "Installability"; o menu do Chrome mostra "Instalar Getsemani".

- [ ] **Step 5: Commit**

```bash
git add public/sw.js public/offline.html
git commit -m "feat(pwa): adicionar handler de fetch e pagina offline ao service worker"
```

---

### Task 5: `useInstallPrompt` expõe a plataforma

**Files:**
- Modify: `src/hooks/useInstallPrompt.ts` (arquivo inteiro)

**Interfaces:**
- Consumes: `currentPlatform`, `isStandalone`, `InstallPlatform` de `@/lib/platform` (Task 1).
- Produces: `useInstallPrompt(): { canPrompt: boolean; isStandalone: boolean; platform: InstallPlatform; promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable"> }`.

Nota: `isIOS` e `isStandalone` deixam de ser exportados daqui — quem precisa importa de `@/lib/platform`.

- [ ] **Step 1: Reescrever o hook**

Conteúdo completo de `src/hooks/useInstallPrompt.ts`:

```ts
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
```

- [ ] **Step 2: Confirmar que o typecheck quebra nos consumidores**

Run: `npm run typecheck`
Expected: FAIL apontando `isIOS` inexistente em `app/(app)/InstallPopup.tsx` e `app/(app)/perfil/InstallSection.tsx`. Esses dois arquivos são reescritos nas Tasks 7 e 8 — seguir sem consertá-los agora.

- [ ] **Step 3: Commit (junto com a Task 6)**

Não commitar isolado: o typecheck está vermelho. Seguir direto para a Task 6 e commitar as duas juntas no passo final dela.

---

### Task 6: Componente `InstallGuide`

**Files:**
- Create: `app/(app)/InstallGuide.tsx`

**Interfaces:**
- Consumes: `useInstallPrompt` (Task 5), `InstallPlatform` de `@/lib/platform` (Task 1), `Button` de `@/ui/Button`.
- Produces: `InstallGuide({ onDone, onSnooze }: { onDone: () => void; onSnooze?: () => void })` — componente client que renderiza o estado certo e chama `onDone()` quando o usuário instala ou diz que já instalou.

- [ ] **Step 1: Criar `app/(app)/InstallGuide.tsx`**

```tsx
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
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck && npm run lint`
Expected: `InstallGuide` limpo. Ainda falha em `InstallPopup.tsx`/`InstallSection.tsx` (Tasks 7 e 8 pendentes) — normal nesta etapa.

- [ ] **Step 3: Commit junto com a Task 5**

Este commit fecha o hook e o componente novo:

```bash
git add src/hooks/useInstallPrompt.ts app/\(app\)/InstallGuide.tsx
git commit -m "feat(pwa): criar guia de instalacao por plataforma"
```

---

### Task 7: Popup da Home com bottom sheet e adiamento

**Files:**
- Modify: `app/(app)/InstallPopup.tsx` (arquivo inteiro)

**Interfaces:**
- Consumes: `BottomSheet` de `@/ui/BottomSheet`, `InstallGuide` (Task 6), `useInstallPrompt` (Task 5), `shouldShowInstallPopup`/`SNOOZE_KEY`/`DONE_KEY` de `@/lib/installPopup` (Task 2).
- Produces: `InstallPopup` (sem props), já montado em `app/(app)/page.tsx:47`.

- [ ] **Step 1: Reescrever `app/(app)/InstallPopup.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/ui/BottomSheet";
import { InstallGuide } from "./InstallGuide";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { shouldShowInstallPopup, SNOOZE_KEY, DONE_KEY } from "@/lib/installPopup";

export function InstallPopup() {
  const { canPrompt, isStandalone, platform } = useInstallPrompt();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(SNOOZE_KEY);
    const show = shouldShowInstallPopup({
      standalone: isStandalone,
      done: localStorage.getItem(DONE_KEY) === "1",
      snoozedAt: raw ? Number(raw) : null,
      now: Date.now(),
      canPrompt,
      os: platform.os,
    });
    if (!show) return;

    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [isStandalone, canPrompt, platform.os]);

  function snooze() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setOpen(false);
  }

  function done() {
    localStorage.setItem(DONE_KEY, "1");
    setOpen(false);
  }

  return (
    <BottomSheet open={open} onClose={snooze}>
      <InstallGuide onDone={done} onSnooze={snooze} />
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Verificar no navegador**

Run: `npm run dev`, abrir a Home logado com DevTools → Application → Local Storage limpo de `install-popup-*`, e Device Toolbar em iPhone (com UA override de iOS).
Expected: sheet sobe depois de ~1,2s com os 3 passos e a etiqueta "aqui embaixo ↓" no rodapé.

Clicar "Agora não", recarregar.
Expected: não reabre; `install-popup-snooze` gravado com o timestamp.

- [ ] **Step 3: Commit**

```bash
npm run typecheck
git add app/\(app\)/InstallPopup.tsx
git commit -m "feat(pwa): usar bottom sheet e adiamento de 14 dias no popup de instalacao"
```

---

### Task 8: Seção do Perfil

**Files:**
- Modify: `app/(app)/perfil/InstallSection.tsx` (arquivo inteiro)

**Interfaces:**
- Consumes: `InstallGuide` (Task 6), `useInstallPrompt` (Task 5), `Card` de `@/ui/Card`, `DONE_KEY` de `@/lib/installPopup` (Task 2).
- Produces: `InstallSection` (sem props), já montado em `app/(app)/perfil/page.tsx:109`.

- [ ] **Step 1: Reescrever `app/(app)/perfil/InstallSection.tsx`**

```tsx
"use client";

import { CheckCircle2 } from "lucide-react";
import { Card } from "@/ui/Card";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { InstallGuide } from "../InstallGuide";
import { DONE_KEY } from "@/lib/installPopup";

export function InstallSection() {
  const { isStandalone } = useInstallPrompt();

  if (isStandalone) {
    return (
      <Card className="flex items-center gap-3">
        <CheckCircle2 size={20} className="text-primary shrink-0" strokeWidth={1.8} />
        <p className="text-sm text-text-muted">App instalado na Tela de Início</p>
      </Card>
    );
  }

  // No Perfil o guia fica sempre visível: nao ha o que adiar, so marcar como feito.
  return (
    <Card>
      <InstallGuide onDone={() => localStorage.setItem(DONE_KEY, "1")} />
    </Card>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: tudo verde, incluindo os arquivos que ficaram vermelhos desde a Task 5.

Run: `npm run dev`, abrir `/perfil`.
Expected: em Chrome desktop com o app instalável, aparece o botão "Instalar" que abre o diálogo do sistema; com UA de iPhone, aparecem os 3 passos.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/perfil/InstallSection.tsx
git commit -m "feat(pwa): usar guia unificado de instalacao no perfil"
```

---

### Task 9: Verificação final

**Files:** nenhum arquivo alterado, a menos que algo quebre.

- [ ] **Step 1: Suíte completa**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: os quatro comandos passam. Colar a saída no relatório — sem saída, não está verificado.

- [ ] **Step 2: Checklist manual de instalabilidade**

Com `npm run build && npm run start` (ou preview da Vercel, que é HTTPS de verdade):

1. Chrome desktop → DevTools → Application → Manifest: sem erros de installability.
2. Chrome desktop → menu → "Instalar Getsemani" disponível; o botão do app abre o mesmo diálogo.
3. Lighthouse → categoria PWA: "Installable" verde.
4. Android Chrome (via preview da Vercel): botão "Instalar" abre o diálogo do sistema e o ícone aparece na gaveta de apps.
5. iPhone Safari: sheet mostra 3 passos + etiqueta apontando pra barra de baixo; seguir os passos adiciona o ícone.
6. Abrir o link da preview dentro do Instagram: aparece "Abrir no navegador" + "Copiar link", não os passos do iOS.
7. Rota `/perfil` com push já concedido: notificações continuam marcadas como "Ativadas" (o SW mudou de lugar, não de comportamento).

- [ ] **Step 3: Reportar**

Listar o que passou e o que não deu pra testar (ex.: sem aparelho iOS à mão). Não afirmar item verificado sem ter rodado.

---

## Notas de migração

- A chave antiga `install-popup-seen` deixa de ser lida. Quem já dispensou o popup verá ele mais uma vez — decisão registrada na spec.
- `useInstallPrompt` não exporta mais `isIOS`/`isStandalone`. Qualquer código novo importa de `@/lib/platform`.
- O SW pulou de `getsemani-v2` para `v3`: o `activate` já existente apaga os caches antigos.
