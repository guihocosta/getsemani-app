# Sugestão automática de escalação verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: c5f657b..9a58a2c (provas rodadas em HEAD 4e1756f)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

As 14 provas rodam verdes em `HEAD` e cada check tem asserção localizada. A reprovação vem da
leitura adversária do diff, não dos checks: a regra pura deixa vaga vazia e a reporta como "sem
candidato" quando existe escalação completa (G1), o serviço grava e notifica em ocorrência
cancelada (G2), e a regra determinística reescala quem acabou de recusar (G3). Nenhum check cobre
esses três caminhos, por isso todos continuam verdes.

Passo 5 (percorrer o fluxo com o usuário): não executado - o verificador não alcança o usuário.
Passos 1 e 4 e o recompute de Coverage não rodam no perfil `light`.

## Checks

verified at 4e1756f - uma única invocação
`npx vitest run tests/unit/suggest.test.ts tests/unit/suggestAllocations.test.ts tests/unit/actionError.test.ts --reporter=verbose -t "<alternação dos 14 padrões>"`
(exit 0, 17 casos passaram, 31 pulados pelo filtro); cada teste nomeado apareceu individualmente
como executado e aprovado. Provas grep e `npm run typecheck` como escritas, todas exit 0. Os arquivos
da feature não mudaram entre 9a58a2c e HEAD (só `reports.ts` ganhou `overviewData`, sem tocar
`loadByPerson` nem `attendanceRows`).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | menor carga; empate -> menos faltas; empate -> menor `userId` | `-t "ordem de escolha"` - passou | `tests/unit/suggest.test.ts:32` - `expect(plan({ candidates: [cand("u1", 3), cand("u2", 1), cand("u3", 2)] }).picks).toEqual([{ slotId: "s1", userId: "u2" }])`; `:36` faltas `.toBe("u2")`; `:38` `.toBe("u4")` | PASS |
| C2 | indisponível não é escolhido mesmo com a menor carga | `-t "indisponivel"` - passou | `tests/unit/suggest.test.ts:43` - `expect(p.picks).toEqual([{ slotId: "s1", userId: "u2" }])` | PASS |
| C3 | capacitação declarada restringe; `null` libera todos | `-t "capacitacao"` - passou | `tests/unit/suggest.test.ts:50` - `expect(declarada.picks[0].userId).toBe("u2")`; `:53` - `expect(naoDeclarada.picks[0].userId).toBe("u1")` | PASS |
| C4 | uma pessoa por data; já alocado não é escolhido | `-t "uma vez por data"` - passou | `tests/unit/suggest.test.ts:62` - `expect(p.picks).toEqual([{ slotId: "s1", userId: "u1" }, { slotId: "s2", userId: "u2" }])`; `:68` - `expect(comAlocado.picks).toEqual([{ slotId: "s1", userId: "u2" }])` | PASS |
| C5 | vaga mais restrita primeiro; empate mantém a ordem recebida | `-t "vaga mais restrita primeiro"` - passou | `tests/unit/suggest.test.ts:83` - `expect(p.picks).toEqual([{ slotId: "bateria", userId: "u1" }, { slotId: "vocal", userId: "u2" }])`. A metade "empate mantém a ordem" não é exercida por esta prova (1 x 3 elegíveis, sem empate); está asserida em `:62`, sob a prova de C4. Ver G1 e G5 | PASS |
| C6 | vaga sem elegível vai para `unfilled`, não para `picks` | `-t "sem candidato"` - passou | `tests/unit/suggest.test.ts:97` - `expect(p.picks).toEqual([{ slotId: "s1", userId: "u1" }])`; `:98` - `expect(p.unfilled).toEqual(["s2"])` | PASS |
| C7 | 2 `allocation.create` com `LEADER` e `PENDING`, só nas abertas ativas; `{ filled: 2, unfilled: 0 }` | `-t "grava PENDING"` - passou | `tests/unit/suggestAllocations.test.ts:82` - `expect(res).toEqual({ filled: 2, unfilled: 0 })`; `:83` - `toHaveBeenCalledTimes(2)`; `:84` - `toHaveBeenCalledWith({ data: { slotId: "s1", userId: "u1", source: "LEADER", status: "PENDING" } })` | PASS |
| C8 | publicada notifica com `assign:<id>`; rascunho não notifica | `-t "notifica so se publicada"` - passou | `tests/unit/suggestAllocations.test.ts:95` - `expect(notifyUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", type: "ASSIGNMENT", dedupeKey: "assign:al1" }))`; `:105` - `expect(notifyUser).not.toHaveBeenCalled()` | PASS |
| C9 | `FORBIDDEN` sem gravar | `-t "FORBIDDEN nao grava"` - passou | `tests/unit/suggestAllocations.test.ts:110` - `rejects.toThrow("FORBIDDEN")`; `:111` - `expect(prisma.allocation.create).not.toHaveBeenCalled()` | PASS |
| C10 | data passada -> `OCCURRENCE_PAST` sem gravar; mensagem "Essa data já passou." | `-t "OCCURRENCE_PAST"` nos dois arquivos - passou (4 casos) | `tests/unit/suggestAllocations.test.ts:118` - `rejects.toThrow("OCCURRENCE_PAST")`; `:119` - `create).not.toHaveBeenCalled()`; `tests/unit/actionError.test.ts:56` - `expect(MENSAGENS.OCCURRENCE_PAST).toBe("Essa data já passou.")` | PASS |
| C11 | `P2002` na 1ª de duas -> `{ filled: 1, unfilled: 1 }` | `-t "P2002"` - passou | `tests/unit/suggestAllocations.test.ts:128` - `expect(await suggestAllocations("o1", NOW)).toEqual({ filled: 1, unfilled: 1 })` | PASS |
| C12 | janelas de carga e de faltas, com `[ministryId]` | `-t "janelas"` - passou | `tests/unit/suggestAllocations.test.ts:135` - `expect(loadByPerson).toHaveBeenCalledWith(new Date(DATA.getTime() - 30 * DIA), new Date(DATA.getTime() + 30 * DIA), ["m1"])`; `:140` - `expect(attendanceRows).toHaveBeenCalledWith(new Date("2026-09-02T03:00:00.000Z"), new Date("2026-10-02T03:00:00.000Z"), ["m1"])` | PASS |
| C13 | texto de retorno (plural, singular, nada preenchido) e `OccurrenceRow` usa `suggestOutcome` | `-t "suggestOutcome"` - passou; `grep -q "suggestOutcome("` exit 0; `npm run typecheck` exit 0 | `tests/unit/suggest.test.ts:104` - `toEqual({ message: "2 vagas preenchidas, 1 sem candidato", isError: false, refresh: true })`; `:109` - `.toBe("1 vaga preenchida, 0 sem candidato")`; `:110` - `.refresh).toBe(false)`; ligação lida em `app/(app)/escalas/OccurrenceRow.tsx:273` | PASS |
| C14 | texto de confirmação por estado de publicação; `confirm` antes da action | `-t "suggestConfirmText"` - passou; `grep -q "suggestConfirmText(props.published)"` exit 0 | `tests/unit/suggest.test.ts:121` - `expect(suggestConfirmText(true)).toContain("serão avisados agora")`; `:122` - `toContain("só ao publicar")`; ordem lida em `app/(app)/escalas/OccurrenceRow.tsx:265` (confirm) antes de `:273` (action) | PASS |

