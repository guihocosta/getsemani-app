# Especificação de Design: Check-In de Escalas Hoje

## Visão Geral
A funcionalidade de "Check-in" será extraída da seção padrão de "Próxima Escala" e ganhará destaque próprio na tela inicial. O objetivo principal é garantir o levantamento de dados para análise posterior. O Check-In aparecerá apenas no dia exato da escala, continuará disponível após o horário previsto do evento, e manterá o status visível ("Check-in feito") como recibo. 

As demais escalas (de amanhã em diante) continuarão nas seções "Próxima escala" e "Depois".

## 1. Regras de Negócio e Dados (`getMySchedule`)
Para que o card de hoje consiga ser exibido mesmo se a hora do evento já passou, a busca de escalas precisa ser ajustada:
- Atualmente a `getMySchedule` utiliza `from = new Date()` (hora atual). 
- **Mudança:** A função deve passar a receber a data começando da **meia-noite** do dia atual (`startOfDay`). 
- Dessa forma, qualquer ocorrência que caiu na data de hoje continuará retornando na lista ao longo de todo o dia, permitindo ao usuário visualizar que "tem/teve escala" e fazer o check-in atrasado.

Na página `app/(app)/page.tsx`, a lista de escalas (`items`) será categorizada em três blocos:
1. **Pendentes:** `status === 'PENDING'` (Aparece no `PendingConfirmationsCard`).
2. **Hoje (Confirmadas):** `status !== 'PENDING'` e a data for igual à data de hoje.
3. **Futuras (Confirmadas):** `status !== 'PENDING'` e a data for maior que hoje.

## 2. Componente de Interface: `TodayCheckInCard`
Criaremos um novo componente chamado `TodayCheckInCard` no diretório `app/(app)`.

### Comportamento Visual
- Funciona como um carrossel horizontal de *snap* (idêntico ao `PendingConfirmationsCard`) caso haja mais de uma escala confirmada para o dia.
- Exibe o Ministério, Função, e a hora bem grande.
- Apresenta um botão primário de tamanho confortável: **"Fazer Check-in"**.
- Ao ser clicado, chama a server action de check-in (`checkInAllocationAction`).
- Com o check-in salvo (`checkedInAt !== null`), o botão desaparece e dá lugar a um indicador visual positivo: "✅ Check-in feito", de cor verde. O card se mantém na tela pelo resto do dia.

### Foco Inteligente (UX)
- Se houver múltiplas escalas no mesmo dia (ex: Manhã e Noite), o componente deve auto-centralizar na **primeira escala que ainda não tem check-in**.
- Se o usuário já fez check-in da escala da manhã, ao abrir o app de tarde, a primeira tela visível do carrossel de Check-in será a escala da noite, reduzindo o atrito para a ação mais importante do momento.

## 3. Impacto na Tela Inicial (`page.tsx`)
A ordem de exibição na Home (`app/(app)/page.tsx`) será:
1. Cabeçalho (Olá, Nome)
2. Solicitações de Gestão (se for líder/admin)
3. Confirmações Pendentes (`PendingConfirmationsCard`)
4. **Sua Escala Hoje (`TodayCheckInCard`)** - renderizado apenas se houver `todayItems`.
5. Próxima Escala (Exibindo a primeira do array `futureItems`).
6. Depois (`UpcomingCarousel` com o restante de `futureItems`).

Se não houver escalas pendentes, escalas hoje e escalas futuras, então exibe-se o `EmptyState`.

## 4. Limites do Sistema (Escopo)
- Este design afeta apenas a tela inicial. A tela de "Vagas" ou detalhe da escala seguem com seus próprios comportamentos.
- A função server-side de Check-In (`checkInAllocationAction`) já existe e não precisará ser recriada, apenas reutilizada e devidamente tratada quanto a possíveis erros na UI.
