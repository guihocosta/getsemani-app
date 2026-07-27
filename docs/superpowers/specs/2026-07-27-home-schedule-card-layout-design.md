# Design: alinhamento e capitalização do card de escala na home

## Problema

Na home (`app/(app)/page.tsx`), os cards "Próxima escala" e "Depois" empilham,
na coluna direita, a hora grande e as ações de `AllocationActions`
(`app/(app)/AllocationActions.tsx`) com `gap-1`, alinhados à direita, sem
separação da hora acima. O resultado: botões colados entre si e coladinhos na
hora, card com aparência apertada e desalinhada. Além disso o badge de status
"aguardando confirmação" nasce em minúsculo no código e depende só do
`text-transform: uppercase` do componente `Badge` (`src/ui/Badge.tsx`) pra
ficar legível — nesse card específico, caixa alta com `tracking-wider` fica
espremida ao lado dos botões de ação.

Escopo: só o card da home (`Card` de "Próxima escala" e da lista "Depois" em
`app/(app)/page.tsx`). Outras telas com o mesmo padrão (`OccurrenceRow`,
outros badges) ficam de fora — não fazem parte deste ajuste.

## Layout aprovado

Cada card passa a ter duas linhas, em vez de duas colunas lado a lado:

1. **Linha 1** (mantém o que já existe): esquerda = ministério (`eyebrow`) /
   função / data; direita = hora grande (`font-title text-3xl`/`text-2xl`).
2. **Divisória**: `border-t border-border pt-3 mt-3` separando a linha 1 da
   linha 2.
3. **Linha 2** (nova, `flex items-center justify-between w-full`):
   - Esquerda: badge de status, só quando `status === "PENDING"`.
   - Direita: as ações vindas de `AllocationActions` (`Não posso`/`Confirmar`,
     `Fazer check-in`, `Check-in feito`, ou botão/badge de troca).
   - Se não houver badge de status, a linha 2 mostra só as ações à direita
     (`justify-end`), sem espaço vazio quebrado à esquerda.

## Capitalização do badge

O badge "aguardando confirmação" deixa de usar o `uppercase`/`tracking-wider`
padrão do componente `Badge` **só nestas duas instâncias** (dentro do card da
home). Texto vira "Aguardando confirmação" (capitalizado no JSX), com
`className="normal-case tracking-normal"` sobrescrevendo o padrão do
componente. O componente `Badge` em si não muda — outras telas continuam
recebendo caixa alta como hoje.

## Componentes afetados

- `app/(app)/page.tsx`: reestrutura os dois `Card` (próxima escala e itens de
  "Depois") pro layout de duas linhas; badge com `normal-case`.
- `app/(app)/AllocationActions.tsx`: sem mudança de lógica — só deixa de estar
  dentro de uma coluna `items-end` com a hora; passa a ocupar a extremidade
  direita da linha 2. Pode precisar remover o wrapper `flex flex-col
  items-end gap-1` interno quando for renderizado sozinho nessa linha (evitar
  alinhamento duplo).

## Fora de escopo

- `OccurrenceRow.tsx` e qualquer outro card/badge com o mesmo padrão de caixa
  alta ou aperto de layout — ficam para uma iteração futura, se o usuário
  pedir.
- Mudança no componente `Badge` compartilhado.

## Testes

Mudança é puramente visual/estrutural (JSX + classes Tailwind), sem lógica de
domínio nova. Não requer teste unitário novo; validar manualmente no
`npm run dev` com uma alocação `PENDING` e uma `CONFIRMED` (hoje e não-hoje)
pra conferir os 4 estados de `AllocationActions` na linha 2.
