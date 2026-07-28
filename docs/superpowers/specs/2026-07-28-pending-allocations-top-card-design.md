# Design Doc: Card Dedicado de Confirmações Pendentes na Home

**Data:** 2026-07-28  
**Status:** Aprovado pelo Usuário  

---

## 1. Visão Geral e Motivação

Atualmente, na tela inicial (`app/(app)/page.tsx`), as alocações com status `PENDING` (aguardando confirmação do voluntário) disputavam espaço diretamente com as escalas já confirmadas no card principal de "Próxima escala" e no carrossel "Depois".

Isso gerava confusão de UX:
1. O voluntário não conseguia diferenciar com clareza o que era sua agenda real (confirmada) de uma convocação que exigia decisão.
2. Os botões de ação ("Não posso" / "Confirmar") apresentavam assimetria visual (um link de texto vermelho ao lado de um botão preenchido grande).

Este design introduz um **card dedicado de confirmações no topo da tela**, desassociado da lista de escalas confirmadas.

---

## 2. Mudanças de UI & UX

### 2.1. Card Dedicado no Topo (`PendingConfirmationsCard`)
- **Posicionamento**: Acima do bloco de "Próxima escala", visível apenas quando o usuário possui 1 ou mais alocações com `status === "PENDING"`.
- **Cabeçalho**:
  - `eyebrow` indicando "Confirmações pendentes" ou "Você foi escalado!".
  - Se houver mais de 1 pendência, exibe contador no canto superior direito (ex: `1 de 2`) com navegação/carrossel por swipe.
- **Estrutura Interna**:
  - Nome do Ministério em tom primário sutil.
  - Nome da Função com badge compacta e sutil ao lado: `[Aguardando confirmação]` (sem caixa alta agressiva, tom `info` azul suave).
  - Data e Hora em destaque.
- **Ações de Confirmação**:
  - Barra de ações inferior simétrica (`grid grid-cols-2 gap-3`).
  - Botão **"Não posso"**: `variant="secondary"` (borda sutil, fundo neutro suave, mesmo tamanho/altura/curvatura do botão principal). Aciona modal de confirmação antes de disparar `declineAllocationAction`.
  - Botão **"Confirmar"**: `variant="primary"` (preenchido com cor principal de marca). Dispara `confirmAllocationAction`.

### 2.2. Reformulação de "Próxima escala" e "Depois"
- A lista de escalas retornada por `getMySchedule(user.id)` é filtrada na `HomePage`:
  - `pendingItems = items.filter(i => i.status === "PENDING")`
  - `confirmedItems = items.filter(i => i.status === "CONFIRMED")`
- **"Próxima escala"**: Exibe estritamente o primeiro item de `confirmedItems`.
- **"Depois"**: Exibe os itens subsequentes (`confirmedItems.slice(1)`).
- **Sem duplicidade**: Itens pendentes **não** aparecem em "Próxima escala" nem em "Depois" enquanto não forem confirmados.

---

## 3. Arquitetura e Componentes

### 3.1. Arquitetura de Arquivos
- **Novo componente client-side**: `app/(app)/PendingConfirmationsCard.tsx`
  - Recebe as alocações pendentes (`items: UpcomingItem[]`).
  - Gerencia navegação entre múltiplos convites pendentes (estado local de índice ativo).
  - Inclui as ações de confirmação/recusa com `useTransition` e `useConfirm`.
- **Modificações em `app/(app)/page.tsx`**:
  - Separa `items` de `getMySchedule` em `pendingItems` e `confirmedItems`.
  - Renderiza `<PendingConfirmationsCard items={pendingItems} />` se `pendingItems.length > 0`.
  - Passa `confirmedItems` para o card "Próxima escala" e `UpcomingCarousel`.
- **Limpeza em `app/(app)/UpcomingCarousel.tsx` e `AllocationActions.tsx`**:
  - Como `AllocationActions` não precisa mais tratar o estado `PENDING` inline dentro da lista confirmada, seu escopo fica limpo para apenas gerenciamento de Check-in e Troca de Escala.

---

## 4. Casos de Borda e Erros

1. **Zero pendências**: O componente do topo não renderiza (`null`), mantendo a tela limpa.
2. **0 confirmadas, 1 pendente**: O card de confirmação aparece no topo. A seção "Próxima escala" mostra `EmptyState` ("Nenhuma escala confirmada").
3. **Múltiplos convites pendentes**: Exibe navegação tipo carrossel ("1 de N") mantendo os botões simétricos para cada item.
4. **Respostas em andamento**: Durante o envio do Server Action, ambos os botões do card pendente entram em estado desativado (`disabled`).
