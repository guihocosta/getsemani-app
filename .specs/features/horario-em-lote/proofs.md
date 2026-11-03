# horario-em-lote proofs

**HEAD**: 1c93fd6
**Tree**: clean
**Result**: 31 pass, 0 fail; mutations 3 killed, 0 not

| Check | Proof | Ran | Passed | Result |
| --- | --- | --- | --- | --- |
| C1 | `npx vitest run tests/unit/retime.test.ts -t "mesmo dia local"` | 1 | 1 | pass |
| C2 | `npx vitest run tests/unit/retime.test.ts -t "so esta data"` | 1 | 1 | pass |
| C3 | `npx vitest run tests/unit/retime.test.ts -t "esta e as proximas"` | 1 | 1 | pass |
| C4 | `npx vitest run tests/unit/retime.test.ts -t "datas passadas ficam"` | 1 | 1 | pass |
| C5 | `npx vitest run tests/unit/retime.test.ts -t "data passada recusa"` | 1 | 1 | pass |
| C6 | `npx vitest run tests/unit/retime.test.ts -t "mesmo horario nao muda"` | 1 | 1 | pass |
| C7 | `npx vitest run tests/unit/retime.test.ts -t "funde com duplicata vazia"` | 1 | 1 | pass |
| C8 | `npx vitest run tests/unit/retime.test.ts -t "recusa duplicata com conteudo"` | 1 | 1 | pass |
| C9 | `npx vitest run tests/unit/retime.test.ts -t "horario valido"` | 1 | 1 | pass |
| C10 | `npx vitest run tests/unit/retimeOccurrence.test.ts -t "so esta data grava a data"` | 1 | 1 | pass |
| C11 | `npx vitest run tests/unit/retimeOccurrence.test.ts -t "proximas grava o modelo"` | 1 | 1 | pass |
| C12 | `npx vitest run tests/unit/retimeOccurrence.test.ts -t "conflito nao grava"` | 1 | 1 | pass |
| C13 | `npx vitest run tests/unit/retimeOccurrence.test.ts -t "corrida vira horario ocupado"` | 1 | 1 | pass |
| C14 | `npx vitest run tests/unit/retimeOccurrence.test.ts -t "sem permissao"` | 1 | 1 | pass |
| C15 | `npx vitest run tests/unit/retimeOccurrence.test.ts -t "editar escala move as datas"` | 1 | 1 | pass |
| C16 | `npx vitest run tests/unit/retime.test.ts -t "materializacao nao duplica"` | 1 | 1 | pass |
| C17 | `npx vitest run tests/unit/retimeAction.test.ts -t "retimeOccurrenceAction"` | 3 | 3 | pass |
| C18 | `npx vitest run tests/unit/retimeAction.test.ts -t "editar escala ocupado"` | 1 | 1 | pass |
| C26 | `npx vitest run tests/unit/retime.test.ts -t "dia movido nao volta"` | 1 | 1 | pass |
| C26 | `npx vitest run tests/unit/retime.test.ts -t "dia sem data continua faltando"` | 1 | 1 | pass |
| C27 | `npx vitest run tests/unit/materializeOccurrences.test.ts -t "materializa por dia local"` | 1 | 1 | pass |
| C19 | `npx vitest run tests/unit/retime.test.ts -t "um aviso por pessoa"` | 1 | 1 | pass |
| C20 | `npx vitest run tests/unit/retime.test.ts -t "aviso ignora rascunho e convidado"` | 1 | 1 | pass |
| C21 | `npx vitest run tests/unit/retimeOccurrence.test.ts -t "aviso por pessoa"` | 1 | 1 | pass |
| C22 | `npx vitest run tests/unit/retimeOccurrence.test.ts -t "falha do aviso nao desfaz"` | 1 | 1 | pass |
| C23 | `npx playwright test tests/e2e/horario.spec.ts -g "folha de mudar horario"` | 1 | - | pass |
| C24 | `npx playwright test tests/e2e/horario.spec.ts -g "salvar mostra horario novo"` | 1 | - | pass |
| C24 | `npx playwright test tests/e2e/horario.spec.ts -g "erro mantem a folha"` | 1 | - | pass |
| C25 | `npx playwright test tests/e2e/horario.spec.ts -g "aviso no editar"` | 1 | - | pass |
| Build | `npm run typecheck` | - | - | pass |
| Build | `npm run lint` | - | - | pass |

## Mutations

| Mutation | Location | Killed |
| --- | --- | --- |
| authz checa o id da escala em vez do ministerio | `src\modules\scheduling\services\retimeOccurrences.ts:120` | yes |
| duas datas com pessoas no mesmo instante novo viram fusao (apaga uma com pessoas) | `src\modules\scheduling\domain\retime.ts:64` | yes |
| editar escala move tambem as datas de hoje que ja passaram | `src\modules\scheduling\services\updateSchedule.ts:50` | yes |
