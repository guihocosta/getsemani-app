# Avisos verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 6123488..c5f657b mais o commit de correção `6f0f04c` (provas executadas no HEAD `6f0f04c` da branch `feat/backlog-louveapp`)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Rodada 1 foi PASS em `4e1756f` com 6 achados não bloqueantes. Esta rodada tem escopo no diff de
`6f0f04c` (achados 1, 2 e 3 da rodada 1) e reexecuta todas as provas no HEAD. Os 12 checks estão
provados; o try/catch novo não engole `FORBIDDEN` nem `INVALID_INPUT`; o aviso é devolvido quando a
notificação falha. Restam achados não bloqueantes em `## Gaps`.

Passo 5 (percorrer o fluxo com o usuário) não se aplica: o Verifier não alcança o usuário.

## Checks

verified at 6f0f04c - todas as provas reexecutadas. Uma única invocação verbosa cobriu os três
arquivos de prova das duas features
(`npx vitest run tests/unit/announcements.test.ts tests/unit/birthday.test.ts tests/unit/skillMatrixPrivacy.test.ts --reporter=verbose`);
cada teste citado apareceu individualmente como executado e aprovado. As provas `grep`/`test` foram
executadas como escritas em `checks.md` (exit 0 cada) e `npm run typecheck` saiu com exit 0. As
linhas de `tests/unit/announcements.test.ts` abaixo de `:99` mudaram com a correção e foram
atualizadas.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `createAnnouncement` grava ministério, autor da sessão, título e texto aparados e `pinned` | vitest `createAnnouncement grava ministerio, autor, texto aparado e destaque` - passou | `tests/unit/announcements.test.ts:65` - `expect(prisma.announcement.create).toHaveBeenCalledWith({ data: { ministryId: "m1", authorId: "u1", title: "Ensaio", body: "Quinta 20h", pinned: true } })` | PASS |
| C2 | schema rejeita título vazio/81 e texto vazio/1001, aceita 80 e 1000; `INVALID_INPUT` não grava | vitest `announcementSchema rejeita fora dos limites e aceita os limites` e `INVALID_INPUT nao grava nem notifica` - passaram | `tests/unit/announcements.test.ts:53` - `expect(announcementSchema.safeParse({ title: x(81), body: "a" }).success).toBe(false)`; `:57` - `safeParse({ title: x(80), body: x(1000) }).success).toBe(true)`; `:71` - `rejects.toThrow("INVALID_INPUT")`; `:72` - `expect(prisma.announcement.create).not.toHaveBeenCalled()` | PASS |
| C3 | sob `FORBIDDEN` as três escritas rejeitam e nada é gravado nem notificado | vitest `FORBIDDEN nao grava em nenhuma escrita` - passou | `tests/unit/announcements.test.ts:137` a `:139` - `rejects.toThrow("FORBIDDEN")` nas três; `:141` a `:144` - `create`, `update`, `delete` e `notifyUser` com `.not.toHaveBeenCalled()` | PASS |
| C4 | 2 chamadas de `notifyUser` (u2, u3), tipo `ANNOUNCEMENT`, `dedupeKey` por aviso e usuário, título e `url`; enum e migração | vitest `notifica membros menos o autor, uma vez cada` - passou; grep do enum no schema e do `ADD VALUE` nas migrações - exit 0 | `tests/unit/announcements.test.ts:79` - `expect(notifyUser).toHaveBeenCalledTimes(2)`; `:84` - `dedupeKey: "announcement:an1:u2"`; `:93` - `dedupeKey: "announcement:an1:u3"`; `prisma/schema.prisma:55`; `prisma/migrations/20261002200000_announcements/migration.sql:2` | PASS |
| C5 | `setAnnouncementPinned` grava `pinned` pelo id | vitest `setAnnouncementPinned grava o destaque` - passou | `tests/unit/announcements.test.ts:126` - `expect(prisma.announcement.update).toHaveBeenCalledWith({ where: { id: "an1" }, data: { pinned: true } })` | PASS |
| C6 | `deleteAnnouncement` apaga pelo id; duas relações com `onDelete: Cascade` | vitest `deleteAnnouncement apaga pelo id` - passou; contagem de `onDelete: Cascade` no model igual a 2 - exit 0 | `tests/unit/announcements.test.ts:131` - `expect(prisma.announcement.delete).toHaveBeenCalledWith({ where: { id: "an1" } })`; `prisma/schema.prisma:340` e `prisma/schema.prisma:341` | PASS |
| C7 | `listAnnouncements` filtra ministérios, destaque primeiro, `take: 50`, com nomes de ministério e autor | vitest `listAnnouncements filtra ministerios, destaque primeiro, limite 50` - passou | `tests/unit/announcements.test.ts:165` - `toHaveBeenCalledWith(expect.objectContaining({ where: { ministryId: { in: ["m1"] } }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 50 }))`; `:172` - `toMatchObject({ id: "an1", ministry: "Louvor", author: "Ana", pinned: true })` | PASS |
| C8 | `listPinnedAnnouncements` só destaque, mais novo primeiro, `take: 3`; lista vazia não consulta | vitest `listPinnedAnnouncements traz so destaque, mais novo primeiro, limite 3` e `listPinnedAnnouncements sem ministerios nao consulta` - passaram | `tests/unit/announcements.test.ts:180` - `objectContaining({ where: { ministryId: { in: ["m1"] }, pinned: true }, orderBy: { createdAt: "desc" }, take: 3 })`; `:190` - `expect(await listPinnedAnnouncements([])).toEqual([])`; `:191` - `findMany` com `.not.toHaveBeenCalled()` | PASS |
| C9 | `/avisos` mostra "Nenhum aviso por aqui" com lista vazia | grep da frase na página - exit 0; `npm run typecheck` - exit 0 | `app/(app)/avisos/page.tsx:41` - `title="Nenhum aviso por aqui"` sob a condição de `app/(app)/avisos/page.tsx:39` (`announcements.length === 0`) | PASS |
| C10 | página inicial tem a entrada `/avisos` e o bloco "Avisos em destaque" alimentado por `listPinnedAnnouncements` | três greps na página inicial - exit 0; `npm run typecheck` - exit 0 | `app/(app)/page.tsx:99` - `href="/avisos"`; `app/(app)/page.tsx:81` - "Avisos em destaque" sob `pinned.length > 0` em `:79`; `app/(app)/page.tsx:41` - `listPinnedAnnouncements(memberIds)` | PASS |
| C11 | com `activeMemberIds` rejeitando, `createAnnouncement` resolve com o aviso gravado, `create` 1 vez, `notifyUser` nenhuma | vitest `falha ao buscar membros nao desfaz nem relanca: o aviso gravado e devolvido` - passou | `tests/unit/announcements.test.ts:107` - `expect(saved).toMatchObject({ id: "an1" })`; `:108` - `expect(prisma.announcement.create).toHaveBeenCalledTimes(1)`; `:109` - `expect(notifyUser).not.toHaveBeenCalled()` | PASS |
| C12 | para aviso do ministério `m7`, destacar e apagar chamam `requireLeaderOf("m7")` | vitest `requireLeaderOf recebe o ministerio do proprio aviso ao destacar e apagar` - passou | `tests/unit/announcements.test.ts:118` - `expect(requireLeaderOf).toHaveBeenNthCalledWith(1, "m7")`; `:119` - `expect(requireLeaderOf).toHaveBeenNthCalledWith(2, "m7")` | PASS |

