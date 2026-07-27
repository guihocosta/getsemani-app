# Reduzir Latência do Middleware de Sessão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Middleware para de chamar `supabase.auth.getUser()` (rede) em toda
request; só chama quando o JWT da sessão está perto de expirar, cortando o
overhead fixo de ~900ms-3s que hoje atinge toda request, incluindo páginas
sem DB.

**Architecture:** `src/lib/session.ts` ganha `shouldRefreshSession(expiresAt,
now, buffer)`, função pura que decide se vale revalidar via rede. `middleware.ts`
chama `getSession()` (local, sem rede) primeiro; só cai pro `getUser()` (rede,
comportamento atual) quando `shouldRefreshSession` retornar `true`.

**Tech Stack:** TypeScript, Next.js 15 middleware, `@supabase/ssr`, Vitest.

## Global Constraints

- Interface em pt-BR (comentários e nomes de domínio também, por convenção do projeto).
- Não alterar o modelo de autorização existente (`authz.ts`) — este plano só
  toca `middleware.ts` e adiciona `src/lib/session.ts`.
- Buffer de revalidação: 300 segundos (5 minutos).
- Sem libs novas — `Session.expires_at` já vem tipado em `@supabase/auth-js`
  (confirmado: `expires_at?: number`).

---

### Task 1: `shouldRefreshSession` (função pura)

**Files:**
- Create: `src/lib/session.ts`
- Test: `tests/unit/session.test.ts`

**Interfaces:**
- Produces: `shouldRefreshSession(expiresAt: number | null | undefined, nowSeconds: number, bufferSeconds: number): boolean` — usado pelo Task 2 dentro de `middleware.ts`.

- [ ] **Step 1: Escrever teste que falha**

Criar `tests/unit/session.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shouldRefreshSession } from "@/lib/session";

// Middleware evitava chamar supabase.auth.getUser() (rede) em toda request.
// Esta funcao decide quando vale a pena pagar esse round-trip: so quando o
// JWT esta perto de expirar (ou ja expirou, ou nao da pra saber).
describe("shouldRefreshSession", () => {
  it("sem expiresAt -> true (path seguro, forca revalidacao)", () => {
    expect(shouldRefreshSession(undefined, 1_000, 300)).toBe(true);
    expect(shouldRefreshSession(null, 1_000, 300)).toBe(true);
  });

  it("ja expirado -> true", () => {
    expect(shouldRefreshSession(900, 1_000, 300)).toBe(true);
  });

  it("dentro do buffer (expira em 60s, buffer 300s) -> true", () => {
    expect(shouldRefreshSession(1_060, 1_000, 300)).toBe(true);
  });

  it("exatamente no limite do buffer -> true", () => {
    expect(shouldRefreshSession(1_300, 1_000, 300)).toBe(true);
  });

  it("fora do buffer (expira em 1h, buffer 300s) -> false", () => {
    expect(shouldRefreshSession(1_000 + 3_600, 1_000, 300)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar teste e confirmar que falha**

Run: `npm run test -- tests/unit/session.test.ts`
Expected: FAIL — `Cannot find module '@/lib/session'` (arquivo ainda não existe).

- [ ] **Step 3: Implementação mínima**

Criar `src/lib/session.ts`:

```ts
// Decide se vale chamar supabase.auth.getUser() (rede) pra revalidar o JWT,
// ou se a sessao local ainda tem vida suficiente e a request pode passar reto.
export function shouldRefreshSession(
  expiresAt: number | null | undefined,
  nowSeconds: number,
  bufferSeconds: number,
): boolean {
  if (expiresAt == null) return true;
  return expiresAt - nowSeconds <= bufferSeconds;
}
```

- [ ] **Step 4: Rodar teste e confirmar que passa**

Run: `npm run test -- tests/unit/session.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: sem erros novos.

- [ ] **Step 6: Commit**

```bash
git add src/lib/session.ts tests/unit/session.test.ts
git commit -m "feat: shouldRefreshSession decide quando revalidar JWT via rede"
```

---

### Task 2: Usar `shouldRefreshSession` no middleware

**Files:**
- Modify: `middleware.ts:1-37`

**Interfaces:**
- Consumes: `shouldRefreshSession(expiresAt, nowSeconds, bufferSeconds): boolean` (Task 1, `@/lib/session`).

- [ ] **Step 1: Ler o middleware atual pra confirmar linhas exatas**

Run: `cat middleware.ts` (ou reabrir no editor) — confirmar que a estrutura
ainda bate com o trecho abaixo antes de editar (arquivo pode ter mudado desde
o plano ser escrito).

- [ ] **Step 2: Reescrever `middleware.ts`**

Substituir o corpo da função `middleware` (linha `await supabase.auth.getUser();`
em diante) por:

```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { shouldRefreshSession } from "@/lib/session";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const REFRESH_BUFFER_SECONDS = 300;

// Refresh da sessao Supabase a cada request (mantem cookie valido).
// getSession() e local (sem rede); so chamamos getUser() (rede, valida+renova
// o JWT) quando o token esta perto de expirar — reduz o overhead fixo que
// bate em toda request, mesmo paginas sem query no banco.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: 400 * 24 * 60 * 60,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return response;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!shouldRefreshSession(session.expires_at, nowSeconds, REFRESH_BUFFER_SECONDS)) {
    return response;
  }

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|manifest.webmanifest|sw.js|api/cron).*)"],
};
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Rodar suite unitária completa**

Run: `npm run test`
Expected: todos os testes passam (nenhum teste existente cobre middleware
diretamente — Next middleware não roda em ambiente Vitest node puro sem mock
de request; a garantia de comportamento vem da unidade pura do Task 1).

- [ ] **Step 5: Teste manual do fluxo de login**

Run: `npm run dev`, abrir `http://localhost:3000`, fazer login, navegar entre
2-3 páginas autenticadas (ex: `/escalas`, `/admin` se aplicável).
Expected: sessão continua válida entre navegações, sem logout inesperado,
sem loop de redirect pro `/login`. Abrir DevTools → Network e confirmar que
nem toda navegação dispara uma call pro domínio do Supabase Auth (só a
primeira, ou nenhuma dentro da janela do buffer).

- [ ] **Step 6: Commit**

```bash
git add middleware.ts
git commit -m "perf: middleware so chama getUser() quando sessao esta perto de expirar"
```

---

## Self-Review

- **Spec coverage:** arquitetura (Task 2), componente novo `shouldRefreshSession`
  (Task 1), segurança (comentário + Task 2 preserva `getSessionUser`/`authz.ts`
  intocados), teste (Task 1 cobre os 4 casos do spec + 1 caso de borda extra).
  `connection_limit=1` explicitamente fora de escopo, nenhuma task toca Prisma.
- **Placeholder scan:** nenhum "TBD"/"similar ao anterior" — todo código completo.
- **Type consistency:** `shouldRefreshSession` mesma assinatura em Task 1 (produces)
  e Task 2 (consumes): `(expiresAt: number | null | undefined, nowSeconds: number, bufferSeconds: number) => boolean`.
