# Correção das notificações push (Web Push / iOS PWA)

Data: 2026-08-03
Status: aprovado, pronto para plano de implementação

## Problema

No app publicado na Vercel, instalado como PWA no iPhone, a seção "Notificações"
do `/perfil` aparece vazia e o prompt de permissão do iOS nunca é exibido.

As três variáveis de ambiente de push (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) estão configuradas em Production, então o
problema não é de configuração.

## Causa raiz

`app/(app)/PushRegister.tsx` deriva o estado a partir de `Notification.permission`,
mas só trata dois valores:

```ts
if (Notification.permission === "granted") setState("granted");
if (Notification.permission === "denied") setState("denied");
```

Quando a permissão é `"default"` — o caso de quem nunca respondeu ao prompt — o
estado permanece `"idle"`. E o render descarta esse estado:

```ts
if (state === "unsupported" || state === "idle") return null;
```

Resultado: o botão "Ativar" nunca é renderizado, o `Notification.requestPermission()`
nunca é chamado e o prompt do iOS nunca aparece. O cabeçalho "Notificações" em
`app/(app)/perfil/page.tsx:91` é renderizado pelo Server Component
incondicionalmente, então a seção fica visivelmente vazia.

## Defeitos secundários

1. **A assinatura nunca é revalidada.** `enable()` é o único caminho que chama
   `POST /api/push/subscribe`. Quando o estado é `granted`, o componente exibe
   "Ativadas" sem verificar se existe uma `PushSubscription` correspondente no
   banco. O iOS descarta a assinatura ao reinstalar o PWA ou após longos períodos
   sem uso, e `notify.ts:47` apaga a linha ao receber 410/404. Nesses casos o card
   afirma que as notificações estão ativas enquanto nenhum push é entregue.

2. **`enable()` não trata erros.** Uma falha em `pushManager.subscribe()` ou no
   POST deixa o estado congelado, sem sinal para o usuário.

3. **`unsupported` também renderiza `null`,** produzindo a mesma seção vazia sob
   um cabeçalho que sempre aparece.

## Escopo

Estão corretos e não serão alterados: `public/sw.js`, `public/manifest.webmanifest`
(`display: standalone`), `src/lib/push.ts`, `src/modules/notifications/services/notify.ts`,
`app/api/push/subscribe/route.ts`, o cron de lembretes e o schema Prisma.

A correção é inteiramente no cliente, mais uma rota nova de teste.

## Design

### 1. `src/lib/pushState.ts` (novo)

A decisão de estado vira uma função pura, espelhando o padrão já usado em
`src/lib/platform.ts` (`detectPlatform` puro + `currentPlatform` como wrapper do
`navigator`). Isso permite testar em vitest sem DOM.

```ts
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

export function resolvePushState(env: PushEnv): PushState;
```

Precedência:

1. `os === "ios" && !standalone` → `ios-need-install`
2. falta `hasServiceWorker`, `hasPushManager`, `hasNotification` ou `hasVapidKey`
   → `unsupported`
3. permissão: `"default"` → `prompt`, `"granted"` → `granted`, `"denied"` → `denied`

`"default"` mapeia para `prompt`, e não para um estado mudo. É a correção do
defeito principal.

`checking` e `error` não são produzidos por `resolvePushState`; pertencem ao ciclo
de vida do componente.

### 2. `app/(app)/PushRegister.tsx`

**Helper compartilhado:**

```ts
async function syncSubscription() {
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(KEY),
    }));
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sub),
  });
  if (!res.ok) throw new Error("SUBSCRIBE_FAILED");
}
```

O POST acontece sempre, mesmo quando `getSubscription()` já devolveu uma
assinatura existente. O `upsert` por `endpoint` em `subscribe/route.ts:18` é
idempotente, então repetir o POST é barato — e é o que recria a linha que
`notify.ts:47` apagou ao receber 410.

**No mount:** o estado inicial é `checking`; o efeito calcula
`resolvePushState(...)` a partir do `navigator`/`window` e aplica. Quando o
resultado é `granted`, dispara `syncSubscription()` em background; se rejeitar,
o estado passa a `error`. Isso corrige o defeito secundário 1.

