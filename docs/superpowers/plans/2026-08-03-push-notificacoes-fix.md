# Correção das notificações push — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a seção "Notificações" do `/perfil` exibir o botão "Ativar" quando a permissão do navegador ainda é `"default"`, revalidar a assinatura de push a cada carregamento, e permitir disparar um push de teste para o próprio usuário.

**Architecture:** A decisão de qual estado exibir sai do componente e vira uma função pura em `src/lib/pushState.ts`, espelhando o padrão já usado por `src/lib/platform.ts` (`detectPlatform` puro + `currentPlatform` como wrapper do `navigator`). O componente `PushRegister` passa a consumir essa função, a re-postar a assinatura no mount, e a nunca renderizar `null`. Uma rota nova `POST /api/push/test` envia um push imediato para o próprio usuário.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Prisma, `web-push`, vitest.

**Spec:** `docs/superpowers/specs/2026-08-03-push-notificacoes-fix-design.md`

## Global Constraints

- Toda a interface em pt-BR: labels, mensagens de erro, textos de botão.
- Comentários no código em português, sem acentos (segue o estilo dos arquivos existentes em `src/lib/`).
- Cores apenas via tokens do tema (`bg-surface`, `text-text`, `text-text-muted`, `text-primary`, `border-border`…). Nunca cores cruas do Tailwind — o tema escuro (`.dark`) depende disso.
- Mobile-first, `max-w-md`.
- TypeScript strict. `npm run typecheck` e `npm run lint` devem passar.
- Commits em Conventional Commits, em pt-BR (`feat:`, `fix:`, `test:`).
- Não alterar: `public/sw.js`, `public/manifest.webmanifest`, `src/lib/push.ts`, `src/modules/notifications/services/notify.ts`, `app/api/push/subscribe/route.ts`, os crons, o schema Prisma.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `src/lib/pushState.ts` (novo) | Função pura que decide o estado de push a partir de capacidades + permissão. Sem DOM. |
| `tests/unit/pushState.test.ts` (novo) | Cobre a função pura, incluindo o caso que reproduz o bug. |
| `app/api/push/test/route.ts` (novo) | `POST` que dispara push de teste para o usuário da sessão. |
| `app/(app)/PushRegister.tsx` (modificar) | Consome `resolvePushState`, revalida a assinatura, renderiza um card em todos os estados. |

---

### Task 1: Função pura de estado de push

**Files:**
- Create: `src/lib/pushState.ts`
- Test: `tests/unit/pushState.test.ts`

**Interfaces:**
- Consumes: `InstallOS` de `src/lib/platform.ts` (tipo já existente: `"ios" | "android" | "desktop" | "other"`).
- Produces: `PushState`, `PushEnv`, `resolvePushState(env: PushEnv): PushState` — consumidos pela Task 3.

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/unit/pushState.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm run test -- tests/unit/pushState.test.ts`
Expected: FAIL — o módulo `@/lib/pushState` não existe ("Failed to resolve import").

- [ ] **Step 3: Implementar a função**

Criar `src/lib/pushState.ts`:

```ts
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
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm run test -- tests/unit/pushState.test.ts`
Expected: PASS, 10 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pushState.ts tests/unit/pushState.test.ts
git commit -m "feat: adicionar resolvePushState puro para estado de notificacoes"
```

---

### Task 2: Rota de push de teste

**Files:**
- Create: `app/api/push/test/route.ts`

**Interfaces:**
- Consumes: `getSessionUser` de `@/modules/identity/services/authz`; `sendPush(target, payload): Promise<boolean>` de `@/lib/push`; `prisma` de `@/lib/prisma`.
- Produces: `POST /api/push/test`, sem corpo de requisição. Respostas: `401 { error: "unauthenticated" }` ou `200 { ok: true, sent: number }`. Consumido pela Task 3.

Sem teste automatizado: a rota é I/O direto sobre `sendPush`, sem regra de negócio. A verificação é manual (Task 4).

- [ ] **Step 1: Criar a rota**

Criar `app/api/push/test/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { getSessionUser } from "@/modules/identity/services/authz";

export const dynamic = "force-dynamic";

// Push de teste: envia so para o proprio usuario da sessao. Nao aceita userId
// como parametro, entao ninguem dispara notificacao para outra pessoa.
// Nao passa por notifyUser: teste nao e notificacao de dominio e nao merece
// linha em Notification, dedupeKey, nem valor novo no enum NotificationType.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id } });

  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        const ok = await sendPush(
          { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
          { title: "Getsemani", body: "Notificação de teste ✓", url: "/perfil" },
        );
        // Assinatura expirada (410/404): remove, mesma logica de notify.ts.
        if (!ok) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        return ok;
      } catch {
        return false;
      }
    }),
  );

  return NextResponse.json({ ok: true, sent: results.filter(Boolean).length });
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/api/push/test/route.ts
git commit -m "feat: adicionar rota de push de teste para o proprio usuario"
```

