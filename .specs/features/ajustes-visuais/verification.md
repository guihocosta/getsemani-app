# Ajustes visuais verification

**Verdict**: FAIL
**Mutations**: 3 - probed C6, C5, C11
**Proofs**: `proofs.md` at 416adfb
**Verifier**: independent sub-agent (author != verifier)

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| A ordem pt-BR das funções (AC 4) pode virar ordem de code point e nenhum teste falha | mutation `ordem das funcoes pt-BR -> ordem de code point` (`getOccurrenceTeam.ts:57`) não morta; o fixture de C6 (`occurrenceTeam.test.ts:62-69`) só tem funções com inicial maiúscula sem acento, em que as duas ordens coincidem | pôr no fixture de C6 uma função acentuada e uma minúscula (ex.: "Órgão", "baixo" com "Percussão") e afirmar a ordem pt-BR | |
| "sem conta" (AC 5) pode sumir da página da data e nenhum teste falha | mutation `pagina da data nao mostra 'sem conta'` (`page.tsx:55`) não morta; C6 prova só o campo `isGuest` do serviço, e o e2e C5 (Louvor 18/10) não tem convidado | e2e numa data com vaga de convidado afirmando o nome com "sem conta" | |
| C1 é mais frouxo que AC 1: o critério fixa "Solicitações" no topo (líder/admin) e "Avisos em destaque" entre os grupos e os atalhos; a prova só ordena os 4 títulos de grupo e "Aniversariantes" | `ajustes.spec.ts:25-37` (`ordem da home`, persona `umCard`, sem Solicitações nem aviso fixado) | afirmar a ordem completa numa persona líder com aviso fixado: Solicitações < grupos < Avisos em destaque < atalhos | |
| C20 prova "Músicas" como botão em 1 dos 4 grupos; AC 17 fixa cada cartão dos 4 grupos | `ajustes.spec.ts` `botao musicas` só abre o cartão de `grupo-hoje` | iterar os cartões com repertório de todos os grupos (pendente, hoje, próxima, depois) checando altura >= 44 px e `svg` | |

Own examples (passaram em `HEAD`, testes descartáveis já apagados): `ministryColor` com `"#e0605a\n"`, `" #e0605a"`, `"#e0605aff"`, `"#gggggg"`, `undefined` -> `#2a78cd`, `"#aBc123"` passa intacto (AC 10); `getOccurrenceTeam` ordena `Percussão, Órgão, baixo, Ângelus, Bateria` como `Ângelus, baixo, Bateria, Órgão, Percussão` e devolve lista vazia quando nenhuma vaga está ativa (AC 4/5). Mutation `Inicio -> /escalas` foi morta por C11.
