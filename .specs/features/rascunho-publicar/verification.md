# Rascunho e publicação de escala verification

**Verdict**: PASS
**Profile**: light
**Diff range**: e22a947..9d6dc96 (fix da rodada 2: 8e20029..9d6dc96)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Os 19 checks estão provados em `HEAD` (9d6dc96) com evidência localizada, e os dois vazamentos
que reprovaram a rodada 1 (troca e pedido de troca em data em rascunho) estão fechados no código.
A releitura adversarial do diff do fix não achou caminho restante em que quem não gerencia o
ministério veja, seja avisado de data nova ou aja sobre uma ocorrência em rascunho. Sobram
observações não bloqueantes em `## Residual notes`.

Passo 5 (percorrer o fluxo com o usuário): não executado - o verificador não alcança o usuário.

## Checks

verified at 9d6dc96 - todas as provas C1..C19 rodaram de novo neste commit. As citações de C1-C7 e
C9-C15 apontam para arquivos de teste que o fix não tocou (linhas conferidas, inalteradas desde
8e20029); C8 e C16-C19 foram relocalizadas.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | tornar rascunho grava `published: false` e não notifica | vitest em lote, exit 0; caso "tornar rascunho nao notifica" rodou e passou | `tests/unit/publishOccurrence.test.ts:36` - `expect(prisma.occurrence.update).toHaveBeenCalledWith({ where: { id: "o1" }, data: { published: false } })`; `:37` - `expect(notifyUser).not.toHaveBeenCalled()` | PASS |
| C2 | publicar grava `published: true` e notifica 2x com `ASSIGNMENT` e `assign:al1` / `assign:al2` | mesmo run; caso "publicar notifica cada alocado com conta" passou | `tests/unit/publishOccurrence.test.ts:50` - `expect(notifyUser).toHaveBeenCalledTimes(2)`; `:52` - `expect.objectContaining({ userId: "u1", type: "ASSIGNMENT", dedupeKey: "assign:al1" })`; `:55` idem `assign:al2` | PASS |
| C3 | convidado não gera `notifyUser` ao publicar | mesmo run; caso "convidado nao e notificado ao publicar" passou | `tests/unit/publishOccurrence.test.ts:65` - `expect(notifyUser).not.toHaveBeenCalled()` | PASS |
| C4 | `FORBIDDEN` rejeita sem `occurrence.update` | mesmo run; caso "FORBIDDEN nao grava" passou | `tests/unit/publishOccurrence.test.ts:74` - `rejects.toThrow("FORBIDDEN")`; `:75` - `expect(prisma.occurrence.update).not.toHaveBeenCalled()` | PASS |
| C5 | schema e migração declaram `published` com default `true` | `grep -Eq ... prisma/schema.prisma && grep -rq ... prisma/migrations` exit 0 | `prisma/schema.prisma:170` - `published Boolean @default(true)`; `prisma/migrations/20261002180000_occurrence_published/migration.sql:2` - `ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true` | PASS |
| C6 | `notifyIfPublished(false)` devolve `"skipped"`; `(true)` repassa os params | mesmo run; 2 casos de `notifyIfPublished` passaram | `tests/unit/notifyIfPublished.test.ts:20` - `expect(await notifyIfPublished(false, params)).toBe("skipped")`; `:21` - `expect(notifyUser).not.toHaveBeenCalled()`; `:26` - `expect(notifyUser).toHaveBeenCalledWith(params)` | PASS |
| C7 | `allocateVolunteer` em rascunho cria `PENDING` sem notificar; publicada notifica `assign:al1` | mesmo run; 2 casos `allocateVolunteer` passaram | `tests/unit/allocateDraft.test.ts:44` - `data: expect.objectContaining({ slotId: "s1", userId: "u1", status: "PENDING" })`; `:46` - `expect(notifyUser).not.toHaveBeenCalled()`; `:54` - `dedupeKey: "assign:al1"` | PASS |
| C8 | os cinco serviços não chamam `notifyUser(` direto | `! grep -l "notifyUser(" <5 arquivos>` exit 0 | `src/modules/scheduling/services/allocateVolunteer.ts:85`, `allocateGuest.ts:81`, `linkGuestAllocation.ts:58`, `repeatSchedule.ts:155`, `setSlotActive.ts:24` - `notifyIfPublished(...)`; remoções em `allocateVolunteer.ts:165`, `allocateGuest.ts:93`, `setSlotActive.ts:35` - `notifyRemoval(...)` | PASS |
| C9 | `listMonthOccurrences` consulta com `OR` publicada/gerenciável e item carrega `published` | mesmo run; caso "rascunho so para gerenciaveis e item carrega published" passou | `tests/unit/listMonthOccurrences.test.ts:31` - `OR: [{ published: true }, { schedule: { ministryId: { in: ["m1"] } } }]`; `:35` - `expect(items.map((i) => [i.occurrenceId, i.published])).toEqual([["o1", true], ["o2", false]])` | PASS |
| C10 | `getMySchedule` filtra `published: true` | mesmo run; caso "so ocorrencia publicada entra na agenda do voluntario" passou | `tests/unit/getMySchedule.test.ts:19` - `slot: { occurrence: { status: "ACTIVE", published: true, date: { gte: from } } }` | PASS |
| C11 | as duas consultas de `/vagas` filtram `published: true` | `test "$(grep -c "published: true" "app/(app)/vagas/page.tsx")" -eq 2` exit 0 | `app/(app)/vagas/page.tsx:36` (vagas livres) e `app/(app)/vagas/page.tsx:56` (trocas abertas) - `published: true` | PASS |
| C12 | `selfAllocate` em rascunho rejeita `NOT_PUBLISHED` sem criar; mapeamento e mensagem corretos | mesmo run; casos "selfAllocate em rascunho rejeita com NOT_PUBLISHED sem gravar" e "NOT_PUBLISHED avisa que a escala ainda nao foi publicada" passaram | `tests/unit/allocateDraft.test.ts:65` - `rejects.toThrow("NOT_PUBLISHED")`; `:66` - `expect(prisma.allocation.create).not.toHaveBeenCalled()`; `tests/unit/actionError.test.ts:51` - `expect(toActionCode(new Error("NOT_PUBLISHED"))).toBe("NOT_PUBLISHED")`; `:52` - `expect(MENSAGENS.NOT_PUBLISHED).toBe("Essa escala ainda não foi publicada.")` | PASS |
| C13 | `attendanceRows` e cron `reminders` filtram `published: true` | mesmo run (2 casos `attendanceRows` passaram); `grep -q "published: true" app/api/cron/reminders/route.ts` exit 0 | `tests/unit/attendanceReport.test.ts:32` e `:53` - `published: true` no `where` exato; `app/api/cron/reminders/route.ts:26` - `slot: { occurrence: { status: "ACTIVE", published: true, ... } }` | PASS |
| C14 | `publishMenuItem` devolve rótulo e alvo opostos; `OccurrenceRow` mostra selo e usa o helper | mesmo run (caso "publishMenuItem oferece a acao oposta ao estado atual" passou); `grep -q "rascunho" ... && grep -q "publishMenuItem(" ... && npm run typecheck` exit 0 | `tests/unit/publishMenuItem.test.ts:6` - `toMatchObject({ label: "Publicar", target: true })`; `:7` - `toMatchObject({ label: "Tornar rascunho", target: false })`; `app/(app)/escalas/OccurrenceRow.tsx:260` e `:353` | PASS |
| C15 | confirmação só ao tornar rascunho, com o texto exato | mesmo run; caso "confirmacao so ao tornar rascunho" passou | `tests/unit/publishMenuItem.test.ts:11` - `expect(publishMenuItem(true).confirm).toBe("Voluntários deixam de ver esta data até você publicar de novo.")`; `:12` - `expect(publishMenuItem(false).confirm).toBeNull()` | PASS |
| C16 | `requestSwap` em rascunho rejeita `NOT_PUBLISHED`, sem `swapRequest.create` e sem `notifyUser` | mesmo run; caso "requestSwap em rascunho rejeita com NOT_PUBLISHED sem criar pedido nem notificar" passou | `tests/unit/draftGuards.test.ts:71` - `await expect(requestSwap({ allocationId: "al1" })).rejects.toThrow("NOT_PUBLISHED")`; `:72` - `expect(prisma.swapRequest.create).not.toHaveBeenCalled()`; `:73` - `expect(notifyUser).not.toHaveBeenCalled()`; guarda em `src/modules/scheduling/services/swap.ts:62` | PASS |
| C17 | `claimSwap` em rascunho rejeita `NOT_PUBLISHED`, sem reatribuir, sem fechar o pedido e sem notificar | mesmo run; caso "claimSwap em rascunho rejeita com NOT_PUBLISHED sem reatribuir nem notificar" passou | `tests/unit/draftGuards.test.ts:86` - `await expect(claimSwap({ swapRequestId: "sw1" })).rejects.toThrow("NOT_PUBLISHED")`; `:87` - `expect(tx.allocation.update).not.toHaveBeenCalled()`; `:88` - `expect(tx.swapRequest.update).not.toHaveBeenCalled()`; `:89` - `expect(notifyUser).not.toHaveBeenCalled()`; guarda em `src/modules/scheduling/services/swap.ts:153` | PASS |
| C18 | confirmar, recusar e check-in em rascunho rejeitam `NOT_PUBLISHED` sem gravar | mesmo run; os 3 casos de "resposta em rascunho" passaram (confirmar, recusar, check-in) | `tests/unit/draftGuards.test.ts:99` - `expect(confirmAllocation(...)).rejects.toThrow("NOT_PUBLISHED")`, `:100` - `expect(prisma.allocation.update).not.toHaveBeenCalled()`; `:104`-`:105` - recusar, `expect(prisma.allocation.delete).not.toHaveBeenCalled()`; `:109`-`:110` - check-in; guarda única em `src/modules/scheduling/services/respondAllocation.ts:23` | PASS |
| C19 | `notifyRemoval` pula só quem nunca soube; os três pontos de remoção usam o helper | mesmo run (4 casos `notifyRemoval` passaram); 2a prova de `checks.md` (contagem `grep -c "notifyRemoval("` sobre os 3 arquivos concatenados, igual a 3) exit 0 | `tests/unit/draftGuards.test.ts:124` - `expect(await notifyRemoval(false, { id: "al1", status: "PENDING" }, params)).toBe("skipped")`, `:125` - `expect(wasNotified).toHaveBeenCalledWith("assign:al1")`, `:126` - `expect(notifyUser).not.toHaveBeenCalled()`; `:131`-`:132` já avisado; `:136`-`:137` confirmado; `:141`-`:142` publicada sem consultar `wasNotified`; usos em `allocateVolunteer.ts:165`, `allocateGuest.ts:93`, `setSlotActive.ts:35` | PASS |

