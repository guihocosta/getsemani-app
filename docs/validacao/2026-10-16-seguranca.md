# Relatório de segurança — 2026-10-16

Skill: `security-best-practices` (referências Next.js server + React frontend).
Stack: Next.js 15.5.20, React 19.2.7, @supabase/ssr 0.5.2 (auth-js 2.110.3), Prisma 6.19.3.

## Resumo executivo

A autorização no app é consistente: toda mutação passa por `requireUser`, `requireLeaderOf` ou `requireAdmin` no serviço. O problema é que **a identidade em que esses gates confiam é forjável**. `getSessionUser` lê o usuário do cookie via `getSession()`, que não verifica a assinatura do JWT. Qualquer pessoa consegue montar um cookie com o UUID de outro usuário (inclusive admin) e agir como ele. Isso foi confirmado com um script local. Um segundo ponto crítico, que **precisa ser verificado no painel do Supabase**, é a exposição das tabelas Prisma pela API REST do Supabase usando a anon key pública.

| ID | Severidade | Título |
|----|-----------|--------|
| S-01 | Crítica | Sessão forjável: `getSession()` usado como fonte de identidade |
| S-02 | Crítica (verificar) | Tabelas em `public` sem RLS; anon key pública |
| S-08 | Alta (operacional) | `npm run test:local` faz TRUNCATE no banco de produção com o `.env` atual |
| S-03 | Média | Open redirect no callback de auth via `next` |
| S-04 | Baixa | Líder pode alocar usuário que não é membro do ministério |
| S-05 | Baixa | Comparação de `CRON_SECRET` não é constant-time |
| S-06 | Baixa | `/api/push/subscribe` reatribui endpoint a outro usuário, sem validação de schema |
| S-07 | Baixa | Sem headers de segurança (anti-clickjacking / CSP) |

**Status (2026-10-16):**
- S-01 corrigido: `getClaims()` em `authz.ts` e teste `tests/unit/sessionForgery.test.ts`.
- S-03 corrigido: `src/lib/safeNext.ts` e teste `tests/unit/safeNext.test.ts`.
- S-08 corrigido: trava de host local em `scripts/local-integration.ts`.
- S-02 tem migration `20261016220000_enable_rls` pronta, **pendente de `npm run db:deploy`**.
- S-04 a S-07 continuam abertos.

Versões: Next 15.5.20 e React 19.2.7 já têm os patches do bypass de middleware (CVE-2025-29927) e do RCE em RSC (CVE-2025-55182).

---

## Críticas

### S-01 — Sessão forjável: `getSession()` usado como fonte de identidade

**Impacto:** qualquer pessoa autenticada (ou que conheça um UUID) assume a identidade de qualquer usuário, inclusive admin, e executa todas as mutações dele.

- `src/modules/identity/services/authz.ts:26-31`: `getSessionUser` usa `supabase.auth.getSession()` e confia em `session.user.id` para buscar o `User` no Prisma.
- `middleware.ts:42-53`: só chama `getUser()` quando o token está perto de expirar. Com `expires_at` no futuro, nada é validado.
- O Prisma conecta como role do banco e não depende do JWT, então nenhuma camada a jusante rejeita o token falso.

**Prova** (script local, sem rede): um cookie `sb-<ref>-auth-token` com `access_token` de assinatura inválida e `user.id` arbitrário faz `getSession()` retornar `error: null` e o `user.id` forjado. A própria lib emite o aviso: *"Using the user object as returned from supabase.auth.getSession() … could be insecure!"*

UUIDs não são segredo: a lista de candidatos (`getOccurrenceCandidatesAction`) e outras telas os enviam ao cliente.

**Correção:** em `getSessionUser`, trocar `getSession()` por `supabase.auth.getClaims()`. Com chaves JWT assimétricas, ele verifica localmente via JWKS em cache, sem rede por request. Sem elas, cai no `getUser()`. Usar `claims.sub` como id. No middleware, idem (ou `getUser()`). Adicionar um teste que reproduza o caso: um cookie com assinatura inválida deve resultar em `null`.

### S-02 — Tabelas em `public` sem RLS; anon key pública (VERIFICAR)

