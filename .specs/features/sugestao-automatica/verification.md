# Sugestão automática de escalação verification

**Verdict**: PASS
**Profile**: light
**Diff range**: c5f657b..9a58a2c + fix e8a6482 (provas rodadas em HEAD 6f0f04c)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Os dois gaps de código que sustentaram a reprovação da rodada 1 estão fechados: `planSuggestions`
reconta os elegíveis restantes a cada escolha e o contra-exemplo da rodada 1 agora preenche as três
vagas; `suggestAllocations` rejeita ocorrência cancelada antes de qualquer escrita. As 17 provas rodam
verdes em `HEAD` (6f0f04c). Os gaps 5, 6 e 8 também foram fechados. Os gaps 3 e 4 não foram
corrigidos e viraram linhas de Out of scope no plano; julgo os dois aceitáveis como limitação
registrada (ver Residual limitations).

A aprovação tem duas ressalvas que o usuário precisa conhecer, nenhuma bloqueante:

1. A regra nova continua gulosa. Ainda existe arranjo realista em que há escalação completa e uma
   vaga fica vazia com o rótulo "sem candidato" (R1 abaixo, com exemplo e frequência medida). O plano
   agora declara esse limite; por isso é limitação registrada e não reprovação.
2. As três linhas novas de Out of scope foram escritas pelo autor do fix, não aprovadas pelo usuário.
   São decisões de produto e pedem o aceite dele.

Passo 5 (percorrer o fluxo com o usuário): não executado - o verificador não alcança o usuário.
Passos 1 e 4 e o recompute de Coverage não rodam no perfil `light`.

## Checks