Como as provas rodaram: uma invocação do vitest sobre os 9 arquivos de prova com
`--reporter=verbose` (49 testes, 0 falhas); cada caso nomeado acima aparece individualmente como
executado e aprovado. As provas grep/`test` e `npm run typecheck` rodaram como escritas (C5, C8,
C11, C13b, C14b, C19b: exit 0). `tests/unit/draftGuards.test.ts` é novo no fix (a4f7d4c).

## Level and sampling

verified at 9d6dc96 para C16-C19; carried from 8e20029 para C1-C15 (nenhum arquivo dessas provas
mudou no fix).

- C16-C18 provam só o lado da rejeição. Nenhum teste do repo exercita `requestSwap`, `claimSwap`,
  `confirmAllocation`, `declineAllocation` ou `checkInAllocation` numa data publicada (busca por
  esses nomes em `tests/` e `scripts/` retorna só `draftGuards.test.ts` e
  `selfAllocateEligibility.test.ts`). Os claims afirmam apenas a rejeição, então não é gap de
  check; a não-regressão em data publicada foi conferida por leitura, ver abaixo.
- C19: os 4 membros de "decisão do aviso de remoção" têm asserção própria. A 2a prova é contagem
  por grep; li os três pontos e cada um passa `id` e `status` da alocação removida.