Julgamento de nível e amostragem (verified at 6f0f04c):

- C11 e C12 resolvem para testes criados em `6f0f04c`; os nomes casam com os padrões `-t` e existem
  uma única vez. O valor `m7` de C12 difere do `m1` padrão do `beforeEach`, então a asserção só
  passa se o argumento vier do aviso lido.
- C11 não afirma que o erro foi registrado; o AC 11 pede "registrar o erro". A chamada existe em
  `src/modules/announcements/services/announcements.ts:35` e a saída do `logError` apareceu no
  console da execução, mas nenhuma asserção falharia se ela sumisse (achado 2).
- Demais observações da rodada 1 sobre C2, C9 e C10 seguem válidas (carried from 4e1756f).

## Swept (existing)

carried from 4e1756f, com as linhas conferidas de novo em 6f0f04c (`notify.ts` não mudou;
`actionError.ts` ganhou duas linhas em outra feature).

| Linha Swept | Restrição citada | Onde está | Confere |
| --- | --- | --- | --- |
| failure modes | `notifyUser` nunca lança | `src/modules/notifications/services/notify.ts:69` | sim |
| idempotency | `notifyUser` devolve `"duplicate"` se já enviado | `src/modules/notifications/services/notify.ts:34` | sim |
| dependency failure | falha de push é logada e engolida | `src/modules/notifications/services/notify.ts:58` | sim |
| observability | `handleActionError` loga com escopo e `ref` | `src/lib/actionError.ts:71` | sim |
| Observable: loading, error | `app/(app)/loading.tsx` e `app/(app)/error.tsx` | os dois arquivos existem | sim |
| Observable: destructive action confirms | `useConfirm` com `tone: "danger"` | `app/(app)/avisos/AnnouncementBoard.tsx:64` | sim |

## Adversarial read

