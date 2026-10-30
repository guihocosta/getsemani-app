# Responsividade web verification

**Verdict**: FAIL
**Mutations**: 0 de 3 executadas - planejadas em `mutations.json` para C2/C5, C15 e C11; o run foi morto por falta de memória antes de chegar às mutações, então nenhuma tem resultado
**Proofs**: `proofs.md` at 73a6d91 - arquivo do builder, não regenerado por este Verifier (o run foi morto antes de escrever); mostra 0 mutações
**Verifier**: independent sub-agent (author != verifier)

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| Esc não fecha o sheet quando o foco cai no `body` (AC 11). `useDialog` só escuta `onKeyDown` no painel, e um controle interno que some leva o foco embora | Exemplo próprio em 1280 px, `/escalas?mes=2026-10`, dia 18: abrir vaga, clicar "+ Pessoa sem conta", clicar "cancelar", pressionar Esc. `activeElement` = `BODY` e o diálogo segue visível 5 s depois. `src/ui/useDialog.ts:22`; `app/(app)/escalas/SlotDetailSheet.tsx` | Escutar Esc fora do painel enquanto aberto, ou devolver o foco ao painel quando ele sair; manter a regra de fechar só o diálogo do topo. Adicionar teste com este roteiro | 97c06cc - C30, C31 |
| C7 não prova o que afirma: o menu não rola em 1024 × 600, e `toBeInViewport()` sem `ratio` aceita menu parcialmente visível (AC 6) | Medido em `/admin`: menu `scrollHeight` 600 = `clientHeight` 600; rolagem máxima da página 378 px, menor que a altura do menu. Em 1024 × 360 o menu tem 492/360 e Perfil é alcançável, logo o comportamento está certo e o teste é que não o exercita. `tests/e2e/shell.spec.ts:79,82`. Que `fixed` -> `absolute` passaria é dedução dessas medidas, não foi executado | Usar altura em que o menu transborde; afirmar a posição do menu com a página rolada (`top` 0), não só interseção | 97c06cc - C7 |
| Nenhum teste cobre a ligação `hasRepertoire` no layout (AC 2) | C2 testa só a função pura com flags fixas; C5 usa só a líder, que tem repertório. Nenhum e2e olha o menu de quem não tem. Em HEAD o voluntário real está certo (exemplo próprio: sem Repertório e sem Gestão). Mutação 1 não executada | Teste e2e com a persona `voluntario` afirmando a lista do menu | 97c06cc - C32 |
| C15 só testa Tab para a frente; Shift+Tab não tem asserção (AC 13) | `tests/e2e/interacao.spec.ts`, laços com `press("Tab")`, nenhum `Shift+Tab`. Em HEAD o comportamento funciona (exemplo próprio passou). Mutação 2 não executada | Afirmar Shift+Tab a partir do primeiro item, nos dois diálogos | 97c06cc - C15 |
| C11 pode passar sem provar: espera fixa de 500 ms antes de ler a URL, e em `next dev` a rota `/vagas` pode levar mais que isso para compilar (AC 10) | `tests/e2e/interacao.spec.ts`, teste "mouse nao troca aba". Hipótese de leitura; a mutação 3 decidiria e não foi executada | Depois de rodar a mutação 3: se sobreviver, trocar a espera por sinal determinístico, como aguardar o fim do gesto com a rota já compilada | 97c06cc - C11, espera de 1500 ms com /vagas compilada |
| C20 usa nomes de no máximo 19 caracteres, e o critério fixa 20 (AC 17) | `tests/e2e/harness/seed.ts`, `NOMES`: maior nome tem 19. Exemplo próprio com 20 caracteres em todas as células passou (`scrollWidth` 1008 = `clientWidth` 1008); a partir de 24 a tabela rola por dentro | Incluir nome de 20 caracteres no seed; muda o baseline de C26 se a pessoa aparecer nas telas capturadas | 97c06cc - C20, 20 caracteres no DOM |
| C27 varre 5 arquivos, e o critério vale para todo o código novo (AC 23) | `tests/unit/themeTokens.test.ts`, `ARQUIVOS` omite `src/ui/useDialog.ts` e as páginas de `app/(app)` do diff. Lendo o diff, não achei cor crua: a falha é de cobertura | Varrer os arquivos do diff | 97c06cc - C27 |

## Mutações pendentes

`mutations.json` está pronto, com as 3 mutações. O run de `check_proofs.py` foi encerrado pelo Claude Code por falta de memória, sem saída. Ao final, não havia journal de mutação, `git diff -- app src` estava vazio e a porta 3100 estava livre.

No Windows, `mutate.py` quebra porque `signal.SIGHUP` não existe, e `check_proofs.py` então registraria 0 mutações sem acusar erro. O wrapper indicado não cobre esse caso. Para contornar, o run usou `run_check_proofs_mut.py` e `mutate_win_shim.py`, no scratchpad da sessão.

## Probed sem achado

Throwaway, removido antes do run:

- Sem rolagem horizontal em 1025, 1366 e 2560 px, nas rotas `/`, `/escalas`, `/escalas/panorama`, `/admin` e `/admin/visao-geral`.
- O fundo do sheet cobre o menu lateral.
- Em Chrome, Tab com foco no `body` depois do mesmo roteiro do primeiro achado permaneceu dentro do diálogo.
- O baseline de C26 vem de 476291b, sem diferença em `app` e `src` para 49e8573.
