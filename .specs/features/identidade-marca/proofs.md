# identidade-marca proofs

**HEAD**: ba42a7c
**Tree**: clean
**Result**: 34 pass, 0 fail; mutations 3 killed, 0 not

| Check | Proof | Ran | Passed | Result |
| --- | --- | --- | --- | --- |
| C1 | `npx playwright test tests/e2e/marca.spec.ts -g "largura celular varios"` | 1 | - | pass |
| C2 | `npx playwright test tests/e2e/marca.spec.ts -g "largura celular um card"` | 1 | - | pass |
| C3 | `npx playwright test tests/e2e/marca.spec.ts -g "contador do carrossel"` | 1 | - | pass |
| C4 | `npx playwright test tests/e2e/marca.spec.ts -g "largura web um card"` | 1 | - | pass |
| C5 | `npx playwright test tests/e2e/marca.spec.ts -g "largura web varios"` | 6 | - | pass |
| C6 | `npx playwright test tests/e2e/marca.spec.ts -g "check-in com cor"` | 1 | - | pass |
| C6 | `npx vitest run tests/unit/marca.test.ts -t "sem text-success"` | 1 | 1 | pass |
| C7 | `npx vitest run tests/unit/marca.test.ts -t "tokens escuro"` | 7 | 7 | pass |
| C8 | `npx vitest run tests/unit/marca.test.ts -t "tokens claro"` | 4 | 4 | pass |
| C9 | `npx vitest run tests/unit/marca.test.ts -t "preenchimento usa brand"` | 1 | 1 | pass |
| C10 | `npx vitest run tests/unit/marca.test.ts -t "contraste"` | 12 | 12 | pass |
| C11 | `npx vitest run tests/unit/marca.test.ts -t "sem cor antiga"` | 6 | 6 | pass |
| C12 | `npx vitest run tests/unit/marca.test.ts -t "cor padrao de ministerio"` | 1 | 1 | pass |
| C13 | `npx vitest run tests/unit/marca.test.ts -t "grafite fora do app"` | 1 | 1 | pass |
| C14 | `npx playwright test tests/e2e/marca.spec.ts -g "color-scheme escuro"` | 1 | - | pass |
| C15 | `npx playwright test tests/e2e/marca.spec.ts -g "padrao escuro"` | 3 | - | pass |
| C16 | `npx playwright test tests/e2e/marca.spec.ts -g "claro salvo"` | 1 | - | pass |
| C17 | `npx playwright test tests/e2e/marca.spec.ts -g "botao de tema"` | 1 | - | pass |
| C18 | `npx vitest run tests/unit/marca.test.ts -t "nome com acento"` | 8 | 8 | pass |
| C19 | `npx playwright test tests/e2e/marca.spec.ts -g "simbolo no menu"` | 2 | - | pass |
| C20 | `npx playwright test tests/e2e/marca.spec.ts -g "simbolo no login"` | 1 | - | pass |
| C21 | `npx playwright test tests/e2e/marca.spec.ts -g "brilho no login"` | 2 | - | pass |
| C22 | `npx playwright test tests/e2e/marca.spec.ts -g "grao no login"` | 2 | - | pass |
| C23 | `npx playwright test tests/e2e/marca.spec.ts -g "sem assinatura fora do login"` | 3 | - | pass |
| C24 | `npx playwright test tests/e2e/mobile.spec.ts` | 21 | - | pass |
| C25 | `npx playwright test tests/e2e/marca.spec.ts -g "padrao escuro no primeiro conteudo"` | 1 | - | pass |
| C26 | `npx playwright test tests/e2e/marca.spec.ts -g "padrao escuro com localStorage bloqueado"` | 1 | - | pass |
| C27 | `npx playwright test tests/e2e/marca.spec.ts -g "largura web varios"` | 6 | - | pass |
| C28 | `npx playwright test tests/e2e/marca.spec.ts -g "aparece na tela"` | 2 | - | pass |
| C29 | `npx playwright test tests/e2e/marca.spec.ts -g "contraste do item ativo"` | 2 | - | pass |
| C29 | `npx vitest run tests/unit/marca.test.ts -t "contraste"` | 12 | 12 | pass |
| C30 | `npx playwright test tests/e2e/mobile.spec.ts -g "login 390"` | 1 | - | pass |
| Build | `npm run typecheck` | - | - | pass |
| Build | `npm run lint` | - | - | pass |

## Mutations

| Mutation | Location | Killed |
| --- | --- | --- |
| AC12: script de tema so roda no load, depois do primeiro paint | `app\layout.tsx:47` | yes |
| AC3: Voce foi escalado com 2 ou 3 itens ocupa linha inteira em vez de duas colunas | `app\(app)\PendingConfirmationsCard.tsx:62` | yes |
| AC18: sem contexto de empilhamento, brilho e grao ficam atras do fundo e somem da tela | `app\globals.css:116` | yes |
