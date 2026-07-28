# Design: melhorias de UX — alocação de escala, home e navegação por mês em Gestão

## Contexto

Três pontos de UX levantados pelo usuário no app:

1. Alocação de vaga na tela Escalas (`OccurrenceRow.tsx`) tem excesso de
   botões/tags espremidos numa linha.
2. Tela Inicial (`app/(app)/page.tsx`) virou lista repetitiva de cards, sem
   diferenciar papel do usuário nem dar visão de gestão pra quem lidera.
3. Lista "Vagas sem ninguém" em Gestão (`app/(app)/admin/page.tsx`) empilha
   todos os meses futuros de uma vez, virando tela gigante.

Cada item foi validado contra achados de UX (Nielsen Norman Group) durante o
brainstorm — anotados em cada seção abaixo.

---

## 1. Alocação de escala — bottom sheet

### Problema

Em `OccurrenceRow.tsx`, cada slot mistura na mesma linha: label da função
(`w-24 shrink-0`), nome + badges (`sem conta`/`aguardando confirmação`/
`indisponível`), botão "trocar", `AllocatePicker` (dropdown inline com
busca/lista/form de convidado) e botão de desativar (`X`). Resultado: linha
sobrecarregada, pouco espaço pra cada elemento.

### Decisão: bottom sheet, não fullscreen

