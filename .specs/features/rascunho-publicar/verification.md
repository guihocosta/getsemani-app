# Rascunho e publicação de escala verification

**Verdict**: PASS
**Profile**: light
**Diff range**: e22a947..27995d9 (fix da rodada 3: 9d6dc96..27995d9, restrito aos arquivos desta feature)
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Os 21 checks estão provados em `HEAD` (27995d9) com evidência localizada. O commit 27995d9 só toca
`publishOccurrence.ts`, `tests/unit/publishOccurrence.test.ts` e plan/checks; a releitura
adversarial não achou usuário que o líder escalou e que deixe de ser avisado ao publicar, nem
caminho novo de vazamento de rascunho. Os outros commits da branch (repertório, panorama, avisos,
sugestão, visão geral) não foram verificados aqui como features, mas li cada leitor de
`Occurrence`/`Slot`/`Allocation` que eles adicionaram e todos respeitam o rascunho (ver
`## Adversarial read`).

Passo 5 (percorrer o fluxo com o usuário): não executado - o verificador não alcança o usuário.

## Checks

verified at 27995d9 - todas as provas C1..C21 rodaram de novo neste commit. C1-C4 e C20-C21 estão em
`publishOccurrence.test.ts`, que mudou no fix, então as linhas foram relocalizadas. As demais
citações vêm de arquivos não tocados pelo fix e foram reconferidas.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | tornar rascunho grava `published: false` e não notifica | vitest em lote, exit 0; caso "tornar rascunho nao notifica" rodou e passou | `tests/unit/publishOccurrence.test.ts:44` - `expect(prisma.occurrence.update).toHaveBeenCalledWith({ where: { id: "o1" }, data: { published: false } })`; `:45` - `expect(notifyUser).not.toHaveBeenCalled()` | PASS |
| C2 | publicar grava `published: true` e notifica 2x com `ASSIGNMENT` e `assign:al1` e `assign:al2` | mesmo run; caso "publicar notifica cada alocado com conta" passou | `tests/unit/publishOccurrence.test.ts:57` - `data: { published: true }`; `:58` - `expect(notifyUser).toHaveBeenCalledTimes(2)`; `:59-65` - `objectContaining` com `type: "ASSIGNMENT"` e `dedupeKey` `assign:al1` e `assign:al2` | PASS |
| C3 | convidado não gera `notifyUser` ao publicar | mesmo run; caso "convidado nao e notificado ao publicar" passou | `tests/unit/publishOccurrence.test.ts:73` - `expect(notifyUser).not.toHaveBeenCalled()` | PASS |
| C4 | `FORBIDDEN` rejeita sem `occurrence.update` | mesmo run; caso "FORBIDDEN nao grava" passou | `tests/unit/publishOccurrence.test.ts:82` - `rejects.toThrow("FORBIDDEN")`; `:83` - `expect(prisma.occurrence.update).not.toHaveBeenCalled()` | PASS |
| C5 | schema e migração declaram `published` com default `true` | `grep -Eq` no schema e `grep -rq` nas migrações, exit 0 | `prisma/schema.prisma:170` - `published Boolean @default(true)`; `prisma/migrations/20261002180000_occurrence_published/migration.sql:2` - `ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true` | PASS |
| C6 | `notifyIfPublished(false)` devolve `"skipped"`; `(true)` repassa os params | mesmo run; 2 casos de `notifyIfPublished` passaram | `tests/unit/notifyIfPublished.test.ts:20` - `expect(await notifyIfPublished(false, params)).toBe("skipped")`; `:26` - `expect(notifyUser).toHaveBeenCalledWith(params)` | PASS |
| C7 | `allocateVolunteer` em rascunho cria `PENDING` sem notificar; publicada notifica `assign:al1` | mesmo run; 2 casos `allocateVolunteer` passaram | `tests/unit/allocateDraft.test.ts:44` - `status: "PENDING"`; `:46` - `expect(notifyUser).not.toHaveBeenCalled()`; `:54` - `dedupeKey: "assign:al1"` | PASS |
| C8 | os cinco serviços não chamam `notifyUser(` direto | `! grep -l "notifyUser(" <5 arquivos>` exit 0 | `allocateVolunteer.ts:85`, `allocateGuest.ts:81`, `linkGuestAllocation.ts:58`, `repeatSchedule.ts:155`, `setSlotActive.ts:24` - `notifyIfPublished(...)` (em `src/modules/scheduling/services/`) | PASS |
| C9 | `listMonthOccurrences` consulta com `OR` publicada ou gerenciável e item carrega `published` | mesmo run; caso "rascunho so para gerenciaveis e item carrega published" passou | `tests/unit/listMonthOccurrences.test.ts:31` - `OR: [{ published: true }, { schedule: { ministryId: { in: ["m1"] } } }]`; `:35` - `expect(items.map((i) => [i.occurrenceId, i.published])).toEqual(...)` | PASS |
| C10 | `getMySchedule` filtra `published: true` | mesmo run; caso "so ocorrencia publicada entra na agenda do voluntario" passou | `tests/unit/getMySchedule.test.ts:19` - `slot: { occurrence: { status: "ACTIVE", published: true, date: { gte: from } } }` | PASS |
| C11 | as duas consultas de `/vagas` filtram `published: true` | `test "$(grep -c "published: true" "app/(app)/vagas/page.tsx")" -eq 2` exit 0 | `app/(app)/vagas/page.tsx:36` (vagas livres) e `:56` (trocas abertas) - `published: true` | PASS |
| C12 | `selfAllocate` em rascunho rejeita `NOT_PUBLISHED` sem criar; mapeamento e mensagem corretos | mesmo run; casos "selfAllocate em rascunho rejeita com NOT_PUBLISHED sem gravar" e "NOT_PUBLISHED avisa que a escala ainda nao foi publicada" passaram | `tests/unit/allocateDraft.test.ts:65` - `rejects.toThrow("NOT_PUBLISHED")`; `:66` - `expect(prisma.allocation.create).not.toHaveBeenCalled()`; `tests/unit/actionError.test.ts` - `expect(MENSAGENS.NOT_PUBLISHED).toBe("Essa escala ainda não foi publicada.")` | PASS |
| C13 | `attendanceRows` e cron `reminders` filtram `published: true` | mesmo run (2 casos `attendanceRows` passaram); `grep -q "published: true" app/api/cron/reminders/route.ts` exit 0 | `tests/unit/attendanceReport.test.ts:32` e `:53` - `published: true` no `where`; `app/api/cron/reminders/route.ts:26` | PASS |
| C14 | `publishMenuItem` devolve rótulo e alvo opostos; `OccurrenceRow` mostra selo e usa o helper | mesmo run; `grep` de `rascunho` e `publishMenuItem(` em `OccurrenceRow.tsx` exit 0; `npm run typecheck` exit 0 | `tests/unit/publishMenuItem.test.ts:6` - `toMatchObject({ label: "Publicar", target: true })`; `:7` - `toMatchObject({ label: "Tornar rascunho", target: false })` | PASS |
| C15 | confirmação só ao tornar rascunho, com o texto exato | mesmo run; caso "confirmacao so ao tornar rascunho" passou | `tests/unit/publishMenuItem.test.ts:11` - `expect(publishMenuItem(true).confirm).toBe("Voluntários deixam de ver esta data até você publicar de novo.")`; `:12` - `expect(publishMenuItem(false).confirm).toBeNull()` | PASS |
| C16 | `requestSwap` em rascunho rejeita `NOT_PUBLISHED`, sem criar pedido e sem notificar | mesmo run; caso "requestSwap em rascunho rejeita com NOT_PUBLISHED sem criar pedido nem notificar" passou | `tests/unit/draftGuards.test.ts:71` - `rejects.toThrow("NOT_PUBLISHED")`; `:72` - `expect(prisma.swapRequest.create).not.toHaveBeenCalled()`; `:73` - `expect(notifyUser).not.toHaveBeenCalled()` | PASS |
| C17 | `claimSwap` em rascunho rejeita `NOT_PUBLISHED`, sem reatribuir e sem notificar | mesmo run; caso "claimSwap em rascunho rejeita com NOT_PUBLISHED sem reatribuir nem notificar" passou | `tests/unit/draftGuards.test.ts:86` - `rejects.toThrow("NOT_PUBLISHED")`; `:87` - `expect(tx.allocation.update).not.toHaveBeenCalled()`; `:89` - `expect(notifyUser).not.toHaveBeenCalled()` | PASS |
| C18 | confirmar, recusar e check-in em rascunho rejeitam `NOT_PUBLISHED` sem gravar | mesmo run; os 3 casos de "resposta em rascunho" passaram | `tests/unit/draftGuards.test.ts:99-100`, `:104-105`, `:109-110` - `rejects.toThrow("NOT_PUBLISHED")` e `expect(prisma.allocation.update).not.toHaveBeenCalled()` ou `.delete` | PASS |
| C19 | `notifyRemoval` pula só quem nunca soube; os três pontos de remoção usam o helper | mesmo run (4 casos `notifyRemoval` passaram); 2a prova de `checks.md` (contagem de `notifyRemoval(` nos 3 arquivos igual a 3) exit 0 | `tests/unit/draftGuards.test.ts:124` - `expect(await notifyRemoval(false, { id: "al1", status: "PENDING" }, params)).toBe("skipped")`; `:125` - `expect(wasNotified).toHaveBeenCalledWith("assign:al1")`; `:136-137` confirmado; `:141-142` publicada | PASS |
| C20 | ao publicar com alocações `LEADER` (u1), `SELF` (u2) e `SWAP` (u3), só u1 é notificado, com `assign:al1` | mesmo run; caso "so alocacao do lider: quem se auto-alocou ou assumiu troca nao e avisado" passou | `tests/unit/publishOccurrence.test.ts:100` - `expect(notifyUser).toHaveBeenCalledTimes(1)`; `:101` - `expect(notifyUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", dedupeKey: "assign:al1" }))`; filtro em `src/modules/scheduling/services/publishOccurrence.ts:28` - `s.allocation.source === "LEADER"` | PASS |
| C21 | publicar data cancelada ou passada grava `published: true` e não notifica | mesmo run; casos "data cancelada muda o flag e nao avisa ninguem" e "data passada muda o flag e nao avisa ninguem" passaram | `tests/unit/publishOccurrence.test.ts:111` e `:122` - `expect(prisma.occurrence.update).toHaveBeenCalledWith({ where: { id: "o1" }, data: { published: true } })`; `:112` e `:123` - `expect(notifyUser).not.toHaveBeenCalled()`; guarda em `publishOccurrence.ts:23-24` | PASS |

