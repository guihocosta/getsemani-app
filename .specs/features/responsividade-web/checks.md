# Responsividade web checks

Mutations: 3
Build: `npm run typecheck`; `npm run lint`
Plan: `.specs/features/responsividade-web/plan.md`

32 checks in 4 slices · 4 one-way doors · 0 open, of which 0 block

## Checks

### S1 - Líder navega por menu lateral

**C1** - [x] Em 1023 px só a barra inferior aparece; em 1024 px só o menu lateral (AC 1)
Proof: `npx playwright test tests/e2e/shell.spec.ts -g "corte em 1024"`

**C2** - [x] `navItems` devolve os destinos na ordem do plano para voluntário sem repertório, voluntário com repertório, líder e admin sem ministério (AC 2)
Proof: `npx vitest run tests/unit/navItems.test.ts -t "itens por permissao"`

**C32** - [x] O menu real de uma voluntária sem repertório lista 8 itens, sem Repertório e sem Gestão (AC 2)
Proof: `npx playwright test tests/e2e/shell.spec.ts -g "menu do voluntario"`

**C3** - [x] `activeHref` marca só o href mais específico em `/escalas/panorama`, `/escalas/nova`, `/repertorio/escala/abc`, `/indisponibilidade` e `/` (AC 3)
Proof: `npx vitest run tests/unit/navItems.test.ts -t "item ativo"`

**C4** - [x] Em `/escalas/panorama`, o menu lateral marca Panorama com `aria-current="page"` e nenhum outro item (AC 3)
Proof: `npx playwright test tests/e2e/shell.spec.ts -g "item ativo no menu"`

**C5** - [x] Clicar em cada um dos 10 itens do menu da líder abre a rota do item (AC 4)
Proof: `npx playwright test tests/e2e/shell.spec.ts -g "cada item abre a rota"`

**C6** - [x] Gestão mostra o ponto com 1 pedido pendente e não mostra com 0 (AC 5)
Proof: `npx playwright test tests/e2e/shell.spec.ts -g "ponto de pendencia"`

**C7** - [x] Em 1024 × 600 e 1024 × 360, o menu fica em `top` 0 com a altura da janela com a página rolada, e Perfil é alcançável rolando o menu (AC 6)
Proof: `npx playwright test tests/e2e/shell.spec.ts -g "menu fixo"`

**C8** - [x] Uma rota que cai em `error.tsx` mantém o menu lateral (AC 7)
Proof: `npx playwright test tests/e2e/shell.spec.ts -g "erro mantem menu"`

**C9** - [x] As 6 rotas não têm rolagem horizontal de página em 1024, 1280 e 1920 px (AC 8)
Proof: `npx playwright test tests/e2e/shell.spec.ts -g "sem rolagem horizontal"`

**C10** - [x] `/escalas/nova`, `/perfil` e `/indisponibilidade` mantêm conteúdo com no máximo 448 px em 1280 px (AC 9)
Proof: `npx playwright test tests/e2e/shell.spec.ts -g "formulario em coluna"`

### S2 - Mouse e teclado funcionam

**C11** - [x] Arrastar o mouse 200 px em `/` não muda a rota (AC 10)
Proof: `npx playwright test tests/e2e/interacao.spec.ts -g "mouse nao troca aba"`

**C12** - [x] Gesto de toque de 200 px em `/` vai para `/vagas` (AC 10)
Proof: `npx playwright test tests/e2e/interacao.spec.ts -g "toque troca aba"`

**C13** - [x] Esc fecha o sheet de vaga (AC 11)
Proof: `npx playwright test tests/e2e/interacao.spec.ts -g "esc fecha sheet"`

**C14** - [x] Esc numa confirmação cancela: a escala segue pendente (AC 12)
Proof: `npx playwright test tests/e2e/interacao.spec.ts -g "esc cancela confirmacao"`

**C30** - [x] Esc fecha o sheet com o foco no `body`, depois de um controle interno sumir (AC 11)
Proof: `npx playwright test tests/e2e/interacao.spec.ts -g "esc fecha sheet com foco no body"`

**C31** - [x] Esc com confirmação aberta sobre um sheet fecha só a confirmação (AC 12)
Proof: `npx playwright test tests/e2e/interacao.spec.ts -g "esc na confirmacao mantem o sheet aberto"`

**C15** - [x] Sheet e confirmação expõem `role="dialog"` e `aria-modal="true"`, recebem o foco, retêm Tab e Shift+Tab e devolvem o foco ao controle de origem (AC 13)
Proof: `npx playwright test tests/e2e/interacao.spec.ts -g "dialogo acessivel"`

**C16** - [x] Em 1280 px, sheet e confirmação abrem centralizados com tolerância de 2 px, e o sheet tem botão "Fechar" visível que fecha (AC 14)
Proof: `npx playwright test tests/e2e/interacao.spec.ts -g "dialogo centralizado"`

**C17** - [x] Em 1280 px, `/` mostra as 3 pendências sem rolagem horizontal e sem "1 de 3", e as 3 podem ser confirmadas (AC 15)
Proof: `npx playwright test tests/e2e/interacao.spec.ts -g "pendencias visiveis"`

**C18** - [x] Em 1280 px, `/` mostra os 2 check-ins do dia sem rolagem horizontal e sem "1 de 2" (AC 15)
Proof: `npx playwright test tests/e2e/interacao.spec.ts -g "check-ins visiveis"`

**C19** - [x] As setas de `/admin` têm nomes "Mês anterior" e "Próximo mês" (AC 16)
Proof: `npx playwright test tests/e2e/interacao.spec.ts -g "setas nomeadas"`

