# Avisos verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 6123488..c5f657b (provas executadas no HEAD `4e1756f` da branch `feat/backlog-louveapp`)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Os 10 checks estão provados com evidência localizada e a leitura adversarial do diff não achou
furo de autorização, de injeção nem de push. Há 6 achados reais, todos de robustez, UI ou precisão
dos checks; nenhum bloqueia, mas estão ranqueados em `## Gaps` para virar trabalho de correção.

Passo 5 (percorrer o fluxo com o usuário) não se aplica: o Verifier não alcança o usuário.

## Checks

Uma única invocação verbosa cobriu os dois arquivos de prova das duas features
(`npx vitest run tests/unit/announcements.test.ts tests/unit/birthday.test.ts --reporter=verbose`);
cada teste citado abaixo apareceu individualmente como executado e aprovado. As provas `grep`/`test`
foram executadas como escritas em `checks.md` (exit 0 cada) e `npm run typecheck` saiu com exit 0.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `createAnnouncement` grava ministério, autor da sessão, título e texto aparados e `pinned` | vitest `createAnnouncement grava ministerio, autor, texto aparado e destaque` - passou | `tests/unit/announcements.test.ts:65` - `expect(prisma.announcement.create).toHaveBeenCalledWith({ data: { ministryId: "m1", authorId: "u1", title: "Ensaio", body: "Quinta 20h", pinned: true } })` | PASS |
| C2 | schema rejeita título vazio/81 e texto vazio/1001, aceita 80 e 1000; `INVALID_INPUT` não grava | vitest `announcementSchema rejeita fora dos limites e aceita os limites` e `INVALID_INPUT nao grava nem notifica` - passaram | `tests/unit/announcements.test.ts:53` - `expect(announcementSchema.safeParse({ title: x(81), body: "a" }).success).toBe(false)`; `:57` - `safeParse({ title: x(80), body: x(1000) }).success).toBe(true)`; `:71` - `rejects.toThrow("INVALID_INPUT")`; `:72` - `expect(prisma.announcement.create).not.toHaveBeenCalled()` | PASS |
| C3 | sob `FORBIDDEN` as três escritas rejeitam e nada é gravado nem notificado | vitest `FORBIDDEN nao grava em nenhuma escrita` - passou | `tests/unit/announcements.test.ts:115` a `:117` - `rejects.toThrow("FORBIDDEN")` nas três; `:119` a `:122` - `create`, `update`, `delete` e `notifyUser` com `.not.toHaveBeenCalled()` | PASS |
| C4 | 2 chamadas de `notifyUser` (u2, u3), tipo `ANNOUNCEMENT`, `dedupeKey` por aviso e usuário, título e `url`; enum e migração | vitest `notifica membros menos o autor, uma vez cada` - passou; grep do enum no schema e do `ADD VALUE` nas migrações - exit 0 | `tests/unit/announcements.test.ts:79` - `expect(notifyUser).toHaveBeenCalledTimes(2)`; `:84` - `dedupeKey: "announcement:an1:u2"`; `:93` - `dedupeKey: "announcement:an1:u3"`; `prisma/schema.prisma:55`; `prisma/migrations/20261002200000_announcements/migration.sql:2` | PASS |
| C5 | `setAnnouncementPinned` grava `pinned` pelo id | vitest `setAnnouncementPinned grava o destaque` - passou | `tests/unit/announcements.test.ts:104` - `expect(prisma.announcement.update).toHaveBeenCalledWith({ where: { id: "an1" }, data: { pinned: true } })` | PASS |
| C6 | `deleteAnnouncement` apaga pelo id; duas relações com `onDelete: Cascade` | vitest `deleteAnnouncement apaga pelo id` - passou; contagem de `onDelete: Cascade` no model igual a 2 - exit 0 | `tests/unit/announcements.test.ts:109` - `expect(prisma.announcement.delete).toHaveBeenCalledWith({ where: { id: "an1" } })`; `prisma/schema.prisma:340` e `prisma/schema.prisma:341` | PASS |
| C7 | `listAnnouncements` filtra ministérios, destaque primeiro, `take: 50`, com nomes de ministério e autor | vitest `listAnnouncements filtra ministerios, destaque primeiro, limite 50` - passou | `tests/unit/announcements.test.ts:143` - `toHaveBeenCalledWith(expect.objectContaining({ where: { ministryId: { in: ["m1"] } }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 50 }))`; `:150` - `toMatchObject({ id: "an1", ministry: "Louvor", author: "Ana", pinned: true })` | PASS |
| C8 | `listPinnedAnnouncements` só destaque, mais novo primeiro, `take: 3`; lista vazia não consulta | vitest `listPinnedAnnouncements traz so destaque, mais novo primeiro, limite 3` e `listPinnedAnnouncements sem ministerios nao consulta` - passaram | `tests/unit/announcements.test.ts:158` - `objectContaining({ where: { ministryId: { in: ["m1"] }, pinned: true }, orderBy: { createdAt: "desc" }, take: 3 })`; `:168` - `expect(await listPinnedAnnouncements([])).toEqual([])`; `:169` - `findMany` com `.not.toHaveBeenCalled()` | PASS |
| C9 | `/avisos` mostra "Nenhum aviso por aqui" com lista vazia | grep da frase na página - exit 0; `npm run typecheck` - exit 0 | `app/(app)/avisos/page.tsx:41` - `title="Nenhum aviso por aqui"` sob a condição de `app/(app)/avisos/page.tsx:39` (`announcements.length === 0`) | PASS |
| C10 | página inicial tem a entrada `/avisos` e o bloco "Avisos em destaque" alimentado por `listPinnedAnnouncements` | três greps na página inicial - exit 0; `npm run typecheck` - exit 0 | `app/(app)/page.tsx:99` - `href="/avisos"`; `app/(app)/page.tsx:81` - "Avisos em destaque" sob `pinned.length > 0` em `:79`; `app/(app)/page.tsx:41` - `listPinnedAnnouncements(memberIds)` | PASS |

