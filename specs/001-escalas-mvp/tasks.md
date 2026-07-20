---
description: "Task list — App de Escalas (MVP)"
---

# Tasks: App de Escalas (MVP)

**Input**: Design de `specs/001-escalas-mvp/` (spec.md, plan.md, research.md, data-model.md, quickstart.md)

**Organização**: por fase e User Story (P1→P3). Cada US é entregável/testável de forma independente.

## Formato: `[ID] [P?] [Story] Descrição`
- **[P]**: paralelizável (arquivos diferentes, sem dependência)
- **[Story]**: US1..US5 ou FND (fundação) / SET (setup) / PL (polish)
- Caminhos exatos incluídos. Stack: Next.js (App Router) + TS, Supabase (Postgres+Auth), Prisma, Web Push VAPID, Vercel Cron.

---

## Fase 0 — Setup

- [x] T001 [SET] Inicializar app Next.js 15 + TypeScript + pnpm na raiz (`package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx` placeholder)
- [x] T002 [P] [SET] Configurar Tailwind CSS + `postcss.config.js` + `app/globals.css`
- [x] T003 [P] [SET] Adicionar deps base: `@supabase/supabase-js`, `@supabase/ssr`, `@prisma/client`, `prisma`, `web-push`, `zod`, `date-fns`, `rrule`
- [x] T004 [P] [SET] Configurar lint/format (ESLint + Prettier) e `vitest` + `@playwright/test`
- [x] T005 [SET] Criar `.env.local` e `.env.example` com todas as vars do quickstart (Supabase, DATABASE_URL/DIRECT_URL, VAPID, CRON_SECRET, APP_TIMEZONE)
- [x] T006 [SET] Criar estrutura de pastas: `src/modules/{scheduling,availability,notifications,reports,identity}/{domain,services,repositories}`, `src/lib/`, `src/ui/`, `tests/{unit,e2e}/`

**Checkpoint**: `pnpm dev` sobe app placeholder.

---

## Fase 1 — Fundação (BLOQUEIA todas as US)

### Banco + Prisma
- [x] T010 [FND] Definir `prisma/schema.prisma` com datasource (`url`=DATABASE_URL pooler, `directUrl`=DIRECT_URL) e todas as entidades do data-model: User, Ministry, Membership, Role, Schedule, Occurrence, Slot, Allocation, SwapRequest, Unavailability, PushSubscription, Notification (+ enums)
- [x] T011 [FND] Aplicar constraints/índices: unique `Allocation.slotId`, unique `Slot(occurrenceId,roleId)`, unique `Occurrence(scheduleId,date)`, unique `Notification.dedupeKey`, índices de `Occurrence(date)`, `Allocation(userId,createdAt)`, `Membership(ministryId,role)`, `Unavailability(userId,year,month)`
- [x] T012 [FND] Rodar `prisma migrate dev` contra Supabase; criar `src/lib/prisma.ts` (singleton)
- [x] T013 [P] [FND] Seed `prisma/seed.ts`: ministérios, funções, 1 admin, voluntários de exemplo

### Auth (Supabase)
- [x] T014 [FND] Clients Supabase: `src/lib/supabase/server.ts` e `src/lib/supabase/client.ts` (via `@supabase/ssr`) + `middleware.ts` (refresh de sessão)
- [x] T015 [FND] Habilitar Email(magic link)+Google no painel Supabase; rotas `app/(auth)/login/page.tsx` e `app/(auth)/callback/route.ts`
- [x] T016 [FND] Upsert de perfil: no primeiro login, criar `public.User` com `id = auth.users.id` (`src/modules/identity/services/ensureProfile.ts`)
- [x] T017 [FND] Autorização: helper `getSessionUser()` + guards de papel (isAdmin / líder do ministério / voluntário) em `src/modules/identity/services/authz.ts` (FR-022/023)

### Design system + PWA shell
- [x] T018 [P] [FND] Tokens da marca no Tailwind + `@font-face` Monument Extended / Gotham em `app/globals.css` e `public/fonts/` (repaginado navy escuro + azul único conforme direção do responsável; orange/yellow removidos)
- [x] T019 [P] [FND] Componentes base estética Apple em `src/ui/`: Button, Card, List, Sheet, EmptyState, AppShell (nav mobile-first)
- [x] T020 [FND] PWA: `public/manifest.webmanifest` + ícones da marca; registrar service worker; `app/layout.tsx` com tema/providers/pt-BR

