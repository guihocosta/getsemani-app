# horario-em-lote proofs

**HEAD**: 2687b60
**Tree**: clean
**Result**: 28 pass, 0 fail; mutations 0 killed, 0 not

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