Cogitou-se popup fullscreen; pesquisa de UX (NN/G, "Bottom Sheets: Definition
and UX Guidelines") mostra que fullscreen é adequado a fluxos de alta atenção
(checkout, onboarding) e que modais fullscreen tendem a ser fechados na hora
quando o usuário sente estar sendo bloqueado numa ação rápida. Alocar uma vaga
é ação rápida e pontual, e o usuário se beneficia de manter contexto (qual
culto/data é essa vaga) visível atrás do sheet. Por isso: **bottom sheet**,
não fullscreen.

### Comportamento

- `OccurrenceRow` passa a renderizar cada slot como **linha resumida
  tocável**: `Role: Nome` (+ badges pequenos ao lado do nome) quando
  preenchido, ou `Role: — vaga aberta` com cor de atenção quando vazio.
  Nenhum botão/dropdown fica inline na linha.
- Tocar em **qualquer slot** (vazio ou preenchido) abre um bottom sheet
  (`SlotDetailSheet`, novo componente) cobrindo a maior parte da tela mas
  deixando o topo do card (título + data) visível atrás.
  - **Handle de arrastar/fechar visível no topo do sheet** (obrigatório —
    NN/G recomenda affordance clara de dispensa, evita fechamento acidental
    ou sensação de estar preso).
  - Slot vazio: sheet mostra o que hoje é o conteúdo do `AllocatePicker`
    aberto — lista de candidatos (com badge "Indisponível" quando aplicável),
    busca, nomes de guest já usados, formulário "+ Pessoa sem conta".
  - Slot preenchido: sheet mostra quem está alocado, status
    (`PENDING`/badge "sem conta"/check-in), e as ações "trocar" (reabre a
    mesma lista de candidatos dentro do sheet) e "desativar vaga" (mesmo
    fluxo de confirmação de hoje via `useConfirm`).
- Todos os itens tocáveis dentro do sheet (linha de candidato, botão
  fechar/handle, botões de ação) respeitam área mínima de toque 44×44px.
- Fechar o sheet (handle, tap fora, ou ação concluída) volta pra lista
  resumida; atualização de estado local segue o padrão atual
  (`onAllocated`/`onActiveChanged` do `EscalaCalendar`).

### Header do card (ações de gestão)

Os 4 botões hoje lado a lado (copiar WhatsApp, editar, excluir esta, excluir
daqui em diante) viram um **menu `⋮`** que abre dropdown/sheet simples com as
4 opções rotuladas. Reduz ruído visual do header sem remover nenhuma ação —
são ações pouco frequentes, aceitável exigir mais um toque.

### Componentes afetados

- `app/(app)/escalas/OccurrenceRow.tsx`: remove renderização inline de
  `AllocatePicker`/ações por slot; vira lista resumida + handlers que abrem
  o sheet. Header vira menu `⋮`.
- `app/(app)/escalas/AllocatePicker.tsx`: lógica de candidatos/busca/guest
  migra para dentro do novo `SlotDetailSheet`; componente atual de dropdown
  inline é removido ou absorvido.
- Novo: `app/(app)/escalas/SlotDetailSheet.tsx` (client component).
- `src/ui/`: se não existir primitiva de bottom sheet reutilizável ainda,
  criar uma (`BottomSheet.tsx`) seguindo o padrão de `ConfirmDialog.tsx`
  existente (portal, overlay, foco).

### Fora de escopo

- Mudança na lógica de negócio de alocação/troca/desativação (services já
  testados) — só reorganização de UI.
- Seção de "vagas desativadas" no fim do card continua como está.

---

## 2. Tela Inicial — home por papel + carrossel

### Problema

Home hoje é sempre "minhas próximas escalas": card grande da próxima +
lista de cards idênticos pra "Depois", cada um repetindo ministério/role/
data/hora/status/ações. Pesado de ler rápido, e não diferencia quem lidera
ministério/admin (que hoje só vê as próprias escalas, igual voluntário
comum).

### Home muda conforme papel

- Voluntário comum: mantém "Próxima escala" (card grande, igual hoje) +
  lista de "Depois".
- Líder de ministério / admin: além do que já vê como voluntário (se tiver
  escalas próprias), home ganha um bloco de resumo de gestão com
  **solicitações pendentes** (pedidos de acesso a ministério, trocas
  aguardando aprovação) — número + link rápido pra `/solicitacoes`.
  - Vagas sem ninguém e pessoas sem conta pendentes **ficam fora** deste
    bloco (avaliado e descartado no brainstorm — só solicitações pendentes
    entra na home).

### "Depois" vira carrossel horizontal com peek

- Card "Próxima escala" continua como está hoje (destacado, hora grande,
  ações).
- Itens de "Depois" (a partir do 2º) passam de lista vertical de cards para
  **scroll horizontal com snap**, mostrando uma fatia (peek) do próximo
  cartão na borda direita, mais indicador de posição (ex.: "2 de 4").
  - Motivo do peek + indicador: pesquisa de UX (NN/G, "Carousel Usability")
    mostra que carrosséis sofrem de "banner blindness" — cliques no 1º item
    ~1%, itens seguintes menos ainda, conteúdo além do primeiro é ignorado.
    O peek sinaliza visualmente "tem mais aqui" em vez de esconder atrás de
    swipe cego, mitigando o problema.
  - Peek é o cartão real (tocável), não decoração — dá acesso por tap além
    do gesto de arrastar, cobrindo quem não descobre o swipe.
  - Cada cartão do carrossel mantém estrutura já reduzida (ministério, role,
    data/hora, status se `PENDING`, ações de `AllocationActions`).

### Componentes afetados

- `app/(app)/page.tsx`: passa a checar papel do usuário (`isLeaderOfAny` /
  `user.isAdmin`, já disponíveis em `authz.ts`) pra decidir se renderiza o
  bloco de solicitações pendentes; busca a contagem via serviço já existente
  usado em `admin/page.tsx` (`prisma.membership.count` com `status:
  "PENDING"`, escopado por `ledMinistryIds` quando não-admin).
- Novo: componente de carrossel (`app/(app)/UpcomingCarousel.tsx` ou
  similar) — scroll horizontal com `scroll-snap`, sem dependência externa.

### Fora de escopo

- Card "Próxima escala" não muda de layout (já ajustado em spec anterior,
  `2026-07-27-home-schedule-card-layout-design.md`).
- Bloco de vagas abertas / pessoas sem conta na home — descartado nesta
  rodada.

---

## 3. Vagas sem ninguém (Gestão) — navegação por mês

### Problema

`app/(app)/admin/page.tsx` busca `openSlots(now, scopeIds)` sem limite
superior de data (só `take: 200`) e agrupa por mês só na renderização — todos
os meses futuros aparecem empilhados na mesma página.

### Decisão

Reusa o padrão já existente em `EscalaCalendar.tsx`: navegação
`< Mês Ano >` com setas, mostrando um mês por vez.

### Comportamento

- `admin/page.tsx` lê `searchParams.vagasMes` (`YYYY-MM`); default = mês
  atual (mesmo sem vaga aberta nele — não pula pro primeiro mês com dado).
- Seção "Vagas sem ninguém" ganha cabeçalho `< Mês Ano >`; setas são
  `Link href="/admin?vagasMes=YYYY-MM"` (navegação via App Router, sem
  client state — resto da página de Gestão não precisa recarregar em client
  component).
- Mês sem vaga aberta: mantém `EmptyState`, com subtítulo mais específico
  ("Nenhuma vaga em aberto neste mês") em vez do texto genérico atual.

### Componentes/serviços afetados

- `src/modules/reports/services/reports.ts`: `openSlots(from, to,
  ministryIds?)` ganha parâmetro `to` pra limitar a janela ao mês
  consultado (mantém `from`/`ministryIds` como já são usados por outras
  chamadas, se houver).
- `app/(app)/admin/page.tsx`: calcula `from`/`to` do mês a partir de
  `vagasMes`, chama `openSlots` só com esse intervalo, renderiza a
  navegação de mês reaproveitando o padrão visual de `EscalaCalendar.tsx`
  (não precisa ser o mesmo componente client — aqui pode ser server-only
  com `Link`).

### Fora de escopo

- Outras seções de "Gestão" ("Carga por pessoa", "Voluntários por
  ministério") não mudam.
- Pré-carregamento de meses vizinhos (cache local como em `EscalaCalendar`)
  — não necessário aqui, é navegação simples via `Link`, sem otimização de
  troca instantânea.

---

## Testes

Nenhum dos três itens muda regra de negócio de domínio — são reorganizações
de UI/apresentação sobre services e actions já testados
(`allocateAction`, `reassignAllocationAction`, `setSlotActiveAction`,
`openSlots`). Validar manualmente no `npm run dev`:

1. Alocar vaga vazia, trocar vaga preenchida, desativar/reativar vaga —
   conferir que o bottom sheet abre, fecha, e reflete o mesmo estado que
   hoje reflete inline.
2. Home como voluntário comum, como líder de ministério com solicitação
   pendente, e como admin — conferir bloco de resumo aparece só quando
   aplicável. Testar carrossel com 2, 3+ itens em "Depois" (peek e
   indicador corretos) e com 0/1 item (sem carrossel).
3. Gestão: navegar `< >` em "Vagas sem ninguém" por meses com e sem vaga
   aberta; conferir `EmptyState` e que outras seções da página não recarregam
   junto.

Se algum dos três (especialmente o bottom sheet, que introduz componente
novo) ganhar lógica não-trivial de estado, adicionar teste conforme
convenção do projeto (bug corrigido ganha teste que o reproduz).