verified at 6f0f04c - todas as provas C1..C17 rodaram de novo neste commit, numa única invocação
`npx vitest run tests/unit/suggest.test.ts tests/unit/suggestAllocations.test.ts tests/unit/actionError.test.ts --reporter=verbose -t "<alternação dos 16 padrões>"`
(exit 0, 24 casos passaram, 31 pulados pelo filtro); cada teste nomeado apareceu individualmente como
executado e aprovado. Provas grep e `npm run typecheck` como escritas, todas exit 0. Citações
relocalizadas nos três arquivos de teste que o fix tocou. Nenhum arquivo da feature mudou entre
e8a6482 e HEAD.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | menor carga; empate -> menos faltas; empate -> menor `userId` | `-t "ordem de escolha"` - passou | `tests/unit/suggest.test.ts:32` - `expect(plan({ candidates: [cand("u1", 3), cand("u2", 1), cand("u3", 2)] }).picks).toEqual([{ slotId: "s1", userId: "u2" }])`; `:35` faltas `.toBe("u2")`; `:38` `.toBe("u4")` | PASS |
| C2 | indisponível não é escolhido mesmo com a menor carga | `-t "indisponivel"` - passou | `tests/unit/suggest.test.ts:43` - `expect(p.picks).toEqual([{ slotId: "s1", userId: "u2" }])` | PASS |
| C3 | capacitação declarada restringe; `null` libera todos | `-t "capacitacao"` - passou | `tests/unit/suggest.test.ts:50` - `expect(declarada.picks[0].userId).toBe("u2")`; `:53` - `expect(naoDeclarada.picks[0].userId).toBe("u1")` | PASS |
| C4 | uma pessoa por data; já alocado não é escolhido | `-t "uma vez por data"` - passou | `tests/unit/suggest.test.ts:62` - `expect(p.picks).toEqual([{ slotId: "s1", userId: "u1" }, { slotId: "s2", userId: "u2" }])`; `:68` - `expect(comAlocado.picks).toEqual([{ slotId: "s1", userId: "u2" }])` | PASS |
| C5 | vaga mais restrita primeiro; empate mantém a ordem recebida | `-t "vaga mais restrita primeiro"` - 2 casos passaram | `tests/unit/suggest.test.ts:83` - `expect(p.picks).toEqual([{ slotId: "bateria", userId: "u1" }, { slotId: "vocal", userId: "u2" }])`; empate, teste novo, `:97` - `expect(p.picks).toEqual([{ slotId: "s2", userId: "u1" }, { slotId: "s1", userId: "u2" }])` com as vagas recebidas na ordem s2, s1 | PASS |
| C6 | vaga sem elegível vai para `unfilled`, não para `picks` | `-t "sem candidato"` - passou | `tests/unit/suggest.test.ts:135` - `expect(p.picks).toEqual([{ slotId: "s1", userId: "u1" }])`; `:136` - `expect(p.unfilled).toEqual(["s2"])` | PASS |
| C7 | 2 `allocation.create` com `LEADER` e `PENDING`, só nas abertas ativas; `{ filled: 2, unfilled: 0 }` | `-t "grava PENDING"` - passou | `tests/unit/suggestAllocations.test.ts:85` - `expect(res).toEqual({ filled: 2, unfilled: 0 })`; `:86` - `toHaveBeenCalledTimes(2)`; `:87` - `toHaveBeenCalledWith({ data: { slotId: "s1", userId: "u1", source: "LEADER", status: "PENDING" } })` | PASS |
| C8 | publicada notifica com `assign:<id>`; rascunho não notifica | `-t "notifica so se publicada"` - passou | `tests/unit/suggestAllocations.test.ts:98` - `expect(notifyUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", type: "ASSIGNMENT", dedupeKey: "assign:al1" }))`; `:108` - `expect(notifyUser).not.toHaveBeenCalled()` | PASS |
| C9 | `FORBIDDEN` sem gravar | `-t "FORBIDDEN nao grava"` - passou | `tests/unit/suggestAllocations.test.ts:113` - `rejects.toThrow("FORBIDDEN")`; `:114` - `expect(prisma.allocation.create).not.toHaveBeenCalled()` | PASS |
| C10 | data passada -> `OCCURRENCE_PAST` sem gravar; mensagem "Essa data já passou." | `-t "OCCURRENCE_PAST"` nos dois arquivos - 5 casos passaram | `tests/unit/suggestAllocations.test.ts:121` - `rejects.toThrow("OCCURRENCE_PAST")`; `:122` - `create).not.toHaveBeenCalled()`; limite `date == now` em `:127`; `tests/unit/actionError.test.ts:62` - `expect(MENSAGENS.OCCURRENCE_PAST).toBe("Essa data já passou.")` | PASS |
| C11 | `P2002` na 1ª de duas -> `{ filled: 1, unfilled: 1 }` | `-t "P2002"` - passou | `tests/unit/suggestAllocations.test.ts:146` - `expect(await suggestAllocations("o1", NOW)).toEqual({ filled: 1, unfilled: 1 })` | PASS |
| C12 | janelas de carga e de faltas, com `[ministryId]` | `-t "janelas"` - passou | `tests/unit/suggestAllocations.test.ts:153` - `expect(loadByPerson).toHaveBeenCalledWith(new Date(DATA.getTime() - 30 * DIA), new Date(DATA.getTime() + 30 * DIA), ["m1"])`; `:158` - `expect(attendanceRows).toHaveBeenCalledWith(new Date("2026-09-02T03:00:00.000Z"), new Date("2026-10-02T03:00:00.000Z"), ["m1"])` | PASS |
| C13 | texto de retorno (plural, singular, nada preenchido) e `OccurrenceRow` usa `suggestOutcome` | `-t "suggestOutcome"` - passou; `grep -q "suggestOutcome("` exit 0; `npm run typecheck` exit 0 | `tests/unit/suggest.test.ts:142` - `toEqual({ message: "2 vagas preenchidas, 1 sem candidato", isError: false, refresh: true })`; `:147` - `.toBe("1 vaga preenchida, 0 sem candidato")`; `:148` - `.refresh).toBe(false)`; ligação lida em `app/(app)/escalas/OccurrenceRow.tsx:273` | PASS |
| C14 | texto de confirmação por estado de publicação; `confirm` antes da action | `-t "suggestConfirmText"` - passou; `grep -q "suggestConfirmText(props.published)"` exit 0 | `tests/unit/suggest.test.ts:164` - `expect(suggestConfirmText(true)).toContain("serão avisados agora")`; `:165` - `toContain("só ao publicar")`; ordem lida em `app/(app)/escalas/OccurrenceRow.tsx:265` (confirm) antes de `:273` (action) | PASS |
| C15 | Vocal {a,b}, Violão {b,c}, Teclado {a,c}, cargas a=0, c=1, b=2: `unfilled = []`, Vocal->a, Teclado->c, Violão->b | `-t "reconta elegiveis"` - passou | `tests/unit/suggest.test.ts:119` - `expect(p.unfilled).toEqual([])`; `:120` - `expect(p.picks).toEqual([{ slotId: "vocal", userId: "a" }, { slotId: "teclado", userId: "c" }, { slotId: "violao", userId: "b" }])` | PASS |
| C16 | `CANCELLED` rejeita com `OCCURRENCE_CANCELLED` sem `allocation.create` nem `notifyUser`; mensagem "Essa data foi cancelada." | `-t "OCCURRENCE_CANCELLED"` nos dois arquivos - 4 casos passaram | `tests/unit/suggestAllocations.test.ts:135` - `rejects.toThrow("OCCURRENCE_CANCELLED")`; `:136` - `expect(prisma.allocation.create).not.toHaveBeenCalled()`; `:137` - `expect(notifyUser).not.toHaveBeenCalled()`; `tests/unit/actionError.test.ts:57` - `expect(MENSAGENS.OCCURRENCE_CANCELLED).toBe("Essa data foi cancelada.")` | PASS |
| C17 | `suggestOutcome({ ok: true, filled: 0, unfilled: 0 })` -> "Nenhuma vaga aberta nesta data.", `refresh: false` | `-t "suggestOutcome"` - passou | `tests/unit/suggest.test.ts:149` - `expect(suggestOutcome({ ok: true, filled: 0, unfilled: 0 })).toEqual({ message: "Nenhuma vaga aberta nesta data.", isError: false, refresh: false })` | PASS |

