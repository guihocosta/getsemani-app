# Alinhamento de Notificações: Trocas e Lembretes

Este documento define o design para as notificações ausentes no fluxo de trocas e o ajuste na janela de tempo dos lembretes automáticos.

## 1. Fluxo de Pedido de Troca (`requestSwap`)

Quando um voluntário solicita uma troca de escala:
- **Alvo**: Enviar notificação push para todos os membros ativos (`VOLUNTEER`) e líderes ativos (`LEADER`) do ministério associado à ocorrência. O próprio usuário que pediu a troca deve ser excluído da lista de destinatários.
- **Payload**:
  - `type`: `SWAP`
  - `dedupeKey`: `swap-request:<swapRequestId>:<userId>`
  - `title`: `Vaga disponível para troca`
  - `body`: `<User Name> pediu troca em <Ministry Name> · <Role Name> · <DateTime>`
  - `url`: `/escalas`
  - `occurrenceId`: `<Occurrence ID>`

## 2. Fluxo de Troca Assumida (`claimSwap`)

Quando um voluntário assume a vaga de uma troca que estava aberta:
- **Alvo 1: O Voluntário Original** (quem pediu a troca).
  - `type`: `SWAP`
  - `dedupeKey`: `swap-claimed-requester:<swapRequestId>`
  - `title`: `Sua troca foi assumida!`
  - `body`: `<Claiming User Name> assumiu sua escala de <Role Name> · <DateTime>`
  - `url`: `/`
- **Alvo 2: Líderes do Ministério** (todos os ativos com papel `LEADER`).
  - `type`: `SWAP`
  - `dedupeKey`: `swap-claimed-leader:<swapRequestId>:<leaderUserId>`
  - `title`: `Troca efetuada no ministério`
  - `body`: `<Claiming User Name> assumiu a escala de <Original User Name> · <Role Name> · <DateTime>`
  - `url`: `/escalas`
  - `occurrenceId`: `<Occurrence ID>`

## 3. Ajuste do Cron de Lembretes Automáticos

Visando acomodar o limite de execuções do plano Vercel Hobby (uma vez ao dia, ex: às 08:00 AM), a janela do cron será expandida.
- **Arquivo**: `app/api/cron/reminders/route.ts`
- **Alteração**: A constante `REMINDER_WINDOW_H` passará de `24` para `36`.
- **Efeito**: Uma execução diária matinal enviará os alertas para as ocorrências da noite atual e da manhã/noite do dia seguinte em lote único.
- **Prevenção de Duplicatas (Idempotência)**: Já garantida pela arquitetura atual através da `dedupeKey: reminder:<allocationId>:<occurrenceId>`. Se o serviço de cron rodar de forma sobreposta, o `notifyUser` ignorará pushes já enviados previamente, sem gerar erros e garantindo 1 push por escala.

## Tratamento de Erros e Padrões

- As novas implementações utilizarão estritamente a função `notifyUser` que encapsula o fluxo de persistência da notificação, verificação de duplicidade (`dedupeKey`) e a camada de Push (`webpush.sendNotification`).
- Qualquer falha originária do serviço de push está tratada via captura silenciosa na camada do repositório/serviço (`notifyUser` retorna `failed` no pior caso), evitando reverter a transação de banco de dados (`requestSwap` ou `claimSwap`).
- **Isolamento**: As rotas continuam delegando a persistência principal para seus respectivos UseCases antes da notificação.
