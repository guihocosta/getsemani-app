# Reduzir latência do middleware de sessão — Design

**Problema:** toda request (GET de página ou POST de Server Action) leva 900ms-3s,
de forma consistente (não é cold start, não é região Vercel/Supabase divergente,
não é query pesada — até páginas sem DB, como `/login`, sofrem o mesmo atraso).

**Causa raiz:** `middleware.ts` chama `supabase.auth.getUser()` em toda request que
bate no matcher (quase todas as rotas, exceto `_next`, assets e `api/cron`).
`getUser()` faz uma chamada de rede pro Supabase Auth pra validar e renovar o JWT.
Esse round-trip acontece antes até da página começar a renderizar.

## Arquitetura

Middleware ganha uma checagem local antes de decidir se vale a pena pagar o
round-trip:

1. `supabase.auth.getSession()` — decodifica sessão do cookie, sem rede
   (mesmo padrão já documentado em `authz.ts:19-20`).
2. Sem sessão → passa reto (usuário anônimo, nada pra renovar).
3. Com sessão → `shouldRefreshSession(session.expires_at, now, buffer)` decide.
4. `false` → passa reto, cookies intactos, sem chamada de rede.
5. `true` → `supabase.auth.getUser()` como hoje (valida + renova + persiste cookie).

Buffer de 300s (5min) antes da expiração. Token Supabase dura 1h por padrão,
então a maior parte das requests dentro dessa janela não faz round-trip nenhum.

## Componente novo

`src/lib/session.ts` — função pura:

```ts
export function shouldRefreshSession(
  expiresAt: number | null | undefined,
  nowSeconds: number,
  bufferSeconds: number,
): boolean
```

- `expiresAt` ausente/inválido → `true` (path seguro, força revalidação via rede).
- `expiresAt - nowSeconds <= bufferSeconds` (inclui já expirado) → `true`.
- Caso contrário → `false`.

Isolada do Next/Supabase — testável sem mocks de request/response.

## Segurança

Não muda o modelo de confiança atual: `getSessionUser` (`authz.ts`) já confia no
cookie local pra resolver a sessão (comentário existente confirma:
"getSession() le o cookie local (sem rede)"). Este design só adia **quando** o
JWT é revalidado contra o Supabase Auth — sempre dentro da janela de vida do
próprio token, nunca além dela. Nenhuma rota de autorização (`requireUser`,
`requireAdmin`, `requireLeaderOf`) muda de comportamento.

## Teste

`tests/unit/session.test.ts`, mesmo padrão de `sessionResolution.test.ts`:
- sem `expiresAt` → `true`
- expirado (no passado) → `true`
- dentro do buffer (ex: expira em 60s, buffer 300s) → `true`
- fora do buffer (ex: expira em 1h, buffer 300s) → `false`

## Fora de escopo

`connection_limit=1` no pooler Prisma foi identificado como possível fator
adicional de latência em páginas com muita query concorrente, mas não explica
o baseline (páginas sem DB também são lentas). Fica como investigação futura,
não faz parte deste design.