Nível e amostragem (carried from 4e1756f, sem mudança): C13 e C14 afirmam comportamento de tela e a
parte de tela é provada só por grep de substring + typecheck, como o próprio `checks.md` declara. A
AC 17 diz que `OccurrenceRow` mostra o texto; C17 prova a função pura e a ligação é a mesma de C13
(`OccurrenceRow.tsx:273-274`). Nenhuma prova falharia se `props.onChanged()` da linha 276 fosse
removido.

## Round 1 gaps

verified at 6f0f04c contra o diff de e8a6482.

| Gap | Status | Where |
| --- | --- | --- |
| G1 contagem estática deixava vaga vazia | fechado - contagem refeita a cada escolha; contra-exemplo da rodada 1 devolve `picks: [vocal->a, teclado->c, violao->b], unfilled: []` | `src/modules/scheduling/domain/suggest.ts:48-52`; C15 |
| G2 ocorrência cancelada | fechado - rejeita depois da autorização e antes de qualquer escrita | `src/modules/scheduling/services/suggestAllocations.ts:36`; C16 |
| G3 quem recusou é escalado de novo | não corrigido - Out of scope no plano; aceito como limitação (R2) | `plan.md` Out of scope |
| G4 corrida rotulada "sem candidato" | não corrigido - Out of scope no plano; aceito como limitação (R3). A metade "0 vagas, 0 sem candidato" foi corrigida (C17) | `src/modules/scheduling/domain/suggest.ts:73-75` |
| G5 metade do empate de C5 sem prova própria | fechado | `tests/unit/suggest.test.ts:89-101` |
| G6 erro não revalidava `/` | fechado | `app/(app)/escalas/actions.ts:384` |
| G7 janelas de carga diferentes entre sugestão e lista manual | carried from 4e1756f - observação, conforme AC 12 | `suggestAllocations.ts`, `actions.ts:300-302` |
| G8 limite `date == now` sem teste | fechado | `tests/unit/suggestAllocations.test.ts:125-129` |

## Adversarial read of the new rule

verified at 6f0f04c - snippet em memória, sem banco, fora do repo.

- Contra-exemplo da rodada 1: três vagas preenchidas, `unfilled: []`.
- Caso do brief (único capacitado de B é o melhor de A): `[B->u1, A->u2]`.
- Determinismo: 300 embaralhamentos da lista de candidatos, 1 resultado distinto.
- Busca exaustiva sobre toda capacitação possível e toda ordem de carga, comparando com o
  emparelhamento máximo: 3x3 (2.058 instâncias), 3x4 (81.000) e 4x4 (1.215.000). Zero violações em
  todas: ninguém escolhido duas vezes, ninguém fora da lista de capacitados da função.