**C29** - [x] Em 1280 px, `/` mostra as 2 próximas escalas do carrossel sem rolagem horizontal e sem "1 de 2" (AC 15)
Proof: `npx playwright test tests/e2e/interacao.spec.ts -g "proximas visiveis"`

### S3 - Telas densas usam a largura

**C20** - [x] Em 1280 px, Panorama com 5 datas e nomes de 20 caracteres exibe a tabela sem rolagem horizontal (AC 17)
Proof: `npx playwright test tests/e2e/telas.spec.ts -g "panorama cabe"`

**C21** - [x] Em 1280 px, Panorama com 10 datas e nome longo rola por dentro com a coluna Função fixa (AC 17)
Proof: `npx playwright test tests/e2e/telas.spec.ts -g "panorama rola por dentro"`

**C22** - [x] Em 1024 px, calendário e lista do dia de `/escalas` ficam lado a lado (AC 18)
Proof: `npx playwright test tests/e2e/telas.spec.ts -g "escalas lado a lado"`

**C23** - [x] Clicar em outro dia a partir de 1024 px troca a lista sem mover o calendário (AC 19)
Proof: `npx playwright test tests/e2e/telas.spec.ts -g "dia nao move calendario"`

**C24** - [x] Em 1024 px, `/admin` mostra os blocos do Resumo em 2 colunas ou mais, mantém "Nenhuma vaga em aberto neste mês" sem vagas e esconde Ministérios e Pessoas da líder (AC 20)
Proof: `npx playwright test tests/e2e/telas.spec.ts -g "gestao em colunas"`

**C25** - [x] Em 1024 px, `/admin/visao-geral` mostra 3 indicadores ou mais na primeira linha (AC 21)
Proof: `npx playwright test tests/e2e/telas.spec.ts -g "visao geral em colunas"`

### S4 - Celular continua igual

**C26** - [x] As 5 rotas em 390 e 768 px, temas claro e escuro, são idênticas ao baseline gerado antes de qualquer mudança de UI (AC 22)
Proof: `npx playwright test tests/e2e/mobile.spec.ts -g "celular igual ao commit base"`

**C27** - [x] Todos os arquivos de UI do diff não usam cor crua do Tailwind (AC 23)
Proof: `npx vitest run tests/unit/themeTokens.test.ts -t "so tokens"`

**C28** - [x] `CLAUDE.md` cita o ponto de corte `lg` e o menu lateral (AC 24)
Proof: `grep -q "lg:.*1024 px.*menu lateral" CLAUDE.md`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| perfis do menu (4) | voluntário sem repertório C2 · voluntário com repertório C2 · líder C2 · admin sem ministério C2 | - |
| itens do menu (10) | Início C2 · Vagas C2 · Escalas C2 · Panorama C2 · Agenda C2 · Avisos C2 · Repertório C2 · Aniversariantes C2 · Gestão C2 · Perfil C2 | - |
| rotas sem rolagem horizontal (6) | `/` C9 · `/vagas` C9 · `/escalas` C9 · `/escalas/panorama` C9 · `/admin` C9 · `/admin/visao-geral` C9 | - |
| larguras sem rolagem horizontal (3) | 1024 C9 · 1280 C9 · 1920 C9 | - |
| formulários em coluna (3) | `/escalas/nova` C10 · `/perfil` C10 · `/indisponibilidade` C10 | - |
| carrosséis de `/` (3) | pendências C17 · check-ins C18 · próximas C29 | - |
| diálogos (2) | sheet C13 C15 C16 C30 · confirmação C14 C15 C16 C31 | - |
| portas do plano (4) | ponto de corte C1 · harness C26 · config fora da raiz C26 · relógio C26 | - |
| rotas de regressão (5) | `/` C26 · `/escalas` C26 · `/escalas/panorama` C26 · `/admin` C26 · `/admin/visao-geral` C26 | - |
| larguras de regressão (2) | 390 C26 · 768 C26 | - |
| temas de regressão (2) | claro C26 · escuro C26 | - |

## Swept

- validation: n/a - nenhum campo ou limite novo
- failure modes: C8
- idempotency: n/a - nenhuma escrita nova
- authorization: C2, C24 - menu segue permissão; rotas mantêm `require*` existente
- concurrency: n/a - nenhuma escrita nova
- data lifecycle: n/a - nada persistido
- dependency failure: existing - `AppLayout` falha como hoje se a leitura do banco falhar, e `error.tsx` trata
- state transitions: C14 - cancelar não altera a alocação
- observability: n/a - sem requisito de log

## Handoff

- **Settled mid-build:** none
- **Dispatched:** Verifier em 73a6d91, returned; sem segunda rodada: `check_proofs.py` com `mutations.json` fecha a passada
- **Boundary:** none
- **Abandoned:** `supabase/` na raiz: o CLI falha ao parsear o `.env` de produção
- **Surfaced:** `listMonthOccurrences` não ordena `slots`; a ordem das funções segue o `roleId`. Script de tema causa hydration warning no `<html>` em tema escuro. Página 404 do Next aparece em inglês. Todos existem antes desta feature
- **Amended:** C5 dizia 9 itens; a líder do seed tem 10. Claim corrigida para 10 antes de o teste existir, mais estrita
- **Walked:** logada como líder com Supabase local em 1280 × 800: `/` mostra menu lateral com ponto em Gestão e pendências em grade; `/escalas` mostra calendário e dia lado a lado; `/escalas/panorama` mostra as 5 datas sem rolagem; `/admin` mostra Resumo em 2 colunas. O usuário chega a cada estado pelo menu lateral em janela de 1024 px ou mais