---

### Task 3: Reescrever `PushRegister`

**Files:**
- Modify: `app/(app)/PushRegister.tsx` (arquivo inteiro)

**Interfaces:**
- Consumes: `resolvePushState`, `PushState` de `@/lib/pushState` (Task 1); `POST /api/push/test` (Task 2); `currentPlatform`, `isStandalone` de `@/lib/platform`; `Button`, `Card` de `@/ui/`.
- Produces: componente `PushRegister`, já importado em `app/(app)/perfil/page.tsx:11` e renderizado na linha 93. Nenhuma mudança necessária no `perfil/page.tsx`.

Sem teste automatizado: é client component dependente de DOM e Service Worker, e o vitest do projeto roda em `environment: "node"`, sem jsdom. Toda a lógica testável já foi extraída na Task 1.

- [ ] **Step 1: Substituir o conteúdo do arquivo**

Substituir todo o conteúdo de `app/(app)/PushRegister.tsx` por:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { currentPlatform, isStandalone } from "@/lib/platform";
import { resolvePushState, type PushState } from "@/lib/pushState";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

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
      syncSubscription().catch(() => setState("error"));
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
    try {
      await syncSubscription();
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
        setTestMsg("Nenhum dispositivo registrado neste aparelho.");
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
      await syncSubscription();
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
```

O `return` final cobre `unsupported`. Como `checking`, `granted`, `prompt`, `denied`, `ios-need-install` e `error` já retornaram acima, `unsupported` é o único estado restante — nenhum caminho retorna `null`.

- [ ] **Step 2: Verificar tipos, lint e a suíte inteira**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: sem erros; todos os testes passam, incluindo os 10 novos de `pushState`.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/PushRegister.tsx"
git commit -m "fix: mostrar botao de ativar notificacoes com permissao pendente"
```

---

### Task 4: Verificação no iPhone

**Files:** nenhum. Task de validação manual, feita pelo usuário após o deploy.

**Interfaces:**
- Consumes: tudo das Tasks 1–3, já em produção.

- [ ] **Step 1: Fazer o deploy**

```bash
git push origin master
```

Aguardar o build da Vercel concluir. O deploy sai por `git push` (regra da constituição).

- [ ] **Step 2: Reinstalar o PWA no iPhone**

Apagar o app da Tela de Início e adicioná-lo de novo pelo Safari (Compartilhar → Adicionar à Tela de Início).

Esse passo é necessário: se a permissão já tiver ido para `denied` sem que o usuário percebesse, o botão Ativar não resolve — o iOS bloqueia o novo prompt.

- [ ] **Step 3: Conferir que o botão aparece**

Abrir o app → `/perfil` → seção Notificações.
Expected: card com "Ativar lembretes das escalas" e botão **Ativar**. Antes da correção, essa seção ficava vazia.

- [ ] **Step 4: Conceder a permissão**

Tocar em **Ativar**.
Expected: prompt nativo do iOS aparece. Conceder. O card passa a "Notificações ativadas" com o botão **Enviar teste**.

- [ ] **Step 5: Disparar o teste com o app aberto**

Tocar em **Enviar teste**.
Expected: a mensagem "Enviada! Deve chegar em instantes." aparece abaixo, e a notificação chega no aparelho.

Se aparecer "Nenhum dispositivo registrado neste aparelho.", a assinatura não chegou ao banco — verificar a resposta de `/api/push/subscribe` nos logs da Vercel.

- [ ] **Step 6: Disparar o teste com o app em segundo plano**

Fechar o app, reabrir, tocar em **Enviar teste** e voltar imediatamente para a tela inicial do iPhone.
Expected: a notificação chega mesmo com o app fora de foco.

- [ ] **Step 7: Confirmar a revalidação automática**

Fechar e reabrir o app, ir em `/perfil`.
Expected: a seção mostra "Notificações ativadas" direto, sem pedir permissão de novo. O `syncSubscription()` do mount re-postou a assinatura silenciosamente.

---

## Cobertura da spec

| Requisito da spec | Task |
| --- | --- |
| `resolvePushState` puro, com a precedência definida | 1 |
| `"default"` → `prompt` (causa raiz) | 1 |
| Teste de regressão do bug | 1 |
| `syncSubscription` com POST sempre | 3 |
| Revalidação no mount quando `granted` | 3 |
| `enable()` com `try/catch` e estado `error` | 3 |
| `requestPermission` como primeira instrução (iOS) | 3 |
| Nenhum branch renderiza `null` | 3 |
| Instrução de Ajustes no estado `denied` | 3 |
| `POST /api/push/test` restrito ao próprio usuário | 2 |
| `sent: 0` quando não há assinatura | 2 + 3 |
| Remoção de assinatura expirada (410/404) | 2 |
| Verificação manual no iPhone | 4 |
