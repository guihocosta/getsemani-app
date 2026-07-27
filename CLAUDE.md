# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

App de gestão da igreja Getsemani. MVP = escalas de voluntários; visão de longo prazo = ERP modular da igreja. **Toda a interface é em pt-BR** (labels, mensagens de erro, textos de botão). Comentários e nomes de domínio no código também são em português.

Regras de produto/arquitetura vivem em `.specify/memory/constitution.md` (custo zero, deploy só via `git push` → Vercel, modularidade, YAGNI, mobile-first). A spec do MVP está em `specs/001-escalas-mvp/` (`spec.md`, `data-model.md`, `tasks.md`).

## Comandos

```bash
npm run dev              # Next dev server (localhost:3000)
npm run build            # prisma generate + next build
npm run typecheck        # tsc --noEmit
npm run lint             # next lint

npm run test             # vitest run (tests/unit)
npm run test -- tests/unit/swap.test.ts        # um arquivo
npm run test -- -t "nome do caso"              # um caso
npm run test:watch
npm run test:e2e         # playwright (sobe `npm run dev` sozinho)
npm run test:local       # scripts/local-integration.ts — integração com Postgres real, sem Supabase

npm run db:migrate       # prisma migrate dev
npm run db:deploy        # prisma migrate deploy (produção)
npm run db:seed          # prisma/seed.ts
npm run db:studio
npm run vapid            # gera par de chaves VAPID para Web Push
```

Env: copiar `.env.example` → `.env`. `DATABASE_URL` usa o pooler (porta 6543, `pgbouncer=true`); `DIRECT_URL` é conexão direta (5432) só para migrações.

## Arquitetura

**Stack fixa**: Next.js 15 App Router + React 19 + TypeScript strict; Supabase (Postgres + Auth); Prisma (schema `public`); Tailwind v4 (CSS-first, tokens em `app/globals.css`); Web Push VAPID; Vercel + Vercel Cron.

### Camadas

```
app/          rotas, Server Components, Server Actions ("use server" em actions.ts)
src/modules/  domínio: <módulo>/domain (puro) e <módulo>/services (Prisma + regras)
src/lib/      infra compartilhada: prisma, supabase/{client,server}, time, push, cron
src/ui/       primitivas visuais (AppShell, Button, Card, Badge, ConfirmDialog…)
```

Módulos: `identity`, `ministries`, `scheduling`, `availability`, `notifications`, `reports`. Regra da constituição: um módulo só toca as próprias entidades; conversa entre módulos passa por funções de serviço, nunca por acesso cruzado a tabelas. Sem ciclos.

Fluxo padrão de uma feature: página Server Component chama `require*` de authz → chama serviço do módulo → renderiza; mutações vão em `app/**/actions.ts` como Server Action que valida, chama o serviço, e faz `revalidatePath`.

Aliases: `@/*` → `src/*`, `@app/*` → `app/*` (espelhados em `tsconfig.json` e `vitest.config.ts`).

### Auth e autorização

- Supabase Auth é a fonte de verdade da sessão; `middleware.ts` renova o cookie a cada request (matcher exclui `api/cron` e assets).
- `User.id === auth.users.id` (mesmo UUID). O perfil de domínio é criado no callback (`app/(auth)/callback/route.ts` → `ensureProfile`); `getSessionUser` (`authz.ts`) não chama `ensureProfile` no caminho normal — só como reparo, se a sessão do Supabase for válida mas a linha `User` estiver ausente (`resolveSessionState` → `"reparar"`), evitando o loop de redirect pro `/login`.
- Todo gate passa por `src/modules/identity/services/authz.ts`: `getSessionUser` (embrulhado em `cache()` — layout e página compartilham uma resolução por render), `requireUser`, `requireAdmin`, `requireLeaderOf(ministryId)`, `isLeaderOfAny`. Falha de permissão = `throw new Error("FORBIDDEN")`, traduzido para pt-BR na action.
- Serviços de leitura em lote (ex.: `listMonthOccurrences`) **não** checam permissão: o chamador resolve antes quais ministérios o usuário pode ver (`visibleMinistryIds`) ou gerenciar (`ledMinistryIds`).

### Escalas: recorrência e materialização

`Schedule` guarda RRULE + `startDate` (date) + `startTime` ("HH:mm" local). `Occurrence` é o instante concreto materializado, com `Slot` por função e no máximo uma `Allocation` por slot (`slotId @unique` = 1 pessoa por vaga).

- `domain/recurrence.ts` expande a RRULE combinando dia + hora local via `fromZonedTime` → UTC. **Nunca guardar horário local no banco**: persistir UTC, exibir em `APP_TIMEZONE` (`src/lib/time.ts`).
- `materializeOccurrences(now, scheduleId?)` gera ocorrências numa janela de 90 dias — idempotente pelo unique `(scheduleId, date)`. Nunca geração infinita. Chamado pelo cron diário e, com `scheduleId`, logo após criar/editar uma escala.
- Cancelamento tem escopo `SINGLE` ou `FROM_HERE` (`deleteSchedule.ts`).
- Corrida em vaga é resolvida pelo unique do banco: capturar `P2002` e converter em `SlotTaken` (ver `selfAllocate.ts`, `allocateVolunteer.ts`).
- Troca (`swap.ts`): a `Allocation` original é reatribuída no lugar (mesmo `slotId`) em vez de deletada — deletar dispararia cascade no `SwapRequest`.

### Cron

`app/api/cron/materialize` (06:00) e `app/api/cron/reminders` (11:00), agendados em `vercel.json`. Autorização por `Authorization: Bearer $CRON_SECRET` (`src/lib/cron.ts`); essas rotas ficam fora do matcher do middleware.

## Convenções

- Erros de domínio são classes/`Error` com mensagem-código em maiúsculas (`FORBIDDEN`, `NOT_ELIGIBLE`, `SLOT_TAKEN`); a camada de action traduz para texto pt-BR amigável ao usuário.
- Server Actions com formulário retornam estado `{ ok, error? }` para `useActionState`. Ao usar `try/catch` numa action que faz `redirect()`, re-lançar o erro de redirect (checar `digest` começando com `NEXT_REDIRECT`) — ver `app/(app)/escalas/actions.ts`.
- UI: mobile-first, `max-w-md`, nav inferior fixa (`src/ui/AppShell.tsx`), cores só via tokens do tema (`bg-surface`, `text-text-muted`, `text-primary`…) — nunca cores cruas do Tailwind, para o tema escuro (classe `.dark`) continuar válido.
- Testes unitários cobrem regra de negócio de risco (recorrência, exclusão com escopo, conflito de indisponibilidade, concorrência de vaga, agregações). Bug corrigido ganha teste que o reproduz.