Como as provas rodaram: uma invocação do vitest sobre os 9 arquivos de prova com `--reporter=verbose`
(67 testes, 0 falhas; o número cresceu porque `actionError`, `getMySchedule` e `listMonthOccurrences`
ganharam casos de outras features); cada caso nomeado acima aparece individualmente como executado
e aprovado. As provas grep/`test` (C5, C8, C11, C13b, C14b, C19b) deram exit 0 e `npm run typecheck`
deu exit 0.

Fixture de data de C20 e do caso padrão: `tests/unit/publishOccurrence.test.ts:21` -
`over.date ?? new Date("2999-10-11T22:00:00Z")`, com o comentário "data longe no futuro" em `:20`. O
teste não passa a falhar quando o calendário avança. O caso "data passada" usa 2000-01-02
(`:117`), sempre no passado.

## Level and sampling

verified at 27995d9 para C20-C21; carried from 9d6dc96 para C1-C19 (exceto as linhas de C1-C4,
relocalizadas).

- C20 prova três membros de `source` (`LEADER`, `SELF`, `SWAP`) num único caso e cobre o conjunto
  inteiro do enum `AllocationSource` (`prisma/schema.prisma:34-38`). Não há quarto valor.
- C21 cobre os dois ramos da guarda (`status` e `date`) com um caso cada; o caso `status` usa data
  futura, o caso `date` usa status ativo, então cada ramo é exercitado isoladamente.
