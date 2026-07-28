# Instalação do app: install nativo real + tutorial guiado no iOS

**Data:** 2026-07-28
**Status:** aprovado para planejamento

## Problema

O botão "Instalar" hoje quase nunca instala nada:

- **Android/Chrome:** o código já chama `beforeinstallprompt` (`src/hooks/useInstallPrompt.ts`), mas o evento provavelmente nunca dispara. O Service Worker só é registrado dentro de `PushRegister` (`app/(app)/PushRegister.tsx:45`), que só monta em `/perfil`, e ainda é pulado quando `NEXT_PUBLIC_VAPID_PUBLIC_KEY` está ausente. Além disso `public/sw.js` não tem handler de `fetch`, critério que o Chrome usa para considerar o app instalável. Resultado: o usuário cai no texto "procure no menu do navegador".
- **iOS/Safari:** não existe API de instalação programática. Nenhuma mudança de código faz o iPhone instalar com um toque. O caminho é Compartilhar → Adicionar à Tela de Início. O tutorial atual é uma lista estática de duas linhas, sem indicar onde fica o botão Compartilhar, e aparece igual em contexto onde instalar é impossível (navegador embutido do Instagram/WhatsApp).

## Objetivo

1. Onde a instalação nativa é possível (Android/Chrome, Edge, desktop), o botão deve realmente abrir o diálogo do sistema.
2. Onde não é possível (iOS), o tutorial deve guiar de fato: passo a passo visual, seta apontando para a barra do navegador, instrução correta por navegador e saída clara quando o usuário está num navegador embutido.

## Fora de escopo

- Perfil de configuração `.mobileconfig` / Web Clip — quebra Web Push e provavelmente a sessão autenticada.
- App nativo (Capacitor, App Store, TestFlight) — custo anual, fere a constituição de custo zero.

## Arquitetura

Três peças novas, todas dentro dos padrões atuais (client components em `app/(app)/`, primitivas em `src/ui/`, lógica pura em `src/lib/`).

### 1. `src/lib/platform.ts` (novo, puro, testável)

Função única sem dependência de `window`:

```ts
export type InstallPlatform = {
  os: "ios" | "android" | "desktop" | "other";
  browser: "safari" | "chrome-ios" | "firefox-ios" | "in-app" | "chromium" | "other";
  /** true quando beforeinstallprompt pode existir nesse contexto */
  supportsNativePrompt: boolean;
  /** onde o botão Compartilhar/menu fica na tela, para posicionar a seta */
  sharePosition: "bottom" | "top" | "none";
};

export function detectPlatform(ua: string, maxTouchPoints: number): InstallPlatform;
```

Regras:

- iOS = `/iPad|iPhone|iPod/` no UA, ou `Macintosh` com `maxTouchPoints > 1` (iPadOS 13+ se disfarça de Mac).
- Navegador embutido = UA contém `FBAN`, `FBAV`, `Instagram`, `Line`, `WhatsApp`, `Messenger` ou `; wv)`.
- `chrome-ios` = `CriOS`; `firefox-ios` = `FxiOS`; iOS restante = `safari`.
- `sharePosition`: `bottom` no iPhone Safari (barra inferior desde o iOS 15), `top` no iPad e no Chrome iOS (menu no topo), `none` fora do iOS.
- `supportsNativePrompt` = `false` em todo iOS e em navegador embutido; `true` em Chromium (Android/desktop).

A lógica de detecção sai de `useInstallPrompt.ts` e de `PushRegister.tsx`, que passam a importar daqui — hoje `isIOS`/`isStandalone` estão duplicados nos dois arquivos.

### 2. `app/(app)/ServiceWorkerRegister.tsx` (novo, sem UI)

Client component montado uma vez no layout de `(app)`. Registra `/sw.js` sempre que `"serviceWorker" in navigator`, sem depender de chave VAPID nem da rota `/perfil`. `PushRegister` deixa de registrar o SW e passa a usar `navigator.serviceWorker.ready`.

### 3. `public/sw.js`: handler de `fetch` com fallback offline

```js
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
});
```

`/offline.html` (estático, em `public/`) é pré-cacheado no `install`. A regra atual do projeto — não cachear HTML autenticado — continua valendo: só a página estática de offline entra no cache. `CACHE` sobe para `getsemani-v3`.

### 4. `app/(app)/InstallGuide.tsx` (novo, substitui o conteúdo duplicado)

Componente único de conteúdo, consumido pelo popup da Home e pela seção do Perfil. Renderiza um de quatro estados, decididos por `detectPlatform` + `canPrompt`:

| Estado | Quando | Conteúdo |
| --- | --- | --- |
| `native` | `canPrompt === true` | Botão "Instalar" que chama `promptInstall()` |
| `ios-guide` | iOS, navegador real | Passos guiados + seta animada |
| `in-app` | navegador embutido | "Abra no Safari para instalar" + botão "Copiar link" |
| `manual` | resto (desktop sem prompt, Android sem critério) | Texto atual de menu do navegador |

