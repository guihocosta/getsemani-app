# Rascunho e publicação de escala verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: e22a947..8e20029
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Os 15 checks estão provados em `HEAD` (8e20029) com evidência localizada. O veredito é FAIL por
um vazamento fora do conjunto de checks, achado na leitura adversarial do diff: o fluxo de troca
(`swap.ts`) não conhece `published`, então quem não gerencia o ministério ainda consegue entrar
numa data em rascunho e disparar notificação sobre ela. Detalhe em `## Gaps`.

Passo 5 (percorrer o fluxo com o usuário): não executado - o verificador não alcança o usuário.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | tornar rascunho grava `published: false` e não notifica | `npm run test -- tests/unit/publishOccurrence.test.ts ...` exit 0; caso "tornar rascunho nao notifica" rodou e passou | `tests/unit/publishOccurrence.test.ts:36` - `expect(prisma.occurrence.update).toHaveBeenCalledWith({ where: { id: "o1" }, data: { published: false } })`; `:37` - `expect(notifyUser).not.toHaveBeenCalled()` | PASS |
| C2 | publicar grava `published: true` e notifica 2x com `ASSIGNMENT` e `assign:al1` / `assign:al2` | mesmo run; caso "publicar notifica cada alocado com conta" passou | `tests/unit/publishOccurrence.test.ts:50` - `expect(notifyUser).toHaveBeenCalledTimes(2)`; `:52` - `expect.objectContaining({ userId: "u1", type: "ASSIGNMENT", dedupeKey: "assign:al1" })`; `:55` idem `assign:al2`; `:49` update com `data: { published: true }` | PASS |
| C3 | convidado (`userId: null`) não gera `notifyUser` ao publicar | mesmo run; caso "convidado nao e notificado ao publicar" passou | `tests/unit/publishOccurrence.test.ts:65` - `expect(notifyUser).not.toHaveBeenCalled()` | PASS |
| C4 | `FORBIDDEN` rejeita sem `occurrence.update` | mesmo run; caso "FORBIDDEN nao grava" passou | `tests/unit/publishOccurrence.test.ts:74` - `rejects.toThrow("FORBIDDEN")`; `:75` - `expect(prisma.occurrence.update).not.toHaveBeenCalled()` | PASS |
| C5 | schema e migração declaram `published` com default `true` | `grep -Eq "published +Boolean +@default\(true\)" prisma/schema.prisma && grep -rq 'ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true' prisma/migrations` exit 0 | `prisma/schema.prisma:170` - `published Boolean @default(true)`; `prisma/migrations/20261002180000_occurrence_published/migration.sql:2` - `ALTER TABLE "Occurrence" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;` | PASS |
| C6 | `notifyIfPublished(false)` devolve `"skipped"` sem notificar; `(true)` repassa os mesmos params | `npm run test -- tests/unit/notifyIfPublished.test.ts ...` exit 0; 2 casos rodaram e passaram | `tests/unit/notifyIfPublished.test.ts:20` - `expect(await notifyIfPublished(false, params)).toBe("skipped")`; `:21` - `expect(notifyUser).not.toHaveBeenCalled()`; `:26` - `expect(notifyUser).toHaveBeenCalledWith(params)` | PASS |
| C7 | `allocateVolunteer` em rascunho cria `PENDING` sem notificar; publicada notifica com `assign:al1` | `npm run test -- tests/unit/allocateDraft.test.ts ...` exit 0; 2 casos `allocateVolunteer` passaram | `tests/unit/allocateDraft.test.ts:44` - `data: expect.objectContaining({ slotId: "s1", userId: "u1", status: "PENDING" })`; `:46` - `expect(notifyUser).not.toHaveBeenCalled()`; `:54` - `dedupeKey: "assign:al1"` | PASS |
| C8 | os cinco serviços não chamam `notifyUser(` direto | `! grep -l "notifyUser(" <5 arquivos>` exit 0 (nenhum arquivo listado) | `src/modules/scheduling/services/allocateVolunteer.ts:85` , `allocateGuest.ts:80`, `linkGuestAllocation.ts:58`, `repeatSchedule.ts:155`, `setSlotActive.ts:24` - todas `notifyIfPublished(...)`; busca `notifyUser\(` em `src/` e `app/` não retorna nenhum dos cinco | PASS |
| C9 | `listMonthOccurrences` consulta com `OR` publicada/gerenciável e item carrega `published` | `npm run test -- tests/unit/listMonthOccurrences.test.ts ...` exit 0; caso "rascunho so para gerenciaveis e item carrega published" passou | `tests/unit/listMonthOccurrences.test.ts:31` - `OR: [{ published: true }, { schedule: { ministryId: { in: ["m1"] } } }]`; `:35` - `expect(items.map((i) => [i.occurrenceId, i.published])).toEqual([["o1", true], ["o2", false]])` | PASS |
| C10 | `getMySchedule` filtra `published: true` | `npm run test -- tests/unit/getMySchedule.test.ts ...` exit 0; caso "so ocorrencia publicada entra na agenda do voluntario" passou | `tests/unit/getMySchedule.test.ts:19` - `slot: { occurrence: { status: "ACTIVE", published: true, date: { gte: from } } }` | PASS |
| C11 | as duas consultas de `/vagas` filtram `published: true` | `test "$(grep -c "published: true" "app/(app)/vagas/page.tsx")" -eq 2` exit 0 | `app/(app)/vagas/page.tsx:36` (dentro de `prisma.slot.findMany`, vagas livres) e `app/(app)/vagas/page.tsx:56` (dentro de `prisma.swapRequest.findMany`, trocas abertas) - `published: true` | PASS |
| C12 | `selfAllocate` em rascunho rejeita `NOT_PUBLISHED` sem criar; `toActionCode` e `MENSAGENS` corretos | `npm run test -- tests/unit/allocateDraft.test.ts tests/unit/actionError.test.ts ...` exit 0; casos "selfAllocate em rascunho rejeita com NOT_PUBLISHED sem gravar" e "NOT_PUBLISHED avisa que a escala ainda nao foi publicada" passaram | `tests/unit/allocateDraft.test.ts:65` - `rejects.toThrow("NOT_PUBLISHED")`; `:66` - `expect(prisma.allocation.create).not.toHaveBeenCalled()`; `tests/unit/actionError.test.ts:51` - `expect(toActionCode(new Error("NOT_PUBLISHED"))).toBe("NOT_PUBLISHED")`; `:52` - `expect(MENSAGENS.NOT_PUBLISHED).toBe("Essa escala ainda não foi publicada.")` | PASS |
| C13 | `attendanceRows` e cron `reminders` filtram `published: true` | `npm run test -- tests/unit/attendanceReport.test.ts ...` exit 0 (2 casos `attendanceRows` passaram); `grep -q "published: true" app/api/cron/reminders/route.ts` exit 0 | `tests/unit/attendanceReport.test.ts:32` - `published: true` dentro do `where` exato; `:53` idem sem ministérios; `app/api/cron/reminders/route.ts:26` - `slot: { occurrence: { status: "ACTIVE", published: true, date: { gte: now, lte: until } } }` | PASS |
| C14 | `publishMenuItem` devolve rótulo e alvo opostos; `OccurrenceRow` mostra selo e usa o helper | `npm run test -- tests/unit/publishMenuItem.test.ts ...` exit 0 (caso "publishMenuItem oferece a acao oposta ao estado atual" passou); `grep -q "rascunho" ... && grep -q "publishMenuItem(" ... && npm run typecheck` exit 0 | `tests/unit/publishMenuItem.test.ts:6` - `expect(publishMenuItem(false)).toMatchObject({ label: "Publicar", target: true })`; `:7` - `toMatchObject({ label: "Tornar rascunho", target: false })`; `app/(app)/escalas/OccurrenceRow.tsx:260` - `publishMenuItem(props.published)`; `app/(app)/escalas/OccurrenceRow.tsx:353` - selo `rascunho` | PASS |
| C15 | confirmação só ao tornar rascunho, com o texto exato | mesmo run; caso "confirmacao so ao tornar rascunho" passou | `tests/unit/publishMenuItem.test.ts:11` - `expect(publishMenuItem(true).confirm).toBe("Voluntários deixam de ver esta data até você publicar de novo.")`; `:12` - `expect(publishMenuItem(false).confirm).toBeNull()` | PASS |

