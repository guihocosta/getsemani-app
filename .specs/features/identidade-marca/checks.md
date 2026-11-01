# Identidade de marca checks

Mutations: 3
Build: `npm run typecheck`; `npm run lint`
Plan: `.specs/features/identidade-marca/plan.md`

24 checks in 5 slices · 3 one-way doors · 0 open, of which 0 block

## Checks

### S1 - Cards da tela inicial na mesma largura

**C1** - [x] Em 390 px, com 3 itens em "Depois", cada card de "Depois" e "Próxima escala" mede 358 px e "1 de 3" aparece (AC 1)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "largura celular varios"`

**C2** - [x] Em 390 px, com 1 item em cada grupo, os 4 cards da tela inicial medem 358 px (AC 1)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "largura celular um card"`

**C3** - [x] Rolar "Depois" para o segundo card em 390 px troca o contador para "2 de 3" (AC 2)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "contador do carrossel"`

**C4** - [x] Em 1280 px, um card sozinho em "Depois", "Você foi escalado!" ou "Sua Escala Hoje" mede o mesmo que "Próxima escala" (AC 3)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "largura web um card"`

**C5** - [x] Em 1280 px, 2 itens ficam em duas colunas na mesma linha, e 3 itens deixam o terceiro em meia linha na linha de baixo (AC 3)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "largura web varios"`

**C6** - [x] Depois de usar "Fazer Check-in", "Check-in feito" aparece em `rgb(48, 142, 240)` no escuro, e nenhum arquivo usa `text-success` (AC 4)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "check-in com cor"`
Proof: `npx vitest run tests/unit/marca.test.ts -t "sem text-success"`

### S2 - Cores da marca

**C7** - [x] O bloco `.dark` declara `bg #141518`, `surface #1c1e23`, `border #2b2e35`, `text #f4f6f9`, `text-muted #8c929c`, `primary #308ef0`, `danger #e0605a` (AC 5)
Proof: `npx vitest run tests/unit/marca.test.ts -t "tokens escuro"`

**C8** - [x] O bloco `@theme` declara `bg #f4f6f9`, `surface #ffffff`, `text #141518`, `primary #164f94` (AC 6)
Proof: `npx vitest run tests/unit/marca.test.ts -t "tokens claro"`

**C9** - [x] `brand` é `#2a78cd` e `brand-hover` é `#164f94` nos dois temas, e nenhum fundo sólido com `text-white` usa `bg-primary` (AC 7)
Proof: `npx vitest run tests/unit/marca.test.ts -t "preenchimento usa brand"`

**C10** - [x] Cada par de texto listado nos dois temas atinge 4,5:1 calculado a partir dos tokens, e `danger` claro é a única exceção (AC 8)
Proof: `npx vitest run tests/unit/marca.test.ts -t "contraste"`

**C11** - [x] Nenhum arquivo de texto em `app/`, `src/` e `public/` contém `#4f46e5`, `#6366f1`, `#6d28d9`, `#020617`, `rgba(79,70,229` ou `indigo-` (AC 9)
Proof: `npx vitest run tests/unit/marca.test.ts -t "sem cor antiga"`

**C12** - [x] Os formulários de criar e editar ministério e o cartão usam `#2a78cd` só como padrão, com `color ??` preservando a cor salva (AC 10)
Proof: `npx vitest run tests/unit/marca.test.ts -t "cor padrao de ministerio"`

**C13** - [x] `manifest.webmanifest`, `offline.html`, `global-error` e o `theme-color` criado no layout usam grafite, sem o fundo slate (AC 11)
Proof: `npx vitest run tests/unit/marca.test.ts -t "grafite fora do app"`

**C14** - [x] No tema escuro, `color-scheme` calculado do `<html>` é `dark`, para campos nativos acompanharem o fundo grafite (AC 5)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "color-scheme escuro"`

### S3 - Tema escuro por padrão

**C15** - [x] Sem `theme` salvo e com o sistema em claro, `/login` abre com `.dark` no `<html>` e um único `theme-color` `#141518` (AC 12)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "padrao escuro"`

**C16** - [x] Com `theme=light` salvo, o app abre sem `.dark` e com um único `theme-color` `#f4f6f9` (AC 13)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "claro salvo"`

**C17** - [x] Clicar no botão de tema em `/perfil` troca a classe, salva `theme`, troca `theme-color` e sobrevive a recarregar (AC 14)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "botao de tema"`