- C21 prova que o flag é gravado e que ninguém é avisado, mas nenhum teste afirma o valor devolvido
  (`{ notified: 0 }`); é detalhe de retorno, não parte do claim.
- Notas das rodadas anteriores seguem valendo: C9, C10, C13 contra Prisma mockado; C8, C11, C13b,
  C14b por grep; sem teste do caminho publicado para as funções de S5.

## Swept rows marked existing

verified at 27995d9 - `notify.ts` mudou depois da rodada 2 (commits de outras features), então as
linhas foram relidas.

| Row | Cited constraint | In the code |
| --- | --- | --- |
| failure modes | `notifyUser` nunca lança | sim - `src/modules/notifications/services/notify.ts`, corpo de `notifyUser` em `try` com `catch` que loga e devolve `"failed"` (linhas `:21` em diante) |
| idempotency | `notifyUser` devolve `"duplicate"` se já enviado | sim - mesmo arquivo, `if (existing?.sentAt) return "duplicate"` |
| dependency failure | falha de push logada e engolida | sim - mesmo arquivo, `try`/`catch` por subscription com `console.error` |
| observability | `handleActionError` loga com `ref` nas actions de `escalas` | sim - `src/lib/actionError.ts` (`logError(scope, e, ctx)`), usado em `app/(app)/escalas/actions.ts` (`setOccurrencePublishedAction`) |

