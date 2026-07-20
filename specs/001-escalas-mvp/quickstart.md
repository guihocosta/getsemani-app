# Quickstart: App de Escalas (MVP)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Setup local, variáveis de ambiente e deploy. Stack: Next.js + Supabase (Postgres + Auth) + Prisma + Web Push + Vercel.

## Pré-requisitos
- Node 20+, pnpm (ou npm)
- Conta Vercel (free)
- Projeto Supabase (free) — anote a `Project URL`, `anon key`, `service_role key` e as strings de conexão do Postgres
- Chaves VAPID para Web Push: `npx web-push generate-vapid-keys`

## Variáveis de ambiente (`.env.local`)
```bash
# Supabase Auth (client)
NEXT_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # só server-side (cron/admin)

# Prisma → Postgres da Supabase
# Runtime (pooler, pgBouncer): porta 6543
DATABASE_URL="postgresql://postgres.<ref>:<senha>@<host>:6543/postgres?pgbouncer=true&connection_limit=1"
# Migrações (conexão direta): porta 5432
DIRECT_URL="postgresql://postgres.<ref>:<senha>@<host>:5432/postgres"

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-public>
VAPID_PRIVATE_KEY=<vapid-private>
VAPID_SUBJECT=mailto:contato@getsemani.exemplo

# Cron (protege as rotas /api/cron/*)
CRON_SECRET=<random>

# Fuso de exibição
APP_TIMEZONE=America/Sao_Paulo
```

`schema.prisma` deve declarar:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Passos locais
```bash
pnpm install
pnpm prisma migrate dev        # cria schema public no Postgres da Supabase
pnpm prisma db seed            # ministérios/funções/admin inicial (opcional)
pnpm dev                       # http://localhost:3000
```

## Supabase — configuração do Auth
1. Auth → Providers: habilitar **Email** (magic link/OTP) e **Google** (client id/secret).
2. Auth → URL config: adicionar `http://localhost:3000` e a URL de produção Vercel como redirect.
3. Primeiro login cria/insere perfil em `public.User` (trigger ou upsert no callback) com `id = auth.users.id`.
4. Definir o primeiro Admin: `UPDATE "User" SET "isAdmin" = true WHERE email = '...';`

## PWA / Notificações
- `public/manifest.webmanifest` + ícones da marca; `public/sw.js` trata `push` e cache de leitura.
- No cliente: pedir permissão, registrar subscription em `POST /api/push/subscribe`.
- iOS: instruir "Adicionar à Tela de Início" (Web Push só em PWA instalada, iOS 16.4+).

## Cron (Vercel) — `vercel.json`
```json
{
  "crons": [
    { "path": "/api/cron/materialize", "schedule": "0 6 * * *" },
    { "path": "/api/cron/reminders",   "schedule": "0 * * * *" }
  ]
}
```
Rotas checam `CRON_SECRET`. `materialize` gera occurrences na janela futura; `reminders` dispara Web Push idempotente.

## Deploy (Vercel)
1. Importar repo na Vercel.
2. Copiar as env vars do `.env.local` para o projeto (Production + Preview).
3. `git push` → build e deploy automáticos. Crons ativam via `vercel.json`.
4. Rodar `prisma migrate deploy` no build (ou uma vez via CI).

## Smoke test dos fluxos (spec)
- **US1**: login como voluntário com alocação → tela inicial lista próximas escalas; permitir push → recebe lembrete de teste.
- **US2**: login como líder → criar escala recorrente semanal → alocar voluntário → excluir "desta data em diante".
- **US3**: voluntário marca indisponibilidade → líder vê bloqueio + override.
- **US4**: deixar vaga livre → voluntário se auto-aloca; pedir troca → vaga vira pool.
- **US5**: admin → painel de vagas em aberto + relatórios de carga e por ministério.
