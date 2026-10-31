# Discovery — Responsividade web

**Data:** 30/10/2026
**Fonte:** leitura estática do código em `master` (`49e8573`) e dos docs do repo.
**Objetivo:** levantar o que falta para o app funcionar bem em telas largas, sem piorar o celular.
**Limite:** nenhuma tela foi aberta em navegador nesta rodada. Tudo abaixo vem do código; o que depende de comportamento em runtime está marcado como **inferido**.

---

## 1. Conclusão

O app não é responsivo para web: é uma coluna de celular centralizada. Em 1440 px, 448 px de conteúdo e cerca de 1000 px vazios.

A mudança cabe em duas frentes de tamanhos bem diferentes:

- **Shell e interação (barato, alcança as 21 rotas):** `AppShell`, `SwipeNav`, `BottomSheet`, `ConfirmDialog` e carrosséis. Sem isso, o uso com mouse tem falhas de funcionamento, não só de estética.
- **Telas densas (trabalho por tela):** Panorama, Escalas, Gestão, Visão geral e Pessoas. É onde a largura extra rende. As demais telas ficam bem como coluna centralizada.

Não há plano anterior: nenhum spec, plano ou branch trata disso. O item mais próximo, T083 em `specs/001-escalas-mvp/tasks.md:125`, fala só de responsividade mobile e segue aberto.

## 2. Estado atual

| Item | Fato | Evidência |
|---|---|---|
| Largura | Shell e nav travados em `max-w-md` (448 px) | `src/ui/AppShell.tsx:38,56` |
| Breakpoints | Zero `md:`, `lg:`, `xl:`; 6 usos de `sm:`, sempre em formulário ou título | grep em `app/` e `src/` |
| Navegação | Barra inferior com 4 ou 5 abas | `src/ui/AppShell.tsx:14-21,60` |
| Sem aba | Avisos, Repertório, Aniversariantes e Agenda só por link em Início/Perfil; Panorama só por link em Escalas | `app/(app)/page.tsx:93-98`, `app/(app)/perfil/page.tsx:53`, `app/(app)/escalas/page.tsx:64` |
| Regra escrita | `CLAUDE.md` manda `max-w-md` e nav inferior | `CLAUDE.md:86` |
| Constituição | Mobile-first porque o uso diário é do voluntário no celular. Não proíbe web | `.specify/memory/constitution.md` (princípio VI) |
| PWA | `display: standalone`, sem trava de orientação | `public/manifest.webmanifest:6` |
| Provas | `tests/e2e` não existe; só `tests/unit`. Playwright configurado sem spec e sem sessão de teste | `playwright.config.ts`, `docs/validacao/2026-10-16-front.md` (F-09) |
| Evidência de uso | Nenhuma: sem analytics no `package.json`, sem dado de quem abre no desktop | grep em `package.json` |

Referência de mercado: o LouveApp usa menu lateral (`docs/discovery/2026-09-21-louveapp.md`, seção 1).

## 3. Problemas achados

### Funcionamento com mouse e teclado