**Estado `ios-guide`:** ícone real do app (`/icons/icon-192.png`) no topo para reconhecimento, dois passos numerados com ícone (`Share`, `SquarePlus`), texto adaptado ao navegador — Safari: "toque em Compartilhar na barra do navegador"; Chrome iOS: "toque em ⋯ e depois em Compartilhar". Uma seta (`ChevronDown`/`ChevronUp` do lucide) ancorada em `fixed` no rodapé ou no topo conforme `sharePosition`, com animação de bounce do framer-motion (padrão já usado no projeto), respeitando `env(safe-area-inset-bottom)`. Botões: "Já instalei" (fecha e não mostra de novo) e "Agora não".

**Estado `in-app`:** o iOS não permite abrir o Safari programaticamente a partir de um navegador embutido. O componente instrui ("toque no menu ⋯ e escolha Abrir no navegador") e oferece `navigator.clipboard.writeText(location.origin)` com confirmação visual.

### 5. Reaproveitamento visual

`InstallPopup` deixa de ter modal próprio e passa a usar `src/ui/BottomSheet.tsx`, que já existe e já trata backdrop, arrasto e `data-no-swipe`. `InstallSection` (Perfil) renderiza o mesmo `InstallGuide` inline, sem sheet.

## Fluxo de dados

Não há servidor envolvido. Tudo é client-side:

```
layout (app) ──monta──> ServiceWorkerRegister ──registra──> /sw.js
                                                              │
                              beforeinstallprompt ◄───────────┘ (Chromium)
                                      │
                        useInstallPrompt (módulo compartilhado)
                                      │
                    ┌─────────────────┴─────────────────┐
              InstallPopup (Home)              InstallSection (Perfil)
                    └────────────┬────────────────────┘
                             InstallGuide  ← detectPlatform(navigator.userAgent, …)
```

## Reexibição do popup

Hoje `install-popup-seen` esconde o popup para sempre no primeiro dismiss. Passa a ser adiamento:

- Chave nova `install-popup-snooze` guarda timestamp em ms.
- "Agora não" / backdrop → adia 14 dias.
- "Já instalei" ou evento `appinstalled` → grava `install-popup-done`, nunca mais aparece.
- `isStandalone()` continua suprimindo tudo.
- A chave antiga `install-popup-seen` é ignorada. Consequência aceita: quem já dispensou o popup verá ele uma vez mais.

## Erros e degradação

- `promptInstall()` sem evento guardado retorna `"unavailable"` — o componente cai no estado `manual` em vez de travar.
- `navigator.clipboard` ausente ou negado → esconde o botão "Copiar link" e mostra a URL como texto selecionável.
- Falha ao registrar o SW é engolida (`.catch(() => {})`): a instalação nativa deixa de ser oferecida, o resto do app segue funcionando.
- Sem `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, push continua desligado, mas a instalação passa a funcionar — hoje as duas coisas estão acopladas.

## Testes

**Unitários (vitest, `tests/unit/platform.test.ts`)** — `detectPlatform` contra uma tabela de user agents reais: iPhone Safari, iPhone Chrome (`CriOS`), iPhone Instagram (`Instagram`), iPad iOS 17 (`Macintosh` + touch), Android Chrome, Android WebView (`; wv)`), Chrome desktop. Verifica `os`, `browser`, `supportsNativePrompt`, `sharePosition`.

**Unitários (vitest, `tests/unit/installPopup.test.ts`)** — `shouldShowInstallPopup`: suprime quando standalone, suprime quando concluído, suprime dentro dos 14 dias de adiamento, volta a mostrar depois, e fora do iOS só mostra quando há prompt nativo disponível.

**E2E** — não há suíte Playwright autenticada no projeto (`tests/e2e` não existe); criar fixtures de sessão Supabase só para este fluxo custaria mais que o valor entregue. Verificação fica manual.

**Manual** — Lighthouse categoria PWA em preview da Vercel para confirmar "Installable"; instalação real num Android; adição à Tela de Início num iPhone Safari; abrir o link dentro do Instagram e conferir o estado "abrir no Safari".

## Critérios de aceite

1. Android/Chrome em HTTPS: o botão "Instalar" abre o diálogo nativo do sistema.
2. Lighthouse reporta o app como instalável.
3. iPhone Safari: o guia mostra passos numerados com seta apontando para a barra inferior.
4. Navegador embutido do Instagram: o guia mostra "abrir no Safari" em vez de passos impossíveis.
5. SW é registrado em qualquer rota autenticada, mesmo sem chave VAPID.
6. Push continua funcionando como hoje após a mudança de registro do SW.