Como as provas rodaram: uma única invocação do vitest sobre os 8 arquivos de prova com
`--reporter=verbose` (8 arquivos, 40 testes, 0 falhas), em vez de uma por `-t`; cada caso nomeado
acima aparece individualmente no output como executado e aprovado. As provas grep/`test` e
`npm run typecheck` rodaram exatamente como escritas. Todos os arquivos de teste citados estão no
diff da feature (novos ou alterados), nenhum resolve só para teste intocado.

## Level and sampling

- C9, C10, C13 provam a forma do `where` contra Prisma mockado, não o resultado contra banco. É o
  que o claim afirma ("consulta com ..."), então não é gap de nível; fica registrado que nenhum
  teste exercita o filtro num Postgres real (`npm run test:local` não cobre `published`).
- C8, C11, 2a prova de C13 e de C14 são grep, declarado em `checks.md`. Li o código por trás de cada
  um: os dois `published: true` de `/vagas` estão um em cada consulta (linhas 36 e 56), não os dois
  na mesma.
- C12: a parte "a action SHALL mostrar" do AC 12 é provada no mapeamento (`toActionCode` +
  `MENSAGENS`), não em `selfAllocateAction`. A action usa `handleActionError`
  (`app/(app)/vagas/actions.ts:23`), lido e conferido; sem teste nesse nível.