- Nenhuma migration em `prisma/migrations` contém `ENABLE ROW LEVEL SECURITY` ou `CREATE POLICY`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` vai para o bundle (`src/lib/supabase/client.ts:5-6`).
- Por padrão o Supabase expõe o schema `public` via PostgREST para os roles `anon` e `authenticated`. Se RLS não foi ligado pelo painel, qualquer pessoa com a anon key lê e escreve `User`, `Allocation`, `PushSubscription` etc. direto em `https://<ref>.supabase.co/rest/v1/...`, sem passar pelo app.

**Impacto (se confirmado):** vazamento de todos os dados pessoais (e-mail, telefone, aniversário) e escrita arbitrária, inclusive `isAdmin = true`.

**Verificar:** Supabase → Table Editor / Advisors (o "Security Advisor" acusa `rls_disabled_in_public`). Ou rodar `curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/User?select=id&limit=1" -H "apikey: $ANON"`: se retornar linha, a falha está confirmada.

**Correção:** migration habilitando RLS em todas as tabelas, sem policies. O Prisma conecta como `postgres` (dono das tabelas / bypass RLS) e continua funcionando. O app não usa o cliente Supabase para dados, só para auth. Alternativa: tirar `public` dos "Exposed schemas" na Data API.

---

## Alta

### S-08 — `test:local` apaga a produção
`scripts/local-integration.ts:12,22-24`: `new PrismaClient()` usa o `DATABASE_URL` do `.env`, que hoje aponta para o pooler do Supabase de produção (`aws-1-sa-east-1.pooler.supabase.com`). A primeira instrução é `TRUNCATE "Notification", ..., "User" RESTART IDENTITY CASCADE`.

**Impacto:** rodar o comando documentado no CLAUDE.md apaga todos os dados reais da igreja.

**Correção:** ler `DATABASE_URL_TEST` e abortar se o host não for `localhost`/`127.0.0.1` antes de qualquer query.

## Média

### S-03 — Open redirect no callback via `next`

- `app/(auth)/callback/route.ts:10,21`: `NextResponse.redirect(\`${origin}${next}\`)` concatena sem validar. `next=@evil.com` vira `https://app@evil.com` (host = evil.com) e `next=.evil.com` vira `https://app.evil.com`.
- O ataque exige um `code` válido para o navegador da vítima, o que reduz a exploração, mas é um padrão clássico de phishing pós-login.

**Correção:** aceitar só caminho relativo: `next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")`. Caso contrário, usar `"/"`.

---

## Baixas

### S-04 — Alocação de usuário de fora do ministério
`src/modules/scheduling/services/allocateVolunteer.ts:47-77` (e `reassignAllocation`, `linkGuestAllocation`, `linkAllGuestAllocations`): checa se quem chama é líder, mas não se o `userId` alvo é membro ativo do ministério. Um líder pode escalar (e notificar) qualquer usuário do app. **Correção:** validar membership ativa do alvo no serviço.

### S-05 — `CRON_SECRET` comparado com `===`
`src/lib/cron.ts:7`. Risco de timing é teórico pela rede, mas `crypto.timingSafeEqual` custa uma linha.

### S-06 — `/api/push/subscribe`
`app/api/push/subscribe/route.ts:9-21`: `request.json()` sem schema nem limite de tamanho. O `upsert` por `endpoint` troca o `userId` de uma assinatura existente: quem souber o endpoint de outra pessoa passa a receber os pushes dela. Endpoints são difíceis de adivinhar, então o risco é baixo. **Correção:** zod (`endpoint` URL https ≤ 1 KB, chaves base64url) e, no `update`, só aceitar se `userId` for o mesmo.

### S-07 — Sem headers de segurança
`next.config.ts` não define `headers()`. Adicionar no mínimo `X-Frame-Options: DENY` (ou CSP `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff` e `Referrer-Policy: strict-origin-when-cross-origin`. CSP completa fica para depois: há script inline de tema em `app/layout.tsx:43`, que exigiria nonce.

---

## Pontos positivos
- Todas as Server Actions de mutação delegam a serviços que chamam `requireLeaderOf` / `requireAdmin` / `requireUser`. Não há action sem gate.
- Rotas cron com bearer secret e fail-closed sem `CRON_SECRET` (`src/lib/cron.ts:5`).
- URLs de repertório restritas a `http(s)` antes de virar `href` (`src/modules/repertoire/domain/validation.ts:20-26`).
- Nenhum `$queryRaw`/`$executeRaw` no app. O único `dangerouslySetInnerHTML` é uma constante estática.
- Push de teste só para o próprio usuário. Cookies `httpOnly`, `sameSite=lax`, `secure` em produção.