- Os claims literais de C1 a C6 continuam valendo sob o laço novo (provas verdes acima).
- Ocorrência cancelada não grava nada: a checagem (`suggestAllocations.ts:36`) vem antes do primeiro
  `allocation.create` (`:85`) e C16 afirma zero `create` e zero `notifyUser`.

## Residual limitations

Nenhuma bloqueia; todas pedem o aceite do usuário porque foram registradas pelo autor do fix.

**R1 - a regra gulosa com recontagem ainda fica abaixo do máximo em alguns arranjos** -
`src/modules/scheduling/domain/suggest.ts:50-54`. Exemplo com três vagas: Vocal {a, b}, Violão {a, c},
Teclado {a, c}, cargas c=0, a=1, b=2. As três empatam em 2 elegíveis, Vocal vai primeiro e fica com
`a` (carga menor que `b`); sobra só `c` para Violão e Teclado, e Teclado sai "sem candidato". Existe
escalação completa (Vocal `b`, Violão `a`, Teclado `c`). É realista: uma pessoa versátil com carga
baixa, uma que só canta, uma que toca dois instrumentos. Frequência medida na busca exaustiva
(instâncias abaixo do máximo, regra da rodada 1 contra regra nova): 3x3 4,37% contra 0,87%; 3x4 1,96%
contra 0,36%; 4x4 11,21% contra 2,68%. O fix reduziu o problema a cerca de um quarto, não o eliminou.
Não reprovo porque: a AC 15 está cumprida ao pé da letra, o plano agora declara "gulosa com
recontagem, não prova o máximo", o resultado é uma sugestão pior e não dado errado, e o líder corrige
trocando duas vagas à mão. O custo real: em data publicada `a` já recebeu o push de Vocal antes da
troca, e o rótulo "sem candidato" é falso nesse caso. Um emparelhamento por caminho de aumento sobre o
mesmo critério de ordem eliminaria o caso sem migração; fica como recomendação.

**R2 - quem recusou pode ser escalado de novo** (G3 da rodada 1) -
`src/modules/scheduling/services/respondAllocation.ts:45`. Aceitável como fora de escopo: a recusa
apaga a alocação e não deixa registro com o id de quem recusou (a notificação `decline:` guarda só a
ocorrência e o líder), então lembrar a recusa exige coluna ou tabela nova, migração e uma decisão de
produto sobre por quanto tempo a recusa vale. Não há correção barata dentro desta feature. O
comportamento não corrompe nada: o líder aciona de propósito, a pessoa pode recusar de novo e o líder
pode trocar a vaga à mão.

**R3 - vaga perdida em corrida aparece como "sem candidato"** (G4) -
`suggestAllocations.ts:100-101`. Aceitável: exige dois líderes na mesma data no mesmo instante, a AC 11
pede só "não preenchida" e a recarga da tela mostra quem ficou com a vaga.

## Swept existing

carried from 4e1756f - o fix não tocou `notify.ts`, `OccurrenceRow.tsx` nem `OccurrenceMenu.tsx`;
citação de `actionError.ts` relocalizada.

| Row | Cited constraint | In the code |
| --- | --- | --- |
| failure modes - `notifyUser` nunca lança | try/catch em volta de tudo | sim - `src/modules/notifications/services/notify.ts:30` e `:69-72` |
| dependency failure - push falho logado e engolido | catch por subscription | sim - `src/modules/notifications/services/notify.ts:52-60` |
| observability - `handleActionError` loga com escopo e `ref` | `logError(scope, e, ctx)` | sim - `src/lib/actionError.ts:64-72`, chamado em `app/(app)/escalas/actions.ts:381` |
| loading (plan, Observable) - `pending` desabilita o menu | `disabled={pending}` | sim - `app/(app)/escalas/OccurrenceRow.tsx:392` e `app/(app)/escalas/OccurrenceMenu.tsx:75` |

## Gate

`npm run test` - 377 passed, 0 failed (62 arquivos, exit 0, em 6f0f04c); `npm run typecheck` exit 0
