# Ajustes visuais checks

Mutations: 3
Build: `npm run typecheck`; `npm run lint`
Plan: `.specs/features/ajustes-visuais/plan.md`

26 checks in 6 slices · 0 one-way doors · 0 open, of which 0 block

## Checks

### S1 - Home abre pelo que pede ação

**C1** - [x] Em `/` para `umCard`, os títulos "Você foi escalado!", "Sua Escala Hoje", "Próxima escala" e "Depois" ficam nessa ordem e todos acima do atalho "Aniversariantes" (AC 1)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "ordem da home"`

**C2** - [x] O vazio aparece só sem pendente, sem hoje e sem futura: nada → aparece; só hoje, só pendente, só futura, hoje e pendente → não aparece (AC 2)
Proof: `npx vitest run tests/unit/homeSections.test.ts -t "vazio da home"`

**C3** - [x] `homeSections` separa pendente, hoje e futura pelo status e pelo dia local, e a futura exclui o dia de hoje (AC 1, AC 2)
Proof: `npx vitest run tests/unit/homeSections.test.ts -t "grupos da home"`

**C24** - [x] Em `/` para `lider` (com aviso fixado e um item em cada grupo), "Solicitações", "Você foi escalado!", "Sua Escala Hoje", "Próxima escala", "Depois", "Avisos em destaque" e "Aniversariantes" ficam nessa ordem (AC 1)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "lider ordem da home"`

### S2 - Página da data com a equipe

**C4** - [x] "Ver escala" no cartão de cada um dos 4 grupos de `umCard` abre `/escalas/data/<uuid>` com a mesma data do cartão (AC 3)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "ver escala abre a data"`

**C5** - [x] Louvor 18/10 para `lider` mostra Bateria "Lia Lider" com "você" e "aguardando confirmação", Teclado "vaga aberta", Violão "Ana Beatriz Moreira", Vocal "Rafael Souza Lima", nessa ordem (AC 4)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "equipe da data"`

**C6** - [x] `getOccurrenceTeam` devolve só vagas ativas, em ordem pt-BR de função, com "sem conta" para convidado, pendente marcado e `isMe` só na vaga do usuário (AC 4, AC 5)
Proof: `npx vitest run tests/unit/occurrenceTeam.test.ts -t "vagas da data"`

**C7** - [x] `getOccurrenceTeam` recusa com `NOT_FOUND` id `abc`, uuid inexistente e data cancelada, e com `FORBIDDEN` não membro e rascunho para voluntário; aceita rascunho para líder do ministério e admin sem vínculo em data publicada (AC 6)
Proof: `npx vitest run tests/unit/occurrenceTeam.test.ts -t "acesso a data"`

**C8** - [x] `/escalas/data/abc` e uma data do Louvor aberta por `voluntario` mostram "Página não encontrada" e nenhuma vaga (AC 6)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "404 da data"`

**C9** - [x] A consulta de `getOccurrenceTeam` seleciona do usuário só `name`, e o resultado não tem `email`, `phone` nem `birthDate` (AC 7)
Proof: `npx vitest run tests/unit/occurrenceTeam.test.ts -t "so o nome"`

**C10** - [x] Na data do Louvor, "Músicas" abre `/repertorio/escala/<id>`; na data de Intercessão não há "Músicas" (AC 8)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "musicas na data"`

**C23** - [x] Sem sessão, `/escalas/data/<id>` redireciona para `/login` (Surface)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "data sem sessao"`

**C25** - [x] Louvor 01/11 para `lider` mostra Teclado "Zé Visitante" com "sem conta" (AC 5)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "sem conta na data"`

**C26** - [x] Em `/` para `lider`, os 7 cartões dos 4 grupos (3 pendentes, 2 hoje, próxima, 1 depois) têm "Músicas" com 44 px ou mais, ícone `svg` e link para `/repertorio/escala/<id>` (AC 17)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "lider botao musicas"`

**C11** - [x] "Início" no topo da página da data volta para `/` (AC 9)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "voltar ao inicio"`

### S3 - Cor do ministério

**C12** - [x] `ministryColor`: `#e0605a` → `#e0605a`; `#E0605A` → `#E0605A`; `null`, `""`, `red`, `#12345`, `#123456;x` → `#2a78cd` (AC 10)
Proof: `npx vitest run tests/unit/ministryColor.test.ts -t "cor do ministerio"`

**C13** - [x] `getMySchedule` e `listMonthOccurrences` entregam `ministryColor` já resolvido: cor salva válida passa, nula vira `#2a78cd` (AC 10, AC 11, AC 12)
Proof: `npx vitest run tests/unit/getMySchedule.test.ts -t "cor do ministerio"`
Proof: `npx vitest run tests/unit/listMonthOccurrences.test.ts -t "cor do ministerio"`

**C14** - [x] Em `/` para `umCard`, os 4 cartões têm borda esquerda de 4 px em `rgb(224, 96, 90)` (AC 11)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "cor nos cartoes"`

**C15** - [x] Em `/escalas` para `umCard`, cada cartão de data tem borda esquerda de 4 px em `rgb(224, 96, 90)`, e a página da data mostra o marcador do ministério nessa cor (AC 12)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "cor nas escalas"`

### S4 - Esqueletos por tela

**C16** - [x] O esqueleto de `/escalas` tem 7 colunas e 35 dias; o de panorama tem linhas de tabela; o de visão geral tem 6 cartões (AC 13)
Proof: `npx vitest run tests/unit/skeletons.test.ts -t "formato do esqueleto"`