Nível e amostragem: C7..C12 afirmam chamadas e retornos do serviço e são provados no próprio serviço
com Prisma simulado - o nível casa com o claim. C13 e C14 afirmam comportamento de tela ("mostrar",
"recarregar", "pedir confirmação") e a parte de tela é provada só por grep de substring + typecheck;
o próprio `checks.md` declara isso (o repo não tem teste de componente). Li a ligação em
`OccurrenceRow.tsx:264-278` e ela está correta, mas nenhuma prova falharia se o `props.onChanged()`
da linha 276 fosse removido.

## Swept existing

| Row | Cited constraint | In the code |
| --- | --- | --- |
| failure modes - `notifyUser` nunca lança | try/catch em volta de tudo | sim - `src/modules/notifications/services/notify.ts:30` e `:69-72` (`logError` + `return "failed"`) |
| dependency failure - push falho logado e engolido | catch por subscription | sim - `src/modules/notifications/services/notify.ts:52-60` |
| observability - `handleActionError` loga com escopo e `ref` | `logError(scope, e, ctx)` | sim - `src/lib/actionError.ts:62-70`, chamado em `app/(app)/escalas/actions.ts:381` com `"escalas.suggest"` e `occurrenceId` |
| loading (plan, Observable) - `pending` desabilita o menu | `disabled={pending}` | sim - `app/(app)/escalas/OccurrenceRow.tsx:392` e `app/(app)/escalas/OccurrenceMenu.tsx:75` |