**Checkpoint**: login funciona, perfil criado, app instalável, tema aplicado.

---

## Fase 2 — US1: Tela inicial de próximas escalas + push (P1) 🎯 MVP

- [x] T030 [US1] Repo `src/modules/scheduling/repositories/allocationRepo.ts`: `getUpcomingByUser(userId, from)` (join occurrence/slot/role/ministry, ordena por data)
- [x] T031 [US1] Service `src/modules/scheduling/services/getMySchedule.ts` (próximas escalas do usuário, fuso America/Sao_Paulo)
- [x] T032 [US1] Tela inicial `app/(app)/page.tsx`: lista próximas escalas (ministério, função, data, hora) + EmptyState quando vazio (FR-018, edge cases)
- [x] T033 [P] [US1] Web Push infra: `src/lib/push.ts` (web-push + VAPID), `app/api/push/subscribe/route.ts`, `src/modules/notifications/repositories/subscriptionRepo.ts` (FR-014)
- [x] T034 [P] [US1] Service worker `public/sw.js`: handler `push` (exibe notificação) + cache de leitura da tela inicial
- [x] T035 [US1] UI: prompt de permissão de notificação + registro de subscription; degradação graciosa quando negada (FR-017)
- [x] T036 [US1] Lembrete: `app/api/cron/reminders/route.ts` (protegida por CRON_SECRET) varre occurrences na janela de lembrete, envia push, grava `Notification` idempotente por `dedupeKey` (FR-015, D7)
- [ ] T037 [P] [US1] Testes: unit de `getMySchedule` (ordenação/fuso) + idempotência de reminders; e2e "voluntário vê próxima escala e recebe push de teste"

**Checkpoint**: US1 entregue e testável sozinha (assumindo dados via seed).

---

## Fase 3 — US2: Líder cria escala recorrente + aloca (P1) 🎯 MVP

- [x] T040 [US2] Domain recorrência `src/modules/scheduling/domain/recurrence.ts`: expandir RRULE em datas dentro de janela (rrule + date-fns), respeitando `recurrenceUntil`
- [x] T041 [US2] Service criar escala `src/modules/scheduling/services/createSchedule.ts`: valida (Zod), grava Schedule + funções esperadas; guard líder-do-ministério (FR-001/005)
- [x] T042 [US2] Materialização `app/api/cron/materialize/route.ts` + `src/modules/scheduling/services/materializeOccurrences.ts`: gera Occurrence+Slots na janela futura, idempotente por unique `(scheduleId,date)` (FR-002, D5)
- [x] T043 [US2] Service alocar `src/modules/scheduling/services/allocateVolunteer.ts`: líder aloca voluntário em slot; cria Allocation(source=LEADER); dispara push de atribuição (FR-006/014)
- [x] T044 [US2] Service excluir `src/modules/scheduling/services/deleteSchedule.ts`: opções SINGLE (cancela occurrence) e FROM_HERE (seta `recurrenceUntil`, cancela futuras não passadas, preserva passadas) (FR-003/004)
- [x] T045 [US2] UI `app/(app)/escalas/`: criar escala recorrente (form), listar ocorrências, alocar em função, modal excluir "esta / desta data em diante"
- [ ] T046 [P] [US2] Testes: unit recurrence (expansão + until), materialização idempotente, exclusão SINGLE/FROM_HERE; e2e "líder cria semanal, aloca, exclui daqui em diante"

**Checkpoint**: US1+US2 = MVP mínimo utilizável.

---

## Fase 4 — US3: Indisponibilidade mensal (P2)

- [x] T050 [US3] Repo+service `src/modules/availability/`: CRUD de Unavailability por (userId, year, month), dia inteiro ou faixa horária (FR-011)
- [x] T051 [US3] UI `app/(app)/indisponibilidade/page.tsx`: voluntário marca dias/horários indisponíveis do mês
- [x] T052 [US3] Regra de conflito `src/modules/availability/services/checkConflict.ts`: dado userId + data/hora → indisponível?
- [x] T053 [US3] Integrar na alocação (T043): bloqueio por padrão + override explícito do líder (`Allocation.overrideUnavailability=true`, registrado); sinalizar voluntários indisponíveis na UI de alocação (FR-012)
- [ ] T054 [P] [US3] Testes: unit checkConflict; e2e "líder é bloqueado e faz override"