## Adversarial read

verified at 27995d9.

Interação do fix com AC 2 e C2 (publicar avisa cada pessoa escalada pelo líder, uma vez, com
`assign:<id>`): preservada. Conferi todo ponto do código que grava `source`
(`grep` por `source` em `src/` e `app/`):

- `source: "LEADER"` em `allocateVolunteer.ts:73` (alocação) e `:141` (`reassignAllocation`),
  `allocateGuest.ts:31` e `:70`, `repeatSchedule.ts:147` e `suggestAllocations.ts:86`.
- `linkGuestAllocation` só atualiza a alocação de convidado existente, que já nasceu `LEADER` em
  `allocateGuest.ts`; o `source` não muda.
- `source: "SELF"` só em `selfAllocate.ts:57`; `source: "SWAP"` só em `swap.ts:176` (`claimSwap`).

Logo, toda alocação que o líder criou ou reatribuiu tem `source = LEADER`; ninguém que o líder
escalou fica sem aviso por causa do filtro. Quem tem `SELF` ou `SWAP` agiu por conta própria e já
sabe da vaga, então não receber "Você foi escalado" é o comportamento pedido (AC 20). Caso de
borda: uma alocação `LEADER` assumida numa troca vira `SWAP` (o assumidor não é avisado ao
publicar, correto); quem saiu foi tirado da alocação e nunca aparece na leitura. Alocação `LEADER`
já avisada devolve `"duplicate"` do `notifyUser` e não conta em `notified`.

Data cancelada ou passada setada para rascunho e publicada de novo: o flag muda
(`publishOccurrence.ts:19-22`), nada é avisado (`:23-24`), e a consistência com AC 1 e AC 9-13 se
mantém, porque a visibilidade vem do flag e do `status` nas leituras, não da ação de publicar:
`listMonthOccurrences`, `getMySchedule`, `/vagas`, cron e relatórios já excluem
`status != ACTIVE` e `published = false`. Uma data cancelada continua fora do calendário mesmo
publicada; uma data passada publicada volta a aparecer ao voluntário como histórico, sem push, que
é o efeito esperado. O retorno `{ notified: 0 }` é coerente com "nenhum aviso saiu" nos dois ramos.
Aviso passado nunca sai porque `date > new Date()` é avaliada na hora da publicação.

Efeito colateral fora do escopo estrito, registrado: em data cancelada ou passada, `published`
continua gravável pelo líder; é inofensivo, pois a data não aparece para ninguém.

Leitores de `Occurrence`/`Slot`/`Allocation` acrescentados por outras features desde a rodada 2
(conferidos contra o rascunho, sem declarar a verificação dessas features):

- `reports.ts` `overviewData` (`:85-104`): `published: true` no filtro compartilhado.
- `escalas/panorama/page.tsx`: usa `listMonthOccurrences` com `ledMinistryIds` (`:64`).
- `repertoire/services/setlist.ts:25`: `if (!access.published && !canManage) throw new Error("FORBIDDEN")`.
- `suggestAllocations.ts:90`: notifica via `notifyIfPublished`; exige `requireLeaderOf`.
- `occurrenceAccess.ts`: só expõe o `published` para o chamador decidir; sem checagem própria.

Nenhum vaza rascunho para quem não gerencia.

## Residual notes

verified at 27995d9. Nenhuma bloqueia.

1. Sem teste que afirme `{ notified: N }` devolvido por `setOccurrencePublished`; o valor só é
   consumido por ninguém hoje (a action descarta o retorno), então não há risco.
2. Rodadas anteriores, ainda abertas e não bloqueantes: nenhum teste do caminho publicado de
   `requestSwap`, `claimSwap` e `confirmAllocation`/`declineAllocation`/`checkInAllocation`; as
   actions de confirmar e recusar sem `try/catch` mostram `NOT_PUBLISHED` como erro não tratado em
   página obsoleta; `claimSwap` checa `published` antes da elegibilidade.
3. Fora do código: a migração continua não aplicada (pergunta aberta 1 do plano bloqueia o
   go-live). O verificador não rodou comando de banco.

## Gate

verified at 27995d9.

`npm run test` - 380 passed, 0 failed (62 arquivos); `npm run typecheck` - exit 0
