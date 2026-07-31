# Design: Vaga Extra Avulsa (Ad-hoc Extra Slot)

## Contexto
O usuário precisava adicionar uma função extra em uma data específica de uma escala, sem alterar a regra padrão (template) que rege todas as outras datas. 
Atualmente, as vagas de um culto são geradas a partir das funções padrão da escala, e não há uma interface para adicionar vagas extras sob demanda.

## Objetivo
Permitir que líderes e administradores adicionem uma "Vaga Extra" a uma Ocorrência (culto/evento) específica. A vaga usará uma função (Role) já existente no Ministério, desde que ela ainda não esteja ativa naquela data (respeitando a restrição do banco de dados de 1 vaga por função por ocorrência).

## UX e Fluxo
1. Em `app/(app)/escalas/page.tsx`, o componente `OccurrenceRow` exibe as informações de um dia da escala.
2. No menu de reticências (`OccurrenceMenu`), será adicionada a opção: **"Adicionar vaga extra"**.
3. Ao clicar, um modal/sheet (`AddExtraSlotSheet`) se abrirá.
4. O modal carregará as funções disponíveis do ministério que **ainda não estão ativas** na ocorrência.
5. O usuário seleciona uma função e confirma.
6. O sistema cria (ou reativa) o slot para essa função na ocorrência e atualiza a interface.
7. Se o usuário quiser remover a vaga depois, poderá usar a função existente "Desativar vaga" diretamente nos detalhes do Slot.

## Arquitetura e Dados

### Ações de Servidor (Server Actions)
Precisaremos de duas novas server actions (provavelmente em `app/(app)/escalas/actions.ts`):

1. **`getAvailableRolesAction(occurrenceId: string)`**:
   - Busca a Ocorrência para identificar o `ministryId` (via `schedule.ministryId`).
   - Busca todas as funções (`Role`) ativas desse ministério.
   - Filtra as funções que já possuem um `Slot` **ativo** na ocorrência.
   - Retorna a lista de funções disponíveis para escolha.

2. **`addExtraSlotAction(occurrenceId: string, roleId: string)`**:
   - Verifica se o usuário tem permissão (`requireLeaderOf`).
   - Verifica se já existe um `Slot` para essa `occurrenceId` + `roleId`.
   - Se existir e estiver inativo (`active: false`), atualiza para `active: true`.
   - Se não existir, cria um novo `Slot` com `active: true`.
   - Revalida o caminho da página de escalas.

### Componentes UI
- **`OccurrenceMenu`**: Receberá a prop `onAddExtraSlot: () => void` para acionar o modal.
- **`OccurrenceRow`**: Gerenciará o estado de visibilidade do novo modal (`AddExtraSlotSheet`) e lidará com as requisições de buscar roles e salvar a nova vaga.
- **`AddExtraSlotSheet` (novo)**: Um componente responsivo (BottomSheet no mobile, Modal no desktop - seguindo o padrão atual) para listar as opções e submeter a escolha.

## Testes e Validações
- **Idempotência**: Garantir que a ação lide graciosamente se o usuário tentar adicionar uma vaga que acabou de ser adicionada em outra aba (usar `upsert` ou tratar erro de `UniqueConstraint`).
- **Segurança**: Somente quem gerencia a escala (`canManage`) pode ver o botão e disparar as ações.
- **Performance**: A busca de funções disponíveis deve ser sob demanda (somente ao tentar adicionar a vaga) para não sobrecarregar a listagem inicial de ocorrências.

## Escopo
Este design trata apenas de vagas avulsas. Não altera a lógica do `updateSchedule` para propagação em lote.