**Checkpoint**: alocação respeita indisponibilidade.

---

## Fase 5 — US4: Auto-alocação em vaga livre + pedido de troca (P2)

- [x] T060 [US4] Query vagas livres `src/modules/scheduling/repositories/slotRepo.ts`: slots sem allocation elegíveis ao voluntário
- [x] T061 [US4] Service auto-alocar `src/modules/scheduling/services/selfAllocate.ts`: transação com unique `slotId`; segunda tentativa concorrente → "vaga preenchida"; avisar conflito com própria indisponibilidade (FR-007/008/013)
- [x] T062 [US4] Service pedir troca `src/modules/scheduling/services/requestSwap.ts`: cria SwapRequest(status=OPEN), expõe slot no pool, mantém allocation original; notifica (FR-009/010/016)
- [x] T063 [US4] Service aceitar troca `src/modules/scheduling/services/claimSwap.ts`: transação — nova Allocation(source=SWAP), remove antiga, fecha request (CLAIMED) (FR-024)
- [x] T064 [US4] UI `app/(app)/vagas/`: lista de vagas livres + botão auto-alocar; botão "pedir troca" nas minhas escalas; aceitar troca do pool
- [ ] T065 [P] [US4] Testes: unit concorrência de slot (2 aceites simultâneos → 1 vence), fluxo swap OPEN→CLAIMED; e2e "auto-alocar e pedir/aceitar troca"

**Checkpoint**: voluntários têm autonomia; corrida de vaga tratada.

---

## Fase 6 — US5: Painel Admin + relatórios (P3)

- [x] T070 [US5] Query vagas em aberto `src/modules/reports/repositories/openSlotsRepo.ts`: slots sem allocation ordenados por proximidade da data (FR-019)
- [x] T071 [P] [US5] Relatório carga `src/modules/reports/services/loadByPerson.ts`: ranking de pessoas por nº de escalas num período (FR-020)
- [x] T072 [P] [US5] Relatório ministérios `src/modules/reports/services/volunteersByMinistry.ts`: contagem de voluntários por ministério (FR-021)
- [x] T073 [US5] UI `app/(app)/admin/`: painel de vagas em aberto + dois relatórios; guard isAdmin
- [ ] T074 [P] [US5] Testes: unit das agregações (dados fixos → números esperados); e2e "admin vê vagas em aberto e relatórios"

**Checkpoint**: liderança tem visão de gestão.

---

## Fase 7 — Polish & Deploy

- [x] T080 [P] [PL] `vercel.json` com crons (materialize diário, reminders horário) protegidos por CRON_SECRET
- [ ] T081 [P] [PL] Estados de erro/carregamento/vazio consistentes em todas as telas (estética Apple, FR-025)
- [ ] T082 [P] [PL] Onboarding iOS: instrução "Adicionar à Tela de Início" p/ Web Push (16.4+)
- [ ] T083 [P] [PL] Acessibilidade + responsividade mobile; verificar contraste da paleta
- [ ] T084 [PL] Configurar env vars na Vercel (Prod+Preview) e `prisma migrate deploy` no build; deploy inicial
- [ ] T085 [PL] Smoke test dos 5 fluxos (quickstart) em produção; validar SC-001..007

---

## Dependências

- **Setup (T001-006)** → antes de tudo.
- **Fundação (T010-020)** → BLOQUEIA todas as US. Ordem interna: banco (T010-013) → auth (T014-017) → UI/PWA (T018-020) podem correr em paralelo com auth.
- **US1** e **US2** (ambas P1): independentes entre si após Fundação — podem correr em paralelo por devs diferentes. US1 = valor de leitura; US2 = valor de gestão.
- **US3** depende de US2 (integra na alocação T043).
- **US4** depende de US2 (slots/allocation existem).
- **US5** depende de US2 (dados de allocation/occurrence).
- **Polish** por último.

## Paralelização

- Dentro de cada fase, tarefas marcadas **[P]** tocam arquivos distintos → paralelas.
- Após Fundação: alocar 1 dev em US1, outro em US2. Depois US3/US4/US5 conforme prioridade.
- MVP mínimo entregável = Setup + Fundação + US1 + US2.