- C14: a oferta do rótulo pelo menu e o selo são provados por grep + typecheck, sem teste de
  renderização. Li `OccurrenceRow.tsx:349-355` e `:365-366`: selo condicionado a `!props.published`
  e `publishLabel={publishItem.label}`.
- Amostragem: nenhum check afirma mais casos do que exercita.

## Swept rows marked existing

| Row | Cited constraint | In the code |
| --- | --- | --- |
| failure modes | `notifyUser` nunca lança | sim - `src/modules/notifications/services/notify.ts:18` abre `try`, `:57-59` captura, loga e devolve `"failed"` |
| idempotency | `notifyUser` devolve `"duplicate"` se já enviado | sim - `src/modules/notifications/services/notify.ts:22` - `if (existing?.sentAt) return "duplicate"` |
| dependency failure | falha de push logada e engolida | sim - `src/modules/notifications/services/notify.ts:40-48` (`try`/`catch` por subscription com `console.error`) |
| observability | `handleActionError` loga com `ref` nas actions de `escalas` | sim - `src/lib/actionError.ts:61` (`const ref = logError(scope, e, ctx)`), usado em `app/(app)/escalas/actions.ts:255` |

Linhas `existing` do `Observable` do plano, também conferidas: `pending` desabilita o menu
(`app/(app)/escalas/OccurrenceRow.tsx:371` - `disabled={pending}`); erro mostra `MENSAGENS[res.code]`
(`OccurrenceRow.tsx`, `togglePublish`).

## Gaps

Ranqueados. O primeiro sozinho decide o veredito.