- C12 (carregado): a mensagem é provada no mapeamento, não na action. Vale agora também para
  AC 17: `claimSwapAction` usa `handleActionError` (`app/(app)/vagas/actions.ts:62`) e o botão
  mostra `MENSAGENS[res.code]` (`app/(app)/vagas/buttons.tsx:66`), lido e conferido, sem teste.
- Demais notas da rodada 1 (C9, C10, C13 contra Prisma mockado; C8, C11, C13b, C14b por grep)
  seguem valendo.

## Swept rows marked existing

verified at 9d6dc96 - `notify.ts` mudou no fix, linhas atualizadas.

| Row | Cited constraint | In the code |
| --- | --- | --- |
| failure modes | `notifyUser` nunca lança | sim - `src/modules/notifications/services/notify.ts:24` abre `try`, `:63-65` captura, loga e devolve `"failed"` |
| idempotency | `notifyUser` devolve `"duplicate"` se já enviado | sim - `src/modules/notifications/services/notify.ts:28` - `if (existing?.sentAt) return "duplicate"` |
| dependency failure | falha de push logada e engolida | sim - `src/modules/notifications/services/notify.ts:46-54` (`try`/`catch` por subscription) |
| observability | `handleActionError` loga com `ref` nas actions de `escalas` | sim - `src/lib/actionError.ts:61`, usado em `app/(app)/escalas/actions.ts:255` (carried from 8e20029, arquivos intocados) |

## Adversarial read

verified at 9d6dc96.

Fechados (gaps 1, 2 e 4 da rodada 1):

- `claimSwap`: `src/modules/scheduling/services/swap.ts:153` lança `NotPublished` dentro da
  transação, antes de `tx.allocation.update` e dos `notifyUser` de `:202` e `:219`.