Escopo da rodada 2: o diff de `6f0f04c` (verified at 6f0f04c).

- **O try/catch não engole os caminhos de rejeição**: `requireLeaderOf` está em
  `src/modules/announcements/services/announcements.ts:11` e o `throw new Error("INVALID_INPUT")` em
  `:13`, os dois antes do `announcement.create` (`:15`) e fora do bloco `try`, que só começa em `:20`.
  C3 e C2 continuam provando que nada é gravado nesses caminhos.
- **O aviso é devolvido quando a notificação falha**: o `catch` de `:34` só chama `logError`
  (`:35`), que é síncrono e não lança (`src/lib/logError.ts:11`), e o `return announcement` de `:38`
  fica fora do bloco. A action então revalida e devolve `{ ok: true }`
  (`app/(app)/avisos/actions.ts:25` a `:27`).
- **Erro de redirect**: nada dentro do `try` chama `redirect()`; `requireLeaderOf` roda antes.
- **Gate com o ministério do aviso**: `ledAnnouncement` lê o aviso e passa `announcement.ministryId`
  (`announcements.ts:42` e `:43`); agora provado por C12.
- **Título longo**: `break-all` em `app/(app)/avisos/AnnouncementBoard.tsx:132` e
  `app/(app)/page.tsx:88` impede o estouro do card. Efeito colateral no achado 1.

Carried from 4e1756f (arquivos sem alteração desde então): autorização de leitura por
`visibleMinistryIds` (`app/(app)/avisos/page.tsx:14` e `:18`, `app/(app)/page.tsx:35` e `:41`);
texto armazenado renderizado como texto React, sem `dangerouslySetInnerHTML` no diff; destinatários
deduplicados (`src/modules/identity/services/memberships.ts:10`), autor filtrado
(`announcements.ts:21`), `dedupeKey` `announcement:<id>:<userId>` (`announcements.ts:27`); schema
válido e SQL da migração idêntico ao regenerado por `prisma migrate diff` (o schema não mudou depois
de `4e1756f`); sem cor crua do Tailwind, textos em pt-BR.

## Gaps

Nenhum bloqueia o veredito. Os achados 1 (falha parcial), 2 (estouro do título) e 3 (precisão de C3)
da rodada 1 estão fechados em `6f0f04c`.

| N | Achado | Onde | Origem | Severidade |
| --- | --- | --- | --- | --- |
| 1 | `break-all` resolve o estouro, mas quebra palavra comum no meio quando o título passa de uma linha (ex.: "…às 20h n" / "o templo"), porque permite quebra entre quaisquer dois caracteres. Na página inicial `break-words` bastaria; no card de `/avisos`, que é `flex`, `[overflow-wrap:anywhere]` teria o mesmo efeito sem partir palavras normais. Constatado por leitura, sem navegador | `app/(app)/avisos/AnnouncementBoard.tsx:132`; `app/(app)/page.tsx:88` | novo em 6f0f04c | cosmético |
| 2 | C11 não afirma o registro do erro pedido pelo AC 11 ("e registrar o erro"); a chamada existe, mas sem asserção | `tests/unit/announcements.test.ts:107`; `src/modules/announcements/services/announcements.ts:35` | novo em 6f0f04c | precisão do check |
| 3 | Lacuna de nível em C7 (Observable "unauthorised"): a ligação da página com `visibleMinistryIds` continua sem prova, nem grep. Correta por leitura | `app/(app)/avisos/page.tsx:14`; `app/(app)/page.tsx:35` | carried from 4e1756f (achado 4) | precisão do check |
| 4 | Fronteira de módulo: o serviço de `announcements` lê `Ministry` e `User` por `include` do Prisma (só `name`). Deixado como está por decisão do coordenador | `src/modules/announcements/services/announcements.ts:84` | carried from 4e1756f (achado 5) | baixo |
| 5 | A busca do aviso acontece antes do gate; id que já não existe devolve a mensagem genérica `UNKNOWN`. Deixado como está por decisão do coordenador | `src/modules/announcements/services/announcements.ts:42` | carried from 4e1756f (achado 6) | baixo |

Observações não medidas da rodada 1 (formulário limpo após erro do servidor, `label` sem `htmlFor`,
push aguardado dentro da action) seguem como estavam (carried from 4e1756f).

## Gate

verified at 6f0f04c

`npx vitest run tests/unit/announcements.test.ts tests/unit/birthday.test.ts tests/unit/skillMatrixPrivacy.test.ts --reporter=verbose` - 23 passed, 0 failed (12 de `announcements.test.ts`)
`npm run test` (suíte inteira no HEAD) - 377 passed, 0 failed
`npm run typecheck` - exit 0
