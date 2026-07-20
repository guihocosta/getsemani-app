# Implementation Plan: App de Escalas (MVP)

**Branch**: `001-escalas-mvp` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-escalas-mvp/spec.md`

## Summary

App PWA de escalas de voluntários para a igreja Getsemani. Voluntários veem suas próximas escalas na tela inicial e recebem notificações push; líderes criam escalas recorrentes (sem data fim) e alocam pessoas em funções por ministério; voluntários marcam indisponibilidade mensal, se auto-alocam em vagas livres e pedem troca (vira pool aberto); Admin vê vagas em aberto e relatórios de carga por pessoa e voluntários por ministério.

Abordagem técnica: **Next.js (App Router) + TypeScript** em deploy único na **Vercel** (tier gratuito, runtime Node), **Supabase** (Postgres gerenciado + Auth, tier gratuito) com **Prisma** para schema/migrações no schema `public`, notificações **Web Push nativo (VAPID)** sem custo de vendor, e **Vercel Cron** para materializar ocorrências recorrentes e disparar lembretes. Código organizado em **módulos de domínio** para permitir crescer até um ERP sem reescrita do núcleo.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20 (runtime Vercel)

**Primary Dependencies**: Next.js 15 (App Router, Server Actions), React 19, Prisma ORM, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Tailwind CSS, `web-push` (VAPID), Zod (validação), `date-fns` + `rrule` (recorrência)

**Storage**: PostgreSQL gerenciado pela Supabase (tier gratuito). Prisma faz schema/migrações no schema `public`; Supabase Auth gerencia `auth.users`. Blob/estáticos não necessários no MVP.

**Testing**: Vitest (unit), Playwright (e2e dos fluxos P1/P2)

**Target Platform**: PWA instalável (mobile-first), navegadores modernos com Service Worker + Web Push; iOS 16.4+ suporta Web Push para PWA instalada.

**Project Type**: Web application (single Next.js app, front + back no mesmo deploy)

**Performance Goals**: Tela inicial (próximas escalas) interativa < 2s em 4G; relatórios gerados < 5s (SC-005); lembretes entregues antes da data (SC-003).

**Constraints**: Custo operacional zero (tiers gratuitos Vercel + Neon + Web Push nativo); deploy simples (git push → Vercel); offline-friendly de leitura via cache do Service Worker; pt-BR.

**Scale/Scope**: Escala de uma igreja — centenas de voluntários, dezenas de ministérios, milhares de ocorrências/ano. ~15-20 telas. Modularidade obrigatória para módulos ERP futuros.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constituição ratificada (v1.0.0, 2026-07-13). Gate: este plano **passa** todos os princípios.

- **I. Modularidade Primeiro** ✅ domínios isolados em `src/modules/*` com fronteiras domain/services/repositories.
- **II. Custo Zero** ✅ Vercel + Supabase + Web Push nativo — todos tier gratuito; sem vendor pago.
- **III. Deploy Simples** ✅ git push → Vercel; um app, um banco; migrações Prisma no pipeline.
- **IV. Simplicidade/YAGNI** ✅ sem microserviços/infra extra; ver Complexity Tracking (sem violações).
- **V. Testável** ✅ e2e P1/P2; unit para recorrência, exclusão, indisponibilidade+override, concorrência de vaga, relatórios.
- **VI. Experiência do Voluntário** ✅ PWA mobile-first, tela inicial imediata, degradação sem push, estética Apple + marca Getsemani, pt-BR.

## Key Technical Decisions

### D1 — Framework: Next.js na Vercel
Deploy trivial (git push), runtime Node, API routes + Server Actions no mesmo projeto, PWA suportada. Atende "deploy fácil / sem custo". Alternativas rejeitadas: Express+SPA separado (2 deploys, mais atrito), Remix (menos integração nativa com Vercel Cron/free tier).

### D2 — Banco: Supabase Postgres + Prisma
Postgres relacional modela bem escalas/alocações/relatórios (agregações). Supabase entrega Postgres gerenciado no tier gratuito (500MB, backups) + painel SQL. **Prisma** roda as migrações/schema no schema `public` (schema versionado, base modular do ERP); a `DATABASE_URL` aponta para o Postgres da Supabase (usar connection pooler porta 6543 para runtime serverless e conexão direta 5432 para migrações). SQLite rejeitado (não serverless-friendly na Vercel); Neon rejeitado por não trazer Auth integrado.

### D3 — Auth: Supabase Auth
E-mail (magic link / OTP) + Google OAuth via Supabase Auth (`@supabase/ssr` para sessão em cookie no App Router). Gratuito e integrado ao banco. `auth.users` guarda a identidade; a tabela `User` do domínio referencia `auth.users.id` (mesmo UUID) e carrega os papéis (Admin via `isAdmin`; Líder/Voluntário via `Membership`). Autorização de dados por checagem nos services/RLS conforme necessário. Papéis **não** vêm do provider OAuth.

### D4 — Notificações: Web Push nativo (VAPID) — sem OneSignal
`web-push` + chaves VAPID + Service Worker. Zero custo, zero vendor lock-in, sem limite de terceiros. OneSignal fica como *fallback opcional* documentado, não dependência. Cobre FR-014/015/016/017. Fallback quando permissão negada: app funciona só com leitura (FR-017).

### D5 — Recorrência: regra + materialização por janela
Escala guarda uma `recurrenceRule` (padrão RRULE, ex.: `FREQ=WEEKLY;BYDAY=SU`). Um **Vercel Cron** diário materializa `Occurrence` dentro de uma janela futura (ex.: 90 dias) — evita gerar infinito (edge case da spec). Exclusão: "só esta" (marca a occurrence) ou "desta data em diante" (seta `recurrenceUntil` e remove occurrences futuras não passadas) — FR-003/004.

### D6 — Concorrência de vaga (FR-008)
`Allocation` com **unique constraint** em `(occurrenceId, roleId)`. Auto-alocação/aceite de troca via transação → segundo a tentar recebe erro tratado ("vaga preenchida"). Cobre edge case de corrida.

### D7 — Lembretes (FR-015)
Vercel Cron (ex.: a cada hora) varre occurrences dentro da janela de lembrete cujo push ainda não foi enviado, dispara Web Push e marca como enviado (idempotente).

### D8 — Design system Apple + marca Getsemani
Tailwind com tokens da identidade visual:
- Cores: azul marinho `#1E4785` (base), azul claro `#5D8FC4`, laranja `#FA8F14` (destaque/CTA), amarelo `#F7C14A` (alertas/realce), branco `#FFFFFF`.
- Tipografia: **Monument Extended** (títulos, caixa alta) via `@font-face`; **Gotham** (corpo) com fallback `system-ui`/SF Pro.
- Estética Apple: espaçamento generoso, cantos arredondados, hierarquia clara, blur/translucidez sutil, listas grandes e legíveis (FR-018/025).

## Project Structure

### Documentation (this feature)

```text
specs/001-escalas-mvp/
├── plan.md              # Este arquivo
├── research.md          # Decisões e alternativas (Phase 0)
├── data-model.md        # Entidades e schema (Phase 1)
├── quickstart.md        # Setup, env, deploy (Phase 1)
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (ainda não criado)
```

### Source Code (repository root)

```text
app/                          # Next.js App Router (rotas + UI)
├── (auth)/                   # login, callback
├── (app)/
│   ├── page.tsx              # Tela inicial: próximas escalas (US1)
│   ├── escalas/              # criar/gerir escalas recorrentes (US2)
│   ├── vagas/                # escalas livres / auto-alocação / troca (US4)
│   ├── indisponibilidade/    # marcar indisponibilidade do mês (US3)
│   └── admin/                # vagas em aberto + relatórios (US5)
├── api/
│   ├── push/subscribe/       # registra subscription do device
│   └── cron/
│       ├── materialize/      # gera occurrences (D5)
│       └── reminders/        # dispara lembretes (D7)
└── layout.tsx                # tema/marca, providers

src/
├── modules/                  # DOMÍNIOS ISOLADOS (base do ERP futuro)
│   ├── scheduling/           # escalas, ocorrências, funções, alocação, troca
│   │   ├── domain/           # regras: recorrência, concorrência, exclusão
│   │   ├── services/
│   │   └── repositories/
│   ├── availability/         # indisponibilidade mensal
│   ├── notifications/        # web-push, subscriptions, lembretes
│   ├── reports/              # carga por pessoa, voluntários por ministério
│   └── identity/             # usuários, ministérios, papéis, permissões
├── lib/                      # prisma client, supabase client (server/browser), push, utils
└── ui/                       # design system (tokens marca, componentes Apple-like)

prisma/
├── schema.prisma
└── migrations/

public/
├── manifest.webmanifest      # PWA
├── sw.js                     # service worker (push + cache leitura)
└── fonts/                    # Monument Extended, Gotham

tests/
├── unit/                     # recorrência, exclusão, concorrência, relatórios
└── e2e/                      # fluxos P1/P2 (Playwright)
```

**Structure Decision**: App Next.js único. UI/rotas em `app/`, **lógica de negócio isolada em `src/modules/<domínio>`** com fronteiras explícitas (domain/services/repositories) — cada módulo é candidato a virar um módulo do ERP futuro sem tocar no núcleo. Persistência centralizada em Prisma; cada módulo acessa só suas entidades via repositórios.

## Roadmap por User Story (mapeando prioridades da spec)

- **Fundação** (pré-requisito): projeto Supabase, schema Prisma, Supabase Auth + sessão SSR, papéis, tema/marca, PWA shell.
- **P1 · US1** Tela inicial de próximas escalas + Web Push (FR-014/015/017/018).
- **P1 · US2** Criar escala recorrente + materialização + alocação por líder + exclusão "esta/daqui em diante" (FR-001..006, FR-012).
- **P2 · US3** Indisponibilidade mensal + sinalização/bloqueio-com-override na alocação (FR-011/012/013).
- **P2 · US4** Vagas livres + auto-alocação (unique constraint) + pedido de troca vira pool (FR-007/008/009/010/024).
- **P3 · US5** Painel Admin de vagas em aberto + relatórios (FR-019/020/021).

## Complexity Tracking

Sem violações a justificar — arquitetura de um único app + um banco, dentro da simplicidade. Modularização em `src/modules` é organização de código, não complexidade de infra.

## Riscos / Pontos de atenção

- **Web Push no iOS**: exige PWA instalada (Adicionar à Tela de Início) e iOS 16.4+. Documentar no onboarding; degradar para in-app quando indisponível (FR-017).
- **Fontes proprietárias** (Monument Extended, Gotham): confirmar licença de uso web; se restrito, usar fallback aprovado mantendo hierarquia.
- **Cron na Vercel free**: limite de agendamentos — consolidar materialize+reminders em poucas rotas.
- **Fuso horário**: armazenar em UTC, exibir em America/Sao_Paulo.

## Próximo passo

`/speckit-tasks` para gerar `tasks.md`. Opcional: `/speckit-constitution` para ratificar princípios (D-check).