Julgamento de nível e amostragem:

- Cada nome de teste casa com o padrão `-t` do check e existe uma única vez no arquivo, criado
  nesta feature (`tests/unit/announcements.test.ts` é arquivo novo no diff). Nenhuma prova resolve
  para teste pré-existente.
- C2: o caso "título vazio" é exercitado com `"  "` (só espaços), que é mais forte que `""`; os
  limites 80 e 1000 são aceitos numa única asserção conjunta. Os 6 membros da linha de Coverage têm
  asserção.
- C9 e C10 são grep + typecheck, como declarado em `checks.md` (o repo não tem teste de componente).
  A condição de exibição foi conferida por leitura nas linhas citadas.
- Lacuna de precisão em C3 e lacuna de nível em C7: ver achados 3 e 4.

## Swept (existing)

| Linha Swept | Restrição citada | Onde está | Confere |
| --- | --- | --- | --- |
| failure modes | `notifyUser` nunca lança | `src/modules/notifications/services/notify.ts:69` (catch externo devolve `"failed"`) | sim, com a ressalva do achado 1 |
| idempotency | `notifyUser` devolve `"duplicate"` se já enviado | `src/modules/notifications/services/notify.ts:34` | sim |
| dependency failure | falha de push é logada e engolida | `src/modules/notifications/services/notify.ts:58` | sim |
| observability | `handleActionError` loga com escopo e `ref` | `src/lib/actionError.ts:69` | sim |
| Observable: loading, error | `app/(app)/loading.tsx` e `app/(app)/error.tsx` | os dois arquivos existem | sim |
| Observable: destructive action confirms | `useConfirm` com `tone: "danger"` | `app/(app)/avisos/AnnouncementBoard.tsx:64` | sim |

## Adversarial read

- **Autorização (a)**: `createAnnouncementAction` chega em `requireLeaderOf(params.ministryId)` antes
  de qualquer escrita (`src/modules/announcements/services/announcements.ts:10`). Destacar e apagar
  resolvem o ministério pelo próprio aviso, não por parâmetro do chamador
  (`announcements.ts:36` e `:37`), então líder do ministério A não alcança aviso do ministério B, e
  não-líder recebe `FORBIDDEN`. Entradas malformadas na action (`ministryId` indefinido ou objeto,
  `pinned` não booleano, chaves extras) morrem no zod ou na validação do Prisma; `parsed.data`
  descarta chaves desconhecidas antes do `create` (`announcements.ts:15`). A leitura usa
  `visibleMinistryIds` (membership `ACTIVE`, admin vê todos) na página (`app/(app)/avisos/page.tsx:14`
  e `:18`) e na página inicial (`app/(app)/page.tsx:35` e `:41`); membro `PENDING` não lê.
- **Texto armazenado (b)**: título e corpo são renderizados como texto React
  (`AnnouncementBoard.tsx:133` e `:164`, `app/(app)/page.tsx:88` e `:89`); não há
  `dangerouslySetInnerHTML` no diff (o único do repo é o script de tema em `app/layout.tsx:43`).
  O corpo tem `whitespace-pre-line break-words`; o título não (achado 2).
