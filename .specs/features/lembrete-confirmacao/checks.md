# Lembrete de confirmação checks

Mutations: 3
Build: `npm run typecheck`; `npm run lint`
Plan: `.specs/features/lembrete-confirmacao/plan.md`

29 checks in 6 slices · 1 one-way door · 0 open

## Checks

### S1 - Lembrar pendentes de uma data

**C1** - [x] `remindableAllocations` com vagas Ana `PENDING`, Bia `CONFIRMED`, convidado sem conta, vaga desativada com Davi `PENDING` e vaga vazia devolve só Ana (AC 4)
Proof: `npx vitest run tests/unit/remind.test.ts -t "so pendentes com conta"`

**C2** - [x] `canRemindOccurrence` é verdadeiro para data publicada, `ACTIVE`, que começa 1 ms depois de agora, e falso para rascunho, `CANCELLED`, data igual a agora e data 1 ms antes de agora (AC 2, AC 14)
Proof: `npx vitest run tests/unit/remind.test.ts -t "data lembravel"`

**C3** - [x] `remindSummary` devolve "Lembrete enviado para 1 pessoa" para (1, 0, 0); "Lembrete enviado para 2 pessoas · 1 já lembrada na última hora · 3 sem notificações ativadas" para (2, 1, 3); "2 já lembradas na última hora" para (0, 2, 0); "1 sem notificações ativadas" para (0, 0, 1) (AC 5)
Proof: `npx vitest run tests/unit/remind.test.ts -t "texto do resumo"`

**C4** - [x] `remindConfirmTitle(3)` devolve "Lembrar 3 pessoas que não confirmaram?" e `remindConfirmTitle(1)` devolve "Lembrar 1 pessoa que não confirmou?" (AC 3)
Proof: `npx vitest run tests/unit/remind.test.ts -t "titulo da confirmacao"`

**C5** - [x] `remindPending({ occurrenceId })` numa data com Ana `PENDING` e Bia `CONFIRMED` chama `notifyUser` uma vez, para Ana, com `type: "REMINDER"`, título "Confirme sua escala: Louvor", corpo "Bateria · <fmtDateTime da data>", `url: "/"` e `dedupeKey` igual a `manualReminderKey`, e devolve `{ enviados: 1, recentes: 0, semDispositivo: 0 }` (AC 4, AC 6)
Proof: `npx vitest run tests/unit/remindPending.test.ts -t "lembra pendentes da data"`

**C6** - [x] Lembrar pendentes no menu da data: em `/escalas`, a líder vê "Lembrar pendentes (1)" no menu "Mais ações" de Louvor 18/10, confirma em "Lembrar 1 pessoa que não confirmou?" com "Lembrar", e o card mostra "1 sem notificações ativadas" (AC 1, AC 3, AC 5)
Proof: `npx playwright test tests/e2e/lembrete.spec.ts -g "lembrar pendentes da data"`

**C7** - [x] O menu "Mais ações" omite "Lembrar pendentes" em Louvor 11/10 (já passou) e Louvor 08/11 (todos confirmados) (AC 2)
Proof: `npx playwright test tests/e2e/lembrete.spec.ts -g "menu sem pendentes"`

### S2 - Lembrar uma pessoa

**C8** - [x] `remindPending({ occurrenceId, allocationId })` com duas alocações `PENDING` chama `notifyUser` só para a pedida (AC 9)
Proof: `npx vitest run tests/unit/remindPending.test.ts -t "lembra uma pessoa"`

**C9** - [x] No modal da vaga em Louvor 18/10, a líder vê "Lembrar confirmação" na própria vaga `PENDING`, não vê na vaga confirmada de outra pessoa, e ao usar o botão o modal mostra "Sem notificações ativadas" (AC 7, AC 8, AC 9)
Proof: `npx playwright test tests/e2e/lembrete.spec.ts -g "lembrar uma pessoa"`

**C10** - [x] `remindOutcomeLabel` devolve "Lembrete enviado" para (1, 0, 0), "Já lembrado na última hora" para (0, 1, 0) e "Sem notificações ativadas" para (0, 0, 1) (AC 9)
Proof: `npx vitest run tests/unit/remind.test.ts -t "desfecho individual"`

### S3 - Limite e permissão

**C11** - [x] `isRecentReminder` é verdadeiro para último lembrete há 59 min e falso para 60 min e para nenhum (AC 10)
Proof: `npx vitest run tests/unit/remind.test.ts -t "janela de uma hora"`

**C12** - [x] `remindPending` busca o último lembrete pelo prefixo `lembrete-manual:<allocationId>:`; com o último há 59 min não chama `notifyUser` e conta `recentes: 1`; quando só existe lembrete do cron (busca manual sem resultado) envia (AC 10)
Proof: `npx vitest run tests/unit/remindPending.test.ts -t "ja lembrado na ultima hora"`