| ID | Sev. | Problema | Evidência |
|---|---|---|---|
| W-01 | Alta | Arrastar o mouse 70 px sobre a página troca de aba, pois `SwipeNav` não distingue mouse de toque. Selecionar texto vira navegação (**inferido**) | `src/ui/SwipeNav.tsx:29-41` |
| W-02 | Alta | Carrosséis com scrollbar oculta e sem setas: com mouse comum, o 2º card em diante só abre com Shift+roda. Inclui escalas a confirmar, que pedem ação (**inferido**) | `app/(app)/UpcomingCarousel.tsx:27-28`, `app/(app)/PendingConfirmationsCard.tsx:53`, `app/(app)/TodayCheckInCard.tsx:48` |
| W-03 | Média | Sheets e diálogos não fecham com Esc, sem `role="dialog"` e sem foco preso. Quem usa teclado segue tabulando atrás do overlay | `src/ui/BottomSheet.tsx`, `src/ui/ConfirmDialog.tsx` |
| W-04 | Média | Sheet sobe da base da tela, longe do clique, com alça como único botão de fechar visível. O spec de vaga extra cita "Modal no desktop, seguindo o padrão atual", mas esse padrão não existe | `src/ui/BottomSheet.tsx:20-27`, `docs/superpowers/specs/2026-07-31-vaga-extra-avulsa-design.md:40` |
| W-05 | Baixa | Setas de mês em Gestão com ícone 16 px, sem `aria-label` e sem alvo de 44 px | `app/(app)/admin/page.tsx:120-138` |
| W-06 | Baixa | Calendário não tem `data-no-swipe`, embora o comentário do `SwipeNav` diga que tem. Afeta o celular também | `src/ui/SwipeNav.tsx:15-16`, `app/(app)/escalas/EscalaCalendar.tsx` |
| W-07 | Baixa | Textos falam "toque" para quem usa mouse, ex.: "Toque em Nova para criar uma." | `app/(app)/escalas/EscalaCalendar.tsx:232` |

### Aproveitamento da tela

| Tela | Hoje | Ganho em tela larga | Prioridade |
|---|---|---|---|
| `/escalas/panorama` | Tabela função × data com `min-w-24` por coluna, rola na lateral dentro de 448 px | Liberar largura; é a tela que mais pede monitor | P1 |
| `/escalas` | Calendário em cima, escalas do dia embaixo | Calendário e detalhe lado a lado | P1 |
| `/admin` | Links, vagas, carga, presença e voluntários em coluna longa | Painel com blocos em colunas | P1 |
| `/admin/visao-geral` | `grid-cols-2` fixo | Mais colunas de indicadores | P1 |
| `/admin/pessoas` | Um card por pessoa, com vínculos dentro | Grade de cards ou tabela | P2 |
| `/` | Carrosséis e atalhos | Cards visíveis lado a lado (resolve W-02) | P1 |
| `/repertorio`, `/avisos`, `/vagas`, `/admin/ministerios`, `/admin/convidados` | Listas | Grade, opcional | P2 |
| `/escalas/nova`, `/escalas/[id]/editar`, `/perfil`, `/indisponibilidade`, `/onboarding`, `/login`, `/solicitacoes`, `/aniversariantes`, `/repertorio/[id]`, `/repertorio/escala/[id]` | Formulários e leitura | Nenhum: coluna estreita é a melhor largura | Só herdar o shell |

## 4. Riscos

- **Regressão no celular.** Toda a UI passa pelo `AppShell`, e o uso principal é celular. A regra precisa ser: abaixo do breakpoint, nada muda.
- **Sem prova automática de tela.** Há só testes unitários com Prisma mockado, e o handoff de `.specs/STATE.md` registra que telas não foram abertas em navegador. Responsividade não se prova com grep. Docker está instalado, então Postgres local + `test:local` + Playwright com sessão de teste é viável, mas fechar o F-09 é trabalho próprio.
- **Sidebar e `fixed`.** `SwipeNav` e a animação de rota aplicam transform. A sidebar precisa ficar fora deles, e sheets precisam continuar relativos à viewport.
- **Conflito de documentação.** `CLAUDE.md:86` precisa mudar na mesma entrega; senão a próxima feature volta a nascer travada em `max-w-md`.

## 5. Decisões

Tomadas pelo responsável em 30/10/2026 e registradas em `.specs/STATE.md` (AD-009):

| Pergunta | Resposta |
|---|---|
| Quem usa no computador | Líderes e admins, para montar escala e gerir |
| Até onde vai a entrega | Shell e telas densas; formulários seguem em coluna |
| Larguras | Abaixo de 1024 px fica como hoje, tablet incluso; a partir daí, layout web |
| Navegação de tela larga | Menu lateral com as abas e os destinos sem aba |

Plano: `.specs/features/responsividade-web/plan.md`.