- **Push (c)**: `activeMemberIds` deduplica por `Set` (`src/modules/identity/services/memberships.ts:10`),
  o autor é filtrado (`announcements.ts:18`), `dedupeKey` é `announcement:<id>:<userId>`
  (`announcements.ts:24`) e `notifyUser` não lança. Falha de push não desfaz o aviso. Ressalva no
  achado 1.
- **Schema e migração (g)**: `npx prisma validate` - schema válido. O SQL regenerado sem banco por
  `prisma migrate diff --from-schema-datamodel <schema de c5f657b^> --to-schema-datamodel <schema de c5f657b> --script`
  é idêntico byte a byte a `prisma/migrations/20261002200000_announcements/migration.sql`.
- **Convenções**: nenhuma cor crua do Tailwind no diff; textos em pt-BR; actions devolvem
  `{ ok, code, ref }` via `handleActionError`, que relança redirect.

## Gaps

Nenhum bloqueia o veredito. Ordenados por impacto.

| N | Achado | Onde | Severidade |
| --- | --- | --- | --- |
| 1 | Falha parcial reportada como falha total: se `activeMemberIds` lançar depois do `announcement.create`, o serviço rejeita, a action devolve `UNKNOWN` sem `revalidate`, e o líder vê "Tente de novo" com o aviso já gravado e ninguém notificado; a nova tentativa duplica o aviso. O Swept só cobre falha dentro de `notifyUser` | `src/modules/announcements/services/announcements.ts:18` (leitura sem proteção depois da escrita em `:14`); `app/(app)/avisos/actions.ts:25` | menor |
| 2 | Título longo sem espaço (até 80 caracteres, ex.: um link) estoura o card: o `p` do título é `flex` sem `break-words`, e o bloco da página inicial também não quebra nem trunca. O corpo está protegido | `app/(app)/avisos/AnnouncementBoard.tsx:132`; `app/(app)/page.tsx:88` | cosmético |
| 3 | Lacuna de precisão em C3: o teste troca `requireLeaderOf` inteiro por mock e não afirma com qual ministério ele foi chamado. "Líder de A não mexe em aviso de B" está certo por leitura, mas nenhuma asserção falharia se o gate passasse a receber outro ministério | `tests/unit/announcements.test.ts:116`; código correto em `src/modules/announcements/services/announcements.ts:37` | precisão do check |
| 4 | Lacuna de nível em C7 (Observable "unauthorised"): a restrição "só os ministérios do usuário" vive na página, que passa `visibleMinistryIds` ao serviço; nenhuma prova, nem grep, cobre essa ligação. Correta por leitura | `app/(app)/avisos/page.tsx:14`; `app/(app)/page.tsx:35` | precisão do check |
| 5 | Fronteira de módulo: o serviço de `announcements` lê `Ministry` e `User` por `include` do Prisma em vez de função de serviço (regra do `CLAUDE.md`; mesmo padrão da lição candidata L-006). O padrão é generalizado no código pré-existente de `scheduling`, por isso não bloqueia | `src/modules/announcements/services/announcements.ts:78` | baixo |
| 6 | A busca do aviso acontece antes do gate: id inexistente devolve `UNKNOWN` e id existente devolve `FORBIDDEN`, e apagar um aviso que outro líder já apagou mostra a mensagem genérica de erro. Ids são UUID, então o oráculo é irrelevante; fica o texto pouco claro | `src/modules/announcements/services/announcements.ts:36` | baixo |

Observações não medidas (leitura, sem execução em navegador):

- O formulário usa `action={submit}` com campos não controlados (`AnnouncementBoard.tsx:80`); pelo
  comportamento do React 19 os campos são limpos ao fim da action mesmo quando o servidor devolve
  erro, então um título só com espaços (aceito pelo `required` do navegador) faz o líder perder a
  mensagem digitada. É o mesmo padrão de `SongList.tsx` e `UnavailabilityForm.tsx`.
- Os `label` do formulário não têm `htmlFor` nem envolvem o campo (`AnnouncementBoard.tsx:96`).
- O push é aguardado dentro da Server Action com `Promise.all` sobre todos os membros
  (`announcements.ts:19`); o tempo de resposta do "Publicar" cresce com o tamanho do ministério.

## Gate

`npx vitest run tests/unit/announcements.test.ts tests/unit/birthday.test.ts --reporter=verbose` - 20 passed, 0 failed (10 de `announcements.test.ts`)
`npm run test` (suíte inteira no HEAD) - 365 passed, 0 failed
`npm run typecheck` - exit 0