**C13** - [x] `manualReminderKey("a1", t)` devolve `lembrete-manual:a1:<floor(t / 3600000)>`, igual para 10:00:00 e 10:59:59 e diferente para 11:00:00 (AC 11, door 1)
Proof: `npx vitest run tests/unit/remind.test.ts -t "chave da janela"`

**C14** - [x] Duas chamadas de `notifyUser` com a mesma chave em paralelo, a segunda com `notification.create` rejeitando `P2002`, disparam `sendPush` uma vez só e devolvem `"sent"` e `"duplicate"`; `remindPending` conta `"duplicate"` em `recentes` e `"failed"` (erro de banco) em `falhas`, nunca em `enviados` (AC 11)
Proof: `npx vitest run tests/unit/remindPending.test.ts -t "corrida envia uma vez"`

**C15** - [x] `remindPending` para quem não tem `PushSubscription` não chama `notifyUser`, não grava `Notification` e conta `semDispositivo: 1` (AC 12)
Proof: `npx vitest run tests/unit/remindPending.test.ts -t "sem dispositivo"`

**C16** - [x] `remindPending` com `requireLeaderOf` lançando `FORBIDDEN` propaga `FORBIDDEN` e não chama `notifyUser` (AC 13)
Proof: `npx vitest run tests/unit/remindPending.test.ts -t "sem permissao"`

**C17** - [x] `remindPending` lança `NOT_REMINDABLE` sem chamar `notifyUser` para: data inexistente, rascunho, cancelada, já começada, `allocationId` de outra data, `allocationId` de convidado e `allocationId` `CONFIRMED` (AC 14)
Proof: `npx vitest run tests/unit/remindPending.test.ts -t "nao lembravel"`

**C18** - [x] `remindPendingAction` devolve `{ ok: false, code: "NOT_REMINDABLE" }` e `{ ok: false, code: "FORBIDDEN" }` dos erros do serviço, re-lança erro de redirect (`digest` `NEXT_REDIRECT`), e `MENSAGENS.NOT_REMINDABLE` é "Essa escala não pode ser lembrada agora." (AC 13, AC 14)
Proof: `npx vitest run tests/unit/remindPendingAction.test.ts -t "traduz erros"`

### S4 - Fechar dos modais

**C19** - [x] Em 390 px e em 1280 px, o modal da vaga tem um botão "Fechar" de pelo menos 44 × 44 px cuja borda direita fica a até 24 px da borda direita do painel e cujo topo fica nos primeiros 80 px do painel; o texto "Fechar" não aparece (AC 15)
Proof: `npx playwright test tests/e2e/lembrete.spec.ts -g "x no canto"`

**C20** - [x] Em 390 px o modal mostra a alça (`data-testid="alca"`), que não é botão; em 1280 px a alça não aparece (AC 16)
Proof: `npx playwright test tests/e2e/lembrete.spec.ts -g "alca no celular"`

**C21** - [x] O modal da vaga fecha pelo X, por toque fora do painel e por Esc (AC 17)
Proof: `npx playwright test tests/e2e/lembrete.spec.ts -g "fecha de tres jeitos"`

**C22** - [x] `Sheet` com título "Teste" renderiza o `h2` "Teste" e o botão `aria-label="Fechar"` no mesmo cabeçalho, título antes do botão (AC 15)
Proof: `npx vitest run tests/unit/sheetHeader.test.ts -t "titulo e x no cabecalho"`

**C23** - [x] Os modais de vaga extra, mudar horário e instalar app abrem com o X no cabeçalho e nada desalinhado em 390 px e 1280 px (AC 15, AC 17)
Proof: walk - abrir "Adicionar vaga extra" e "Mudar horário" no menu de uma data e o popup de instalar, em 390 px e 1280 px

### S5 - Menu lateral

**C24** - [x] Em 1280 px, o menu lateral tem a imagem com nome acessível "Getsêmani" e nenhum texto "Getsêmani" visível (AC 18)
Proof: `npx playwright test tests/e2e/lembrete.spec.ts -g "so o simbolo"`

### S6 - Achados do Verifier

**C25** - [x] `remindTargetsForDate` com 3 escalados com conta em `PENDING`, 1 `CONFIRMED`, 1 convidado, 1 vaga desativada `PENDING` e 1 vaga vazia, numa data publicada que começa 1 ms depois de agora, devolve as 3 alocações pendentes; `remindMenuLabel(3)` é "Lembrar pendentes (3)" e `remindMenuLabel(0)` não dá item; a mesma data em rascunho ou começando agora devolve nada (AC 1, AC 2, AC 7, AC 8)
Proof: `npx vitest run tests/unit/remind.test.ts -t "alvos da data na tela"`

**C26** - [x] No modal do convidado Zé Visitante (sem conta, `PENDING`) em Louvor 01/11, "Lembrar confirmação" não aparece (AC 8)
Proof: `npx playwright test tests/e2e/lembrete.spec.ts -g "convidado sem lembrete"`

**C27** - [x] `remindPending` sem `allocationId` numa data publicada e futura em que ninguém está `PENDING` (alguém confirmou depois de a tela carregar) lança `NOT_REMINDABLE` e não chama `notifyUser` (AC 14)
Proof: `npx vitest run tests/unit/remindPending.test.ts -t "lista vazia nao lembra"`

