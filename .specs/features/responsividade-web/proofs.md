# responsividade-web proofs

**HEAD**: 76d2412
**Tree**: clean
**Result**: 34 pass, 0 fail; mutations 3 killed, 0 not

| Check | Proof | Ran | Passed | Result |
| --- | --- | --- | --- | --- |
| C1 | `npx playwright test tests/e2e/shell.spec.ts -g "corte em 1024"` | 2 | - | pass |
| C2 | `npx vitest run tests/unit/navItems.test.ts -t "itens por permissao"` | 4 | 4 | pass |
| C32 | `npx playwright test tests/e2e/shell.spec.ts -g "menu do voluntario"` | 1 | - | pass |
| C3 | `npx vitest run tests/unit/navItems.test.ts -t "item ativo"` | 8 | 8 | pass |
| C4 | `npx playwright test tests/e2e/shell.spec.ts -g "item ativo no menu"` | 1 | - | pass |
| C5 | `npx playwright test tests/e2e/shell.spec.ts -g "cada item abre a rota"` | 1 | - | pass |
| C6 | `npx playwright test tests/e2e/shell.spec.ts -g "ponto de pendencia"` | 2 | - | pass |
| C7 | `npx playwright test tests/e2e/shell.spec.ts -g "menu fixo"` | 2 | - | pass |
| C8 | `npx playwright test tests/e2e/shell.spec.ts -g "erro mantem menu"` | 1 | - | pass |
| C9 | `npx playwright test tests/e2e/shell.spec.ts -g "sem rolagem horizontal"` | 18 | - | pass |
| C10 | `npx playwright test tests/e2e/shell.spec.ts -g "formulario em coluna"` | 3 | - | pass |
| C11 | `npx playwright test tests/e2e/interacao.spec.ts -g "mouse nao troca aba"` | 1 | - | pass |
| C12 | `npx playwright test tests/e2e/interacao.spec.ts -g "toque troca aba"` | 1 | - | pass |
| C13 | `npx playwright test tests/e2e/interacao.spec.ts -g "esc fecha sheet"` | 2 | - | pass |
| C14 | `npx playwright test tests/e2e/interacao.spec.ts -g "esc cancela confirmacao"` | 1 | - | pass |
| C30 | `npx playwright test tests/e2e/interacao.spec.ts -g "esc fecha sheet com foco no body"` | 1 | - | pass |
| C31 | `npx playwright test tests/e2e/interacao.spec.ts -g "esc na confirmacao mantem o sheet aberto"` | 1 | - | pass |
| C15 | `npx playwright test tests/e2e/interacao.spec.ts -g "dialogo acessivel"` | 2 | - | pass |
| C16 | `npx playwright test tests/e2e/interacao.spec.ts -g "dialogo centralizado"` | 2 | - | pass |
| C17 | `npx playwright test tests/e2e/interacao.spec.ts -g "pendencias visiveis"` | 1 | - | pass |
| C18 | `npx playwright test tests/e2e/interacao.spec.ts -g "check-ins visiveis"` | 1 | - | pass |
| C19 | `npx playwright test tests/e2e/interacao.spec.ts -g "setas nomeadas"` | 1 | - | pass |
| C29 | `npx playwright test tests/e2e/interacao.spec.ts -g "proximas visiveis"` | 1 | - | pass |
| C20 | `npx playwright test tests/e2e/telas.spec.ts -g "panorama cabe"` | 1 | - | pass |
| C21 | `npx playwright test tests/e2e/telas.spec.ts -g "panorama rola por dentro"` | 1 | - | pass |
| C22 | `npx playwright test tests/e2e/telas.spec.ts -g "escalas lado a lado"` | 1 | - | pass |
| C23 | `npx playwright test tests/e2e/telas.spec.ts -g "dia nao move calendario"` | 1 | - | pass |
| C24 | `npx playwright test tests/e2e/telas.spec.ts -g "gestao em colunas"` | 1 | - | pass |
| C25 | `npx playwright test tests/e2e/telas.spec.ts -g "visao geral em colunas"` | 1 | - | pass |
| C26 | `npx playwright test tests/e2e/mobile.spec.ts -g "celular igual ao commit base"` | 20 | - | pass |
| C27 | `npx vitest run tests/unit/themeTokens.test.ts -t "so tokens"` | 15 | 15 | pass |
| C28 | `grep -q "lg:.*1024 px.*menu lateral" CLAUDE.md` | count unknown | - | pass |
| Build | `npm run typecheck` | - | - | pass |
| Build | `npm run lint` | - | - | pass |

## Mutations

| Mutation | Location | Killed |
| --- | --- | --- |
| layout: hasRepertoire sempre true (Repertorio para todo voluntario) | `app\(app)\layout.tsx:24` | yes |
| useDialog: Shift+Tab no primeiro item nao volta ao ultimo | `src\ui\useDialog.ts:48` | yes |
| SwipeNav: gesto de mouse volta a trocar de aba | `src\ui\SwipeNav.tsx:31` | yes |
