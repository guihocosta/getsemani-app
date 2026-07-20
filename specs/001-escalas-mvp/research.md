# Research & Decisions: App de Escalas (MVP)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Registro das decisões técnicas (Phase 0), alternativas e justificativas. Restrições-guia: custo zero, deploy fácil, PWA com notificações, modular para ERP futuro, pt-BR.

## R1 — Plataforma: Next.js + Vercel
**Decisão**: Next.js 15 (App Router, Server Actions) em deploy único na Vercel (free tier, Node 20).
**Por quê**: git push → deploy; front + API no mesmo projeto; Vercel Cron gratuito; PWA suportada.
**Rejeitado**: Express + SPA separada (2 deploys, mais atrito); Remix (menos integração nativa com Vercel Cron/free tier).

## R2 — Banco + Auth: Supabase (escolha do usuário)
**Decisão**: Supabase para Postgres gerenciado **e** Auth. Prisma faz schema/migrações no schema `public`.
**Por quê**: um só fornecedor cobre banco relacional + autenticação no tier gratuito; painel SQL; escala futura (storage, realtime, edge functions) disponível quando o ERP crescer. Prisma mantém schema versionado e modular.
**Detalhes de integração**:
- `DATABASE_URL` (Prisma runtime) → connection pooler Supabase (pgBouncer, porta 6543, `?pgbouncer=true`).
- `DIRECT_URL` (migrações Prisma) → conexão direta (porta 5432).
- Auth via `@supabase/ssr` (sessão em cookie no App Router, middleware de refresh).
- `User.id` = `auth.users.id` (mesmo UUID). Trigger/insere perfil em `public.User` no primeiro login.
**Rejeitado**: Neon + Auth.js (dois serviços, mais integração manual); Firebase (NoSQL ruim para relatórios agregados/relacional); SQLite (não serverless-friendly na Vercel).
**Atenção**: Prisma gerencia só o schema `public`; não tocar no schema `auth` da Supabase via Prisma.

## R3 — Notificações: Web Push nativo (VAPID)
**Decisão**: `web-push` + chaves VAPID + Service Worker próprio. Sem OneSignal.
**Por quê**: zero custo, zero vendor lock-in, sem limites de terceiros; cobre FR-014/015/016/017.
**Rejeitado**: OneSignal (dependência/limites externos) — mantido como *fallback opcional* documentado, não usado no MVP.
**Atenção**: iOS exige PWA instalada + iOS 16.4+ para Web Push; degradar para in-app quando indisponível (FR-017).

## R4 — Recorrência sem data fim
**Decisão**: `Schedule.recurrenceRule` no padrão RRULE (lib `rrule`); Vercel Cron diário materializa `Occurrence` numa janela futura (~90 dias).
**Por quê**: evita gerar ocorrências infinitas; janela mantém tela inicial e painéis performáticos.
**Exclusão**: SINGLE (cancela a occurrence) ou FROM_HERE (seta `recurrenceUntil`, cancela futuras não passadas, preserva passadas) — FR-003/004.
**Rejeitado**: gerar todas as ocorrências na criação (cresce sem limite); calcular tudo on-the-fly a cada request (relatórios/consultas caros).

## R5 — Concorrência de vaga
**Decisão**: unique em `Allocation.slotId`; auto-alocação/aceite de troca em transação.
**Por quê**: garante 1 pessoa por vaga; segunda tentativa concorrente falha e recebe "vaga preenchida" (FR-008, edge case de corrida).

## R6 — Lembretes idempotentes
**Decisão**: Vercel Cron horário varre occurrences na janela de lembrete sem push enviado; `Notification.dedupeKey` unique evita reenvio (FR-015).
**Rejeitado**: agendar um job por ocorrência (não escala no free tier).

## R7 — Design: Apple + identidade Getsemani
**Decisão**: Tailwind com tokens da marca; estética iOS (espaçamento, arredondamento, translucidez sutil, listas legíveis).
**Tokens** (do Manual de Identidade Visual Getsemani):
| Token | Cor | Uso |
|-------|-----|-----|
| `navy` | `#1E4785` | base/fundo |
| `blue` | `#5D8FC4` | detalhe/luz, degradês |
| `orange` | `#FA8F14` | destaque / CTA primário |
| `yellow` | `#F7C14A` | realce / alertas |
| `white` | `#FFFFFF` | texto sobre fundo escuro |
**Tipografia**: Monument Extended (títulos, caixa alta) + Gotham (corpo), fallback `system-ui`/SF Pro.
**Atenção**: confirmar licença web de Monument Extended e Gotham; se restrita, fallback aprovado mantendo hierarquia.

## R8 — Modularidade para ERP futuro
**Decisão**: domínios isolados em `src/modules/{scheduling,availability,notifications,reports,identity}` com camadas domain/services/repositories; cada módulo acessa só suas entidades.
**Por quê**: novos módulos ERP (finanças, patrimônio, membros) entram como novos módulos sem reescrever o núcleo. Organização de código, não complexidade de infra (um app, um banco).
