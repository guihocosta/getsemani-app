# Cancelar vaga sem ninguém alocado — Specification

## Problem Statement

O líder só consegue desativar uma vaga que já tem alguém alocado. Em `SlotDetailSheet.tsx` o botão
"Desativar vaga" vive no ramo renderizado quando a vaga está preenchida; a vaga vazia cai direto no
seletor de pessoas e não oferece nenhuma saída. O serviço `setSlotActive` já trata os dois casos —
o buraco é só de interface.

## Goals

- [x] Líder desativa uma vaga vazia direto do detalhe da vaga, sem precisar alocar alguém antes.
- [x] Nenhuma mudança de comportamento para vaga preenchida.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Desativar vaga em toda a série recorrente | `setSlotActive` é deliberadamente por ocorrência; mudar isso é outra feature. |
| Excluir o slot do banco | Desativar é reversível ("Adicionar vaga extra" reativa); excluir não é. |
| Mudança no serviço `setSlotActive` | Já cobre vaga vazia; alterar seria retrabalho. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Confirmação antes de desativar vaga vazia | Reusa o mesmo `onDeactivate`/`ConfirmDialog` já usado no estado preenchido, em vez de pular a confirmação | Corrigido durante a implementação: `onDeactivate` já chega pronto em `SlotDetailSheet` com confirmação + tratamento de erro acoplados (`OccurrenceRow.deactivateSlot`); reusar em vez de bifurcar o fluxo é mais simples e mantém o mesmo comportamento nos dois estados | y (ajustado na implementação) |
| Posição do botão no estado vazio | Rodapé do seletor, abaixo de "+ Pessoa sem conta", em `text-danger` | Mantém o seletor como ação primária e a desativação como saída secundária | n |
| Rótulo do botão | "Desativar vaga", igual ao estado preenchido | Mesma ação, mesmo nome | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Desativar vaga vazia ⭐ MVP

**User Story**: Como líder, quero desativar uma vaga que ninguém ocupa para que aquele culto não peça uma função de que não preciso.

**Why P1**: É a feature inteira.

**Acceptance Criteria**:

1. WHILE o detalhe de uma vaga sem alocação está aberto o sistema SHALL exibir o botão "Desativar vaga".
2. WHEN o líder toca em "Desativar vaga" numa vaga sem alocação e confirma na caixa de diálogo THEN o sistema SHALL chamar `setSlotActiveAction(slotId, false)` e marcar a vaga como inativa.
3. WHEN a desativação retorna sucesso THEN o sistema SHALL fechar o detalhe e remover a vaga da ocorrência na tela, sem recarregar o mês.
4. The system SHALL manter o botão "Desativar vaga" no estado preenchido exatamente onde está hoje.
5. IF a ação retorna erro THEN o sistema SHALL manter a vaga visível e exibir a mensagem de erro no mesmo padrão já usado pelas demais ações da tela.

**Independent Test**: Abrir uma ocorrência com vaga vazia, tocar na vaga, tocar em "Desativar vaga" e ver a vaga sumir da ocorrência.

---

## Edge Cases

- IF a vaga é preenchida por outra pessoa entre abrir o detalhe e tocar em "Desativar vaga" THEN o sistema SHALL desativar mesmo assim, removendo a alocação e notificando quem estava alocado (comportamento já existente de `setSlotActive`).
- IF o usuário não é líder do ministério THEN o sistema SHALL rejeitar com `FORBIDDEN` e não alterar a vaga.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| VAGA-01 | P1: Desativar vaga vazia | Verified | Verified |

**Coverage:** 1 total, 1 mapeado, 0 não mapeado.

---

## Success Criteria

- [x] Vaga vazia pode ser desativada em 2 toques + 1 confirmação a partir da ocorrência.
- [x] Fluxo de vaga preenchida permanece idêntico ao atual.
