# Horário em lote verification

**Verdict**: FAIL
**Mutations**: 3 - probed C14, C8, C15 (0 killed, 3 not)
**Proofs**: `proofs.md` at a98ee7d (code identical to 2687b60)
**Verifier**: independent sub-agent (author != verifier)

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| "Só esta data" deixa o dia faltando para a materialização: o cron das 06:00 recria uma ocorrência vazia no horário antigo do mesmo dia, o bug que o plano diz fechar (Problem; Shape passo 4) | own example: `planRetime` SINGLE 25/10 18:00 -> 18:30 com `startTime` 18:00; `expandOccurrences(startTime "18:00")` devolve `2026-10-25T21:00:00Z`, que não existe mais -> `materializeOccurrences` cria a duplicata | decidir no plano como a data movida em SINGLE fica fora da materialização (ex.: marcar o instante original da recorrência na `Occurrence`, ou checar por dia local em `materializeOccurrences`) e provar com teste plan -> expand sem dia faltando | `1de6990` - door 3 (AD-014), C26 C27 |
| "Esta e as próximas" a partir de 25/10 deixa 18/10 (futura) às 18:00 com `startTime` 18:30: a materialização cria 18/10 18:30 vazia ao lado da 18/10 18:00 | own example: AC 2 com datas 18/10, 25/10, 01/11 e agora 15/10; após o plano, `expandOccurrences(startTime "18:30")` devolve `2026-10-18T21:30:00Z` faltando | mesma decisão do item acima; C3/C16 só provam o caminho "Editar escala" | `1de6990` - door 3 (AD-014), C26 C27 |
| Authz no ministério errado passa sem teste falhar | mutation `requireLeaderOf(occ.schedule.ministryId) -> requireLeaderOf(occ.scheduleId)` not killed (C14); `retimeOccurrence.test.ts` "sem permissao" só mocka rejeição, não assere o argumento | assert `requireLeaderOf` chamado com `"m1"` | `1de6990` - C14 assere `requireLeaderOf("m1")` |
| Duas datas com pessoas indo ao mesmo instante novo viram fusão: uma é apagada com as alocações em cascata, e nenhum teste falha (AC 6 manda recusar) | mutation `full.length > 1 -> full.length > 2` in `retime.ts:64` not killed (C8); C8 só cobre a "sentada" com conteúdo, não dois movidos com conteúdo no mesmo dia (duplicatas antigas 18:00 e 18:15 -> 18:30). Own example confirma que HEAD recusa corretamente | adicionar a C8 o caso de dois alvos com pessoa no mesmo dia local devolvendo `conflito` | `1de6990` - C8 ganha dois alvos com pessoa no mesmo dia |
| "Editar escala" move também datas de hoje que já passaram e nenhum teste falha (AC 3: "a partir de agora") | mutation `targets: occurrences.filter((o) => o.date >= now) -> targets: occurrences` in `updateSchedule.ts:50` not killed (C15); fixtures de C15 só têm datas depois de NOW, mas `loadRetimeOccurrences` carrega desde `startOfDay(now)` | incluir em C15 uma linha de hoje antes de NOW e assertar que não é movida | `1de6990` - C15 ganha data de hoje antes de agora |
| C13 não prova a busca do instante tomado na corrida | `retimeOccurrence.test.ts` "corrida vira horario ocupado": `findFirst` devolve `2026-10-25T21:30Z`, igual ao fallback `plan.moves[0].to`; remover a consulta não muda o resultado | usar FROM_HERE com 2 movimentos e `findFirst` devolvendo o segundo instante | `1de6990` - C13 usa FROM_HERE com o segundo instante tomado |
| C4 assere só os ids movidos, não o instante novo nem `startTime` | `retime.ts` test "datas passadas ficam": `plan.moves.map((m) => m.id)` | assertar `toEqual` do plano inteiro | `1de6990` - C4 assere o plano inteiro |