- `requestSwap`: `swap.ts:62` lança antes de criar/reabrir o pedido e antes do `notifyUser` de `:90`.
- confirmar / recusar / check-in: `src/modules/scheduling/services/respondAllocation.ts:23`, na
  função `ownedAllocation` que os três usam; o `notifyUser` de `:55` (líderes) fica atrás da guarda.
- Gap 3 (remoção silenciosa): `notifyRemoval`
  (`src/modules/scheduling/services/notifyIfPublished.ts:18-27`) avisa em rascunho quem já tinha
  confirmado ou já tinha recebido `assign:<id>`. Isso manda push sobre data em rascunho a quem não
  gerencia, mas só a quem já conhecia aquela escala e só para dizer que saiu: decisão do AC 19,
  não exposição de data nova.

Conjunto de ações que aceitam id vindo do voluntário, tirado das Server Actions exportadas em
`app/` (não de `checks.md`): `selfAllocateAction`, `requestSwapAction`, `claimSwapAction`,
`cancelSwapAction`, `confirmAllocationAction`, `declineAllocationAction`,
`checkInAllocationAction`. Seis têm a guarda; `cancelSwap` (`swap.ts:107`) fica sem, e conferi
que só fecha o próprio pedido, sem `notifyUser` e sem devolver dado da ocorrência. As demais
actions que tocam ocorrência (`app/(app)/escalas/actions.ts`) passam por `requireLeaderOf` ou
`ledMinistryIds`. `availability`, `identity`, `ministries` e as páginas de perfil, solicitações,
onboarding e indisponibilidade não leem `Occurrence`/`Allocation`.

Regressão em data publicada: as três guardas têm a forma `if (!<...>.occurrence.published) throw`
e leem o escalar da própria ocorrência já incluída na consulta; com `published: true` nenhuma
delas altera o fluxo. `notifyRemoval(true, ...)` chama `notifyUser` sem consultar `wasNotified`
(`draftGuards.test.ts:141-142`). A suíte inteira segue verde.

Gap 5 da rodada 1 (`openSlots` e `loadByPerson` incluem rascunho,
`src/modules/reports/services/reports.ts:8` e `:35`): aceito como está. Os únicos chamadores são
`app/(app)/admin/page.tsx` (redireciona quem não é admin nem líder e escopa por `ledMinistryIds`)
e `getOccurrenceCandidatesAction` (atrás de `requireLeaderOf`); quem vê gerencia o ministério.

## Residual notes

verified at 9d6dc96. Nenhuma bloqueia; ordenadas por relevância.

1. `wasNotified` pode lançar (`src/modules/notifications/services/notify.ts:7-10`, sem `try`), e
   `notifyRemoval` o chama depois que a remoção já foi gravada
   (`src/modules/scheduling/services/notifyIfPublished.ts:23`). Se o banco falhar nesse ponto, a
   action devolve erro com a troca já feita e, em `reassignAllocation`, o aviso ao novo escalado
   (`allocateVolunteer.ts:175`) não sai. Só em rascunho com alocação `PENDING`. Quebra o invariante
   escrito em `allocateVolunteer.ts:83-84` ("notificacao nunca lanca").
2. Sem teste do caminho publicado para as cinco funções de S5 (ver Level and sampling): uma guarda
   que passasse a lançar sempre não seria pega por nenhum teste.
3. `confirmAllocationAction` e `declineAllocationAction`
   (`app/(app)/respondAllocationActions.ts:6-15`) não têm `try/catch`: em página obsoleta o
   `NOT_PUBLISHED` vira erro não tratado em vez da mensagem pt-BR. `checkInAllocationAction`
   (`:17-25`) devolve o código cru e `TodayCheckInCard` ignora o retorno. `RequestSwapButton`
   mostra texto genérico (`app/(app)/RequestSwapButton.tsx:18`). Mesmo padrão que `NOT_OWNER` já
   tinha; AC 16 e AC 18 não exigem mensagem.
4. `claimSwap` checa `published` (`swap.ts:153`) antes da elegibilidade (`:162` em diante): quem
   não é membro mas tem o id recebe `NOT_PUBLISHED` em vez de `NOT_ELIGIBLE`. Exige conhecer o
   UUID do pedido; irrelevante na prática.
5. Em rascunho o aviso "swap-ended" continua pulado (`allocateVolunteer.ts:153`,
   `allocateGuest.ts:81`, `setSlotActive.ts:24`); quem tinha troca aberta e foi removido recebe só
   o "Você foi removido".

Fora do código: a migração segue não aplicada (pergunta aberta 1 do plano bloqueia o go-live). O
verificador não rodou comando de banco.

## Gate

verified at 9d6dc96.

`npm run test` - 277 passed, 0 failed (51 arquivos; inclui `tests/unit/repertoireValidation.test.ts`, não rastreado, da próxima feature); `npm run typecheck` - exit 0