## Gaps

Ordenados por gravidade. G1 a G3 sustentam a reprovação; G4 a G8 são observações menores.

**G1 - vaga fica vazia e é reportada "sem candidato" quando existe escalação completa** (AC 5, AC 6,
C5) - `src/modules/scheduling/domain/suggest.ts:42-44` e `:51`. A contagem de elegíveis que ordena as
vagas é calculada uma vez, antes de qualquer pessoa ser consumida, e não é refeita. Reproduzido com
snippet em memória (sem banco, fora do repo): funções Vocal {a, b}, Violão {b, c}, Teclado {a, c},
cargas a=0, c=1, b=2. Todas empatam em 2 elegíveis, a ordem recebida vale: Vocal fica com `a`, Violão
com `c` (carga 1 contra 2 de `b`), e Teclado sai em `unfilled` - resultado
`picks: [vocal->a, violao->c], unfilled: [teclado]`. Existe escalação completa (Vocal `b`, Violão `c`,
Teclado `a`) e Teclado tem dois elegíveis, então a tela diz "2 vagas preenchidas, 1 sem candidato"
sobre uma vaga que tem candidato. É o cenário que o comentário da linha 40 diz evitar ("não gastar o
único capacitado de uma função em outra"): depois que `a` sai, `c` é o único que resta para Teclado e
é gasto em Violão. Recontar os elegíveis restantes a cada escolha resolve este caso (Teclado passa a
ter 1 e vai na frente). O caso pedido no brief - único capacitado de B é também o melhor de A -
funciona (`picks: [B->u1, A->u2]`), porque aí a contagem estática já difere. Banda pequena com cada
pessoa capacitada em duas funções é o uso normal do ministério de louvor. AC 5 não diz se a contagem é
antes ou depois do consumo: gap de precisão do critério que virou resultado errado.

**G2 - ocorrência cancelada recebe alocações e dispara push** (sem AC; CLAUDE.md, cancelamento com
escopo) - `src/modules/scheduling/services/suggestAllocations.ts:24-30`. O serviço checa liderança
(`:29`) e data passada (`:30`), mas não `occurrence.status`. `deleteScheduleOccurrence` só marca
`CANCELLED` (`deleteSchedule.ts:19`, `:31`) e `listMonthOccurrences.ts:51` esconde a data, então o
caminho é aba desatualizada: líder A com `/escalas` aberto, líder B exclui a data, A toca em "Sugerir
escalação". Resultado: N alocações `PENDING` numa data cancelada e, se publicada, N pushes "Você foi
escalado" para um culto que não existe e que não aparece em `getMySchedule` (`:23` filtra `ACTIVE`).
`repeatSchedule.ts:40`, o serviço irmão, filtra `status: "ACTIVE"`. `allocateVolunteer` tem o mesmo
buraco pré-existente, mas uma vaga por toque; aqui é a data inteira de uma vez.

**G3 - quem acabou de recusar é escalado de novo** (sem AC) -
`src/modules/scheduling/services/respondAllocation.ts:45` apaga a alocação na recusa (não existe
`DECLINED`), a vaga reabre e a carga da pessoa cai em 1. O líder recebe "Voluntário recusou uma
escala", toca em "Sugerir escalação", e a regra determinística (`suggest.ts:51`) escolhe a mesma
pessoa - ela era a de menor carga antes e agora tem carga ainda menor. Novo `PENDING`, novo push, e o
ciclo se repete a cada toque até a pessoa cadastrar indisponibilidade. O plano não previu o caso; é o
fluxo natural depois de uma recusa.

**G4 - vaga perdida em corrida é reportada como "sem candidato"** (AC 11, AC 13) -
`suggestAllocations.ts:94` soma o `P2002` no mesmo contador que `suggest.ts:72` escreve como "sem
candidato". A AC 11 pede "não preenchida"; o texto afirma outra coisa. Com zero vagas abertas o texto
é "0 vagas preenchidas, 0 sem candidato" (`suggestAllocations.ts:33`).

**G5 - C5 afirma mais do que sua prova exercita** - `tests/unit/suggest.test.ts:71-87`. O claim tem
duas metades; a prova nomeada só exercita a primeira. A segunda está asserida em `:62`, sob C4. A
frase de `checks.md` "nenhum outro check afirma mais do que o caso que sua prova exercita" não vale
para C5.

**G6 - caminho de erro não revalida `/`** - `app/(app)/escalas/actions.ts:383`. Se um erro não-`P2002`
estoura no meio, as alocações anteriores ficam gravadas e notificadas; a action revalida `/escalas` e
a tela recarrega (`OccurrenceRow.tsx:276`), então o líder vê as vagas preenchidas junto com o erro
genérico. A home dos voluntários (`/`) só é revalidada no sucesso (`actions.ts:378`).

**G7 - carga da sugestão e carga da lista manual usam janelas diferentes** -
`suggestAllocations.ts:42-46` (30 dias antes a 30 depois da data) contra
`app/(app)/escalas/actions.ts:300-302` (30 dias antes de agora até agora). Está conforme a AC 12, mas
o número que o líder lê ao abrir a vaga não explica a escolha da sugestão. `loadByPerson`
(`reports.ts:35-58`) conta toda alocação com conta em ocorrência `ACTIVE` do ministério, inclusive em
rascunho e pendente de confirmação, com os dois limites inclusivos - coerente com "escalas futuras já
marcadas" do plano. O cache de candidatos do `OccurrenceRow` (`:78`) não é zerado depois da sugestão.

**G8 - limite `date == now` e leitura antes da autorização** - `suggestAllocations.ts:30` usa `<=`,
não testado no limite. `findUniqueOrThrow` (`:24`) roda antes de `requireLeaderOf` (`:29`): nenhuma
escrita antes da autorização, só a diferença entre "não existe" e "sem permissão", mesmo padrão de
`allocateVolunteer`.

Conferido e sem achado: determinismo (300 embaralhamentos da lista de candidatos, 1 resultado
distinto); ninguém é usado duas vezes na data, nem com `userId` repetido na entrada; indisponível e não
capacitado nunca entram; candidatos vêm de `activeMemberIds` (`memberships.ts:5-10`, só `ACTIVE`),
convidado sem conta não entra, e quem já está alocado na data é excluído, inclusive em vaga inativa
(`suggestAllocations.ts:67-69`); vaga inativa e vaga preenchida não são tocadas (`:32`); rascunho grava
e não notifica (`notifyIfPublished.ts:10`), e publicar depois avisa com a mesma `dedupeKey`
(`publishOccurrence.ts:29`); janela de faltas é `attendanceWindow(now)` e `attendanceRows` filtra
`ACTIVE` e `published`; confirmação antes da action, mensagem depois, recarga no sucesso e no erro, a
nota sobrevive à recarga (linha com `key={o.occurrenceId}` em `EscalaCalendar.tsx:228`), textos em
pt-BR, só tokens de tema (`OccurrenceMenu.tsx:80`).

## Gate

`npm run test` - 365 passed, 0 failed (61 arquivos, exit 0, em 4e1756f); `npm run typecheck` exit 0