### S4 - Nome e logo

**C18** - [x] Os 8 arquivos com texto visível escrevem "Getsêmani" e nenhum escreve "Getsemani" (AC 15)
Proof: `npx vitest run tests/unit/marca.test.ts -t "nome com acento"`

**C19** - [x] No menu lateral, o símbolo visível é azul no claro e branco no escuro, carregado, com pelo menos 24 px, proporção 204:219 e sem sombra nem filtro (AC 16)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "simbolo no menu"`

**C20** - [x] Em `/login`, com `theme=light` salvo, o símbolo branco carrega sem sessão, com pelo menos 24 px, sobre fundo `rgb(20, 21, 24)` (AC 17)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "simbolo no login"`

### S5 - Login com assinatura

**C21** - [x] Em `/login`, o brilho está colado no rodapé e ocupa de 30% a 40% da altura da tela (AC 18)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "brilho no login"`

**C22** - [x] Em `/login`, o grão tem opacidade `0.07`, `mix-blend-mode: overlay`, sem animação, e "Entrar com Google" recebe clique e foco por teclado (AC 19)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "grao no login"`

**C23** - [x] `/`, `/escalas` e `/perfil` não têm `.assinatura` (AC 20)
Proof: `npx playwright test tests/e2e/marca.spec.ts -g "sem assinatura fora do login"`

**C24** - [x] As 5 rotas em 390 e 768 px, nos dois temas, batem com as imagens regeneradas nesta feature (plano, `Changes underneath`)
Proof: `npx playwright test tests/e2e/mobile.spec.ts`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| grupos de card (4) | "Próxima escala" C1 C2 C4 · "Depois" C1 C2 C4 C5 · "Você foi escalado!" C2 C4 · "Sua Escala Hoje" C2 C4 C5 | - |
| larguras de janela (2) | 390 C1 C2 C3 · 1280 C4 C5 | - |
| exemplos do AC 3 (3) | 1 item C4 · 2 itens C5 · 3 itens C5 | - |
| tokens escuros (7) | C7, table-driven sobre os 7 | - |
| tokens claros (4) | C8, table-driven sobre os 4 | - |
| pares de contraste (7) | C10, table-driven sobre os 7: `primary` e `text-muted` sobre `surface` nos dois temas, `primary` sobre `bg` nos dois temas, branco sobre `brand` | - |
| cores antigas (6) | C11, table-driven sobre as 6 | - |
| superfícies fora do app (4) | manifest C13 · offline C13 · global-error C13 · themeColor C13 | - |
| estados de tema (3) | sem salvo C15 · claro salvo C16 · botão C17 | - |
| arquivos com o nome (8) | C18, table-driven sobre os 8 | - |
| símbolo (2 lugares) | menu lateral C19 · login C20 | - |
| door 1: tokens separados (2) | preenchimento C9 · contraste C10 | - |
| door 2: tema padrão (1) | sem tema salvo C15 | - |
| door 3: só Gotham (1) | sem arquivo Monument em `public/fonts` C13 | - |

## Swept

- validation: n/a - nenhuma entrada nova
- failure modes: C20 - símbolo carrega sem sessão, com o middleware no caminho
- idempotency: n/a - nada escrito além de `localStorage.theme`
- authorization: existing - `/login` e rotas seguem iguais; imagem do símbolo é pública como `/icons`
- concurrency: n/a - sem estado compartilhado
- data lifecycle: C12 - cor salva de ministério preservada; C16 - tema salvo respeitado
- dependency failure: existing - `localStorage` bloqueado cai no `try/catch` do script de tema
- state transitions: C17
- observability: n/a - sem requisito de log

## Handoff

- **Settled mid-build:** none
- **Dispatched:** Verifier 1 em `7dd187f`: perdido com a queda da sessão, sem relatório. Verifier 2 em `7dd187f`+handoff; sem screens: nenhum critério cita captura
- **Boundary:** C1-C24 fechados em `e768051`
- **Abandoned:** none
- **Walked:** login, home em 390 px (claro e escuro) e `/escalas` em 1280 px (claro e escuro), abertos no stack local e olhados nas imagens; check-in feito e carrossel provados no e2e
