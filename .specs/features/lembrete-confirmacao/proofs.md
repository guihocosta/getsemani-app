# lembrete-confirmacao proofs

**HEAD**: a6d8d75
**Tree**: clean
**Result**: 31 pass, 0 fail; mutations 3 killed, 0 not

| Check | Proof | Ran | Passed | Result |
| --- | --- | --- | --- | --- |
| C1 | `npx vitest run tests/unit/remind.test.ts -t "so pendentes com conta"` | 1 | 1 | pass |
| C2 | `npx vitest run tests/unit/remind.test.ts -t "data lembravel"` | 1 | 1 | pass |
| C3 | `npx vitest run tests/unit/remind.test.ts -t "texto do resumo"` | 1 | 1 | pass |
| C4 | `npx vitest run tests/unit/remind.test.ts -t "titulo da confirmacao"` | 1 | 1 | pass |
| C5 | `npx vitest run tests/unit/remindPending.test.ts -t "lembra pendentes da data"` | 1 | 1 | pass |
| C6 | `npx playwright test tests/e2e/lembrete.spec.ts -g "lembrar pendentes da data"` | 1 | - | pass |
| C7 | `npx playwright test tests/e2e/lembrete.spec.ts -g "menu sem pendentes"` | 1 | - | pass |
| C8 | `npx vitest run tests/unit/remindPending.test.ts -t "lembra uma pessoa"` | 1 | 1 | pass |
| C9 | `npx playwright test tests/e2e/lembrete.spec.ts -g "lembrar uma pessoa"` | 1 | - | pass |
| C10 | `npx vitest run tests/unit/remind.test.ts -t "desfecho individual"` | 1 | 1 | pass |
| C11 | `npx vitest run tests/unit/remind.test.ts -t "janela de uma hora"` | 1 | 1 | pass |
| C12 | `npx vitest run tests/unit/remindPending.test.ts -t "ja lembrado na ultima hora"` | 1 | 1 | pass |
| C13 | `npx vitest run tests/unit/remind.test.ts -t "chave da janela"` | 1 | 1 | pass |
| C14 | `npx vitest run tests/unit/remindPending.test.ts -t "corrida envia uma vez"` | 1 | 1 | pass |
| C15 | `npx vitest run tests/unit/remindPending.test.ts -t "sem dispositivo"` | 1 | 1 | pass |
| C16 | `npx vitest run tests/unit/remindPending.test.ts -t "sem permissao"` | 1 | 1 | pass |
| C17 | `npx vitest run tests/unit/remindPending.test.ts -t "nao lembravel"` | 1 | 1 | pass |
| C18 | `npx vitest run tests/unit/remindPendingAction.test.ts -t "traduz erros"` | 1 | 1 | pass |
| C19 | `npx playwright test tests/e2e/lembrete.spec.ts -g "x no canto"` | 2 | - | pass |
| C20 | `npx playwright test tests/e2e/lembrete.spec.ts -g "alca no celular"` | 2 | - | pass |
| C21 | `npx playwright test tests/e2e/lembrete.spec.ts -g "fecha de tres jeitos"` | 3 | - | pass |
| C22 | `npx vitest run tests/unit/sheetHeader.test.ts -t "titulo e x no cabecalho"` | 1 | 1 | pass |
| C23 | `walk - abrir "Adicionar vaga extra" e "Mudar horário" no menu de uma data e o popup de instalar, em 390 px e 1` | - | - | pass (Walked) |
| C24 | `npx playwright test tests/e2e/lembrete.spec.ts -g "so o simbolo"` | 1 | - | pass |
| C25 | `npx vitest run tests/unit/remind.test.ts -t "alvos da data na tela"` | 1 | 1 | pass |
| C26 | `npx playwright test tests/e2e/lembrete.spec.ts -g "convidado sem lembrete"` | 1 | - | pass |
| C27 | `npx vitest run tests/unit/remindPending.test.ts -t "lista vazia nao lembra"` | 1 | 1 | pass |
| C28 | `npx vitest run tests/unit/lastNotificationAt.test.ts -t "ultimo pelo prefixo"` | 1 | 1 | pass |
| C29 | `npx vitest run tests/unit/remind.test.ts -t "falha de envio"` | 1 | 1 | pass |
| Build | `npm run typecheck` | - | - | pass |
| Build | `npm run lint` | - | - | pass |

## Mutations

| Mutation | Location | Killed |
| --- | --- | --- |
| menu da data em rascunho passa a oferecer Lembrar pendentes (AC 2) | `src\modules\scheduling\domain\remind.ts:58` | yes |
| limite de 1 hora le o lembrete manual mais antigo em vez do ultimo (AC 10) | `src\modules\notifications\services\notify.ts:27` | yes |
| modal da vaga mostra Lembrar confirmacao para convidado, rascunho ou data passada (AC 8) | `app\(app)\escalas\OccurrenceRow.tsx:318` | yes |