**`enable()` (onClick):** `Notification.requestPermission()` é a primeira
instrução, sem nenhum `await` antes dela — o iOS só aceita o prompt dentro do
gesto direto do usuário. Se a permissão não for concedida, o estado vira `denied`.
Concedida, chama `syncSubscription()` dentro de `try/catch`, resultando em
`granted` ou `error`.

**Render.** Nenhum branch retorna `null`; a seção nunca fica vazia:

| estado             | conteúdo do card                                                        |
| ------------------ | ----------------------------------------------------------------------- |
| `checking`         | "Verificando…"                                                          |
| `prompt`           | "Ativar lembretes das escalas" + botão **Ativar**                       |
| `granted`          | "Ativadas" + botão **Enviar teste**                                     |
| `denied`           | "Bloqueadas" + instrução: Ajustes → Notificações → Getsemani            |
| `unsupported`      | "Não disponível neste navegador"                                        |
| `ios-need-install` | texto atual (Compartilhar → Adicionar à Tela de Início)                 |
| `error`            | mensagem de falha + botão **Tentar de novo**                            |

O estado `denied` traz a instrução explícita porque o iOS não permite perguntar
de novo depois de uma negativa — o único caminho é pelos Ajustes do sistema.

Todos os textos em pt-BR; cores apenas via tokens do tema.

### 3. `app/api/push/test/route.ts` (novo)

`POST`, sem corpo.

- `getSessionUser()`; responde 401 sem sessão. Envia somente para o próprio
  usuário — não aceita `userId` como parâmetro, então ninguém dispara push para
  outra pessoa.
- Carrega `prisma.pushSubscription.findMany({ where: { userId: user.id } })`.
- Nenhuma linha → `{ ok: true, sent: 0 }`. A UI mostra "Nenhum dispositivo
  registrado" e volta a oferecer **Ativar**. Esse é exatamente o sintoma do
  defeito secundário 1, e o teste o expõe em vez de escondê-lo.
- Para cada assinatura, chama `sendPush(sub, { title: "Getsemani", body:
  "Notificação de teste ✓", url: "/perfil" })`. Retorno `false` (410/404) apaga a
  linha, mesma lógica de `notify.ts:47`.
- Responde `{ ok: true, sent: <número de envios bem-sucedidos> }`.

A rota não passa por `notifyUser`: um teste não é notificação de domínio e não
justifica linha em `Notification`, `dedupeKey`, nem um valor novo no enum
`NotificationType` (hoje `ASSIGNMENT | REMINDER | SWAP`).

Por ficar em `app/api/push/`, junto de `subscribe`, a rota está fora do matcher de
cron do middleware e recebe o cookie de sessão normalmente.

## Testes

**`tests/unit/pushState.test.ts` (novo)** — cobre a função pura, sem DOM, no molde
de `platform.test.ts`:

- iOS fora do standalone → `ios-need-install`, mesmo com permissão `granted`
- `hasVapidKey: false` → `unsupported`, com precedência sobre a permissão
- suporte completo + `permission: "default"` → `prompt` — este é o teste que
  reproduz o bug corrigido
- `granted` → `granted`; `denied` → `denied`
- precedência entre os três blocos: `ios-need-install` antes de `unsupported`,
  `unsupported` antes da permissão

Não haverá teste unitário para `PushRegister` (client component dependente de DOM
e Service Worker; o projeto não tem jsdom configurado no vitest e montar essa
infraestrutura para um componente não se paga) nem para a rota de teste (I/O direto
sobre `sendPush`).

## Verificação manual (iPhone, após deploy)

1. Apagar o PWA da tela de início e reinstalá-lo. Isso limpa a permissão presa em
   `default` e força um Service Worker novo.
2. Abrir `/perfil`. A seção Notificações deve exibir o botão **Ativar**.
3. Tocar em Ativar. O prompt nativo do iOS deve aparecer; conceder.
4. O card passa a "Ativadas". Tocar em **Enviar teste**; a notificação deve chegar.
5. Fechar o app e repetir o teste com ele em segundo plano.

O passo 1 é necessário: se a permissão já tiver ido para `denied` sem que o
usuário percebesse, o botão Ativar não resolve — o iOS bloqueia o novo prompt e o
único caminho é pelos Ajustes.