**C17** - [x] Os 4 esqueletos (geral, escalas, panorama, visão geral) têm `role="status"`, `aria-busy="true"` e "Carregando…" em `sr-only` (AC 14)
Proof: `npx vitest run tests/unit/skeletons.test.ts -t "esqueleto anunciado"`

### S5 - Visão geral no menu lateral

**C18** - [x] `navItems` tem "Visão geral" logo depois de "Gestão" para líder e admin e não tem para voluntário; a barra inferior não muda; `/admin/visao-geral` marca "Visão geral" (AC 15, AC 16)
Proof: `npx vitest run tests/unit/navItems.test.ts -t "itens por permissao|barra inferior|item ativo"`

**C19** - [x] Em 1280 px, `lider` usa "Visão geral" no menu lateral, chega a `/admin/visao-geral` com o item em `aria-current="page"` e "Gestão" sem; `voluntario` não tem o item (AC 15, AC 16)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "visao geral no menu"`

### S6 - "Músicas" e "Ver escala" como botões

**C20** - [x] Em `/` para `lider`, "Músicas" no cartão de "Sua Escala Hoje" tem 44 px ou mais de altura, um ícone `svg`, e abre `/repertorio/escala/<id>`; os cartões de `umCard` não têm "Músicas" (AC 17)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "botao musicas"`

**C21** - [x] Em `/` para `umCard`, cada "Ver escala" tem 44 px ou mais de altura e um ícone `svg` (AC 18)
Proof: `npx playwright test tests/e2e/ajustes.spec.ts -g "botao ver escala"`

**C22** - [x] As 5 rotas em 390 e 768 px, nos dois temas, batem com as imagens regeneradas nesta feature (plano, `Changes underneath`)
Proof: `npx playwright test tests/e2e/mobile.spec.ts -g "celular igual ao commit base"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| grupos da home (4) | "Você foi escalado!" C1 C4 C14 C21 · "Sua Escala Hoje" C1 C4 C14 C20 C21 · "Próxima escala" C1 C4 C14 C21 · "Depois" C1 C4 C14 C21 | - |
| exemplos do vazio, AC 2 (5) | nada C2 · só hoje C2 · só pendente C2 · só futura C2 · hoje e pendente C2 | - |
| exemplos de acesso, AC 6 (7) | `abc` C7 C8 · inexistente C7 · cancelada C7 · não membro C7 C8 · rascunho voluntário C7 · rascunho líder C7 · admin sem vínculo C7 | - |
| linhas da equipe, AC 4-5 (5) | ocupada C5 C6 · vaga aberta C5 C6 · desativada C6 · sem conta C6 C25 · pendente C5 C6 | - |
| seções da home, AC 1 (7) | Solicitações C24 · "Você foi escalado!" C1 C24 · "Sua Escala Hoje" C1 C24 · "Próxima escala" C1 C24 · "Depois" C1 C24 · "Avisos em destaque" C24 · atalhos C1 C24 | - |
| exemplos de cor, AC 10 (7) | C12, table-driven sobre os 7 | - |
| leitores da cor (3) | home C13 C14 · `/escalas` C13 C15 · página da data C15 | - |
| esqueletos (4) | geral C17 · escalas C16 C17 · panorama C16 C17 · visão geral C16 C17 | - |
| personas do menu (4) | voluntário C18 C19 · líder C18 C19 · admin sem ministério C18 · voluntário com repertório C18 | - |
| `GET /escalas/data/[occurrenceId]` statuses (3) | 200 C5 · não encontrada C8 · `/login` sem sessão C23 | - |
| controles novos (4) | "Ver escala" C4 C21 · "Músicas" na home C20 C26 · "Músicas" na data C10 · "Início" C11 · "Visão geral" no menu C19 | - |

## Swept

- validation: C7 - id que não é uuid vira 404 antes da consulta; C12 - cor salva fora do formato
- failure modes: C7 - só os códigos esperados viram 404, o resto sobe para `error.tsx`
- idempotency: n/a - nada escrito
- authorization: C7, C8 - mesma regra de `getSetlist`; C9 - a página revela só nomes
- concurrency: n/a - só leitura
- data lifecycle: C13 - cor salva lida sem alteração
- dependency failure: n/a - nenhuma chamada externa
- state transitions: n/a - nenhum estado novo
- observability: n/a - sem requisito de log

## Handoff

- **Settled mid-build:** none
- **Dispatched:** Verifier em `416adfb`, returned: FAIL, 4 achados (C24-C26 e fixture de C6); sem screens: nenhum critério cita captura
- **Boundary:** C1-C23 fechados em `416adfb`; C24-C26 e achados do Verifier fechados em `bb37880`
- **Abandoned:** status HTTP 404 na página da data: o `loading.tsx` de `(app)` faz streaming com 200 antes do `notFound()`; C8 e AC 6 passaram a provar a página "Página não encontrada" sem vagas
- **Walked:** home de `lider` em 390 px escuro e `/escalas` em 390 px claro olhadas nas imagens regeneradas (ordem nova, botões "Ver escala"/"Músicas", borda de cor); página da data, 404, menu lateral em 1280 px e botões percorridos pelo e2e `ajustes.spec.ts` no stack local. O usuário chega à página da data por "Ver escala" em qualquer cartão da home
