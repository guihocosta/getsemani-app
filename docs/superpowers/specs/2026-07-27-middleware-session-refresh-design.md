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

Vale registrar o trade-off explícito de revogação: no código antigo, uma sessão
Supabase Auth revogada (logout em outro dispositivo, usuário apagado do Supabase
Auth) era limpa do cookie já na próxima request, porque `getUser()` rodava
sempre. Agora isso só acontece quando `shouldRefreshSession` dispara uma
chamada real de `getUser()` — ou seja, a revogação pode levar até
`REFRESH_BUFFER_SECONDS` a menos que o tempo de vida restante do JWT pra se
propagar (até ~55min com o TTL padrão de 1h do Supabase). É um trade-off
consciente: o próprio `getSessionUser` já faz um `prisma.user.findUnique` que
corta na hora um usuário apagado da base de domínio da app, e mudanças de
papel/permissão (isAdmin, liderança) já são lidas do Prisma a cada render,
independente disso — então o atraso fica restrito ao caso estreito de "sessão
Supabase Auth revogada mas linha `User` de domínio intacta". Se esse atraso for
inaceitável pra alguma rota específica (ex.: `/admin`), a correção é uma
chamada explícita de `getUser()` no layout dessa rota, não reduzir o buffer
global.

Outro ponto: o `getSession()` do `@supabase/auth-js` já renova o token
internamente sempre que ele está dentro da própria margem de ~90s de expiração,
independente desta mudança — então o buffer de 300s aqui não controla
**quando o token é renovado**, só **quando o middleware adicionalmente valida
ele contra o servidor** (pra pegar revogação mais cedo). Também vale notar: se
o TTL do JWT de algum projeto Supabase for configurado abaixo de ~5 minutos,
`shouldRefreshSession` fica permanentemente `true` e o código degrada com
segurança pra chamar `getUser()` em toda request (o comportamento antigo) —
não precisa de tratamento especial, isso é intencional.

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