1. **Vazamento: troca em data em rascunho (auto-alocação + notificação para quem não gerencia).**
   `claimSwap` (`src/modules/scheduling/services/swap.ts:122`) só checa `status !== "ACTIVE"` e data
   (`swap.ts:150`); não lê `published`. Um voluntário com um `swapRequestId` aberto antes de a data
   virar rascunho (página `/vagas` já carregada, ou chamada direta da Server Action
   `claimSwapAction`, `app/(app)/vagas/actions.ts:53`) assume a vaga: a `Allocation` é reatribuída a
   ele como `CONFIRMED` numa ocorrência em rascunho, e saem pushes `notifyUser` direto
   (`swap.ts:197` para quem pediu a troca, `swap.ts:214` para os líderes). É o mesmo cenário de
   página obsoleta que o AC 12 fechou para `selfAllocate` com `NOT_PUBLISHED`; o caminho irmão ficou
   aberto. O plano põe "troca em data em rascunho" fora de escopo por ser "inalcançável", premissa
   que o código não sustenta: tornar rascunho não fecha `SwapRequest` aberto e a action aceita o id.
   Pré-condição: precisa existir troca `OPEN` na data antes do rascunho.
2. **Vazamento: pedido de troca notifica o ministério inteiro sobre data em rascunho.**
   `requestSwap` (`src/modules/scheduling/services/swap.ts:38`) também só checa `status`/data
   (`swap.ts:60`) e chama `notifyUser` direto para todo membro ativo (`swap.ts:87`) com função e
   data da ocorrência. Um voluntário alocado antes do rascunho, com a home já aberta
   (`app/(app)/RequestSwapButton.tsx:17`), dispara "Vaga disponível para troca" para todos os
   voluntários sobre uma data que eles não deveriam ver. O conjunto "serviços que notificam em
   `scheduling` (5)" de `checks.md` está subcontado: `swap.ts` e `respondAllocation.ts`
   (`respondAllocation.ts:52`, só para líderes) também notificam e não passam por
   `notifyIfPublished`.
3. **Remoção silenciosa perdida (não é vazamento; defeito de produto).** Em rascunho,
   `reassignAllocation` e `setSlotActive` pulam o aviso "Você foi removido"
   (`src/modules/scheduling/services/allocateVolunteer.ts:164`,
   `src/modules/scheduling/services/setSlotActive.ts:35`), e `setOccurrencePublished`
   (`src/modules/scheduling/services/publishOccurrence.ts:22-37`) só avisa quem está alocado na hora.
   Quem recebeu "Você foi escalado" com a data publicada e foi trocado durante o rascunho nunca é
   avisado de que saiu. Nenhum AC cobre; o plano só exclui o aviso de "voltar para rascunho".
4. **Confirmar/recusar/check-in em rascunho por id** (`respondAllocation.ts:25`, `:38`, `:68`) não
   checam `published`. Alcançável só por página obsoleta, efeito restrito à própria alocação e
   aviso só a líderes; baixo impacto, registrado por completude.
5. **Relatórios do líder divergem entre si (não é vazamento).** `attendanceRows` exclui rascunho,
   mas `openSlots` (`src/modules/reports/services/reports.ts:8`) e `loadByPerson` (`reports.ts:35`)
   incluem. Só líder/admin enxergam (`app/(app)/admin/page.tsx` redireciona os demais e escopa por
   `ledMinistryIds`), então é consistência, não exposição.

Leituras conferidas e sem vazamento: `listMonthOccurrences` (4 chamadas passam `ledMinistryIds`:
`app/(app)/escalas/page.tsx:58-60`, `app/(app)/escalas/actions.ts:240`), `getMySchedule` (home),
`/vagas` (2 consultas), cron `reminders`, `selfAllocate`, `listGuestAllocations` e as actions de
`escalas` (todas atrás de `requireLeaderOf`/`ledMinistryIds`), `materializeOccurrences` (cria com o
default publicado), `updateSchedule` e `deleteSchedule` (não tocam `published`).

Fora do código: a migração não foi aplicada (decisão do plano, pergunta aberta 1 bloqueia o
go-live). O verificador não rodou nenhum comando de banco.

## Gate

`npm run test` - 257 passed, 0 failed (49 arquivos) em 8e20029; `npm run typecheck` - exit 0