**C28** - [x] `lastNotificationAt("lembrete-manual:a1:")` busca com `dedupeKey startsWith` o prefixo e `orderBy createdAt desc`, devolve o `createdAt` achado ou `null` (AC 10)
Proof: `npx vitest run tests/unit/lastNotificationAt.test.ts -t "ultimo pelo prefixo"`

**C29** - [x] `remindSummary` com 1 enviada e 2 falhas devolve "Lembrete enviado para 1 pessoa · 2 não enviadas, tente de novo", com 1 falha só "1 não enviada, tente de novo"; `remindOutcomeLabel` com 1 falha devolve "Não deu para enviar, tente de novo" (AC 5, AC 9)
Proof: `npx vitest run tests/unit/remind.test.ts -t "falha de envio"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `remindPendingAction` statuses (4) | 200 `ok: true` C5 · `FORBIDDEN` C16 C18 · `NOT_REMINDABLE` C17 C18 · 303 login C18 | - |
| door 1: chave `lembrete-manual:` (2 facetas) | forma da chave C13 · unicidade na corrida C14 | - |
| AC 4 examples (4) | Ana `PENDING` C1 · Bia `CONFIRMED` C1 · convidado C1 · vaga desativada C1 | - |
| AC 10 examples (3) | 59 min C11 C12 · 60 min C11 · só cron C12 | - |
| NOT_REMINDABLE causes (7) | inexistente C17 · rascunho C17 · cancelada C17 · já começou C17 · outra data C17 · convidado C17 · `CONFIRMED` C17 | - |
| desfecho por pessoa (3) | enviado C5 · recente C12 · sem dispositivo C15 | - |
| controles (3) | "Lembrar pendentes" C6 · "Lembrar confirmação" C9 · X "Fechar" C21 | - |
| jeitos de fechar (3) | X C21 · fora do painel C21 · Esc C21 | - |
| larguras do X (2) | 390 px C19 · 1280 px C19 | - |
| modais de baixo (5) | vaga C19 · `Sheet` C22 · vaga extra C23 · mudar horário C23 · instalar app C23 | - |
| entidade `Notification` (1) | linha nova com chave manual C5 · nenhuma sem dispositivo C15 | - |

## Swept

- validation: C17
- failure modes: C14
- idempotency: C13, C14
- authorization: C16, C18
- concurrency: C14
- data lifecycle: n/a - nada digitado pelo usuário é guardado; `Notification` já vive pelo usuário (cascade)
- dependency failure: existing - `notifyUser` engole falha de push e loga (`tests/unit/notifyNeverThrows.test.ts`)
- state transitions: C2 - lembrar não muda o estado da alocação nem da data
- observability: existing - `notifyUser` e `handleActionError` logam com ref

## Handoff

- **Settled mid-build:** achado 5 do Verifier (falha de banco contada como "já lembrada"): usuário escolheu "Contar como falha (Recomendado)" - P2002 na corrida vira `"duplicate"`, erro de banco vira contador `falhas` com "não enviada(s), tente de novo"; C14 reescrito, C29 novo
- **Dispatched:** Verifier em `f331fbf` (sem screens: nenhum critério cita captura)
- **Boundary:** C1-C24 fechados no commit da feature
- **Abandoned:** fechar pelos três jeitos na mesma página: com `page.clock.setFixedTime` do harness, a animação de saída do framer trava na segunda abertura (sem relógio fixo passa); cada jeito ganhou página nova. Achado real no caminho: em 1280 px o fundo do modal ficava preso dentro da transição de rota (ancestral com `transform` vira containing block de `fixed`) e o menu lateral ficava descoberto e clicável; `src/ui/Portal.tsx` leva `BottomSheet` e `ConfirmDialog` para `document.body` (C21 "fora" prova). Outros defeitos corrigidos ao fotografar: padding duplo (`p-4` dentro do `px-4` do painel) em vaga extra e mudar horário; título "Adicionar Vaga Extra" em Title Case virou "Adicionar vaga extra". Asserções antigas que provavam o texto "Fechar" (`interacao.spec.ts`) e o nome ao lado do símbolo (`marca.spec.ts`) mudaram junto com AC 15 e AC 18.
- **Walked:** líder, tema escuro, `/escalas?mes=2026-10` → 18/10 → Louvor: modal da vaga (Lia, "Lembrar confirmação") em 390 e 1280; menu "Mais ações" com "Lembrar pendentes (1)" em 390; "Adicionar vaga extra" em 390 e "Mudar horário" em 1280 - X à direita do cabeçalho, título à esquerda, sem padding duplo. Popup de instalar não abre no Chrome desktop do harness (só plataforma móvel); usa o mesmo `BottomSheet`. Fora do escopo: `shell.spec.ts` "cada item abre a rota" já falhava antes (espera 10 links, menu tem 11 desde "Visão geral").
