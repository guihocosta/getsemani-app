# Aniversariantes verification

**Verdict**: PASS
**Profile**: light
**Diff range**: e2b2015..4e1756f mais o commit de correção `151dee8` (provas executadas no HEAD `6f0f04c` da branch `feat/backlog-louveapp`)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Rodada 1 reprovou em `4e1756f`: a linha `User` inteira (com `birthDate`) chegava ao navegador de
líderes e admins por `/admin/ministerios`. A correção `151dee8` fecha esse caminho, e a enumeração
refeita a partir do schema não achou nenhum outro: toda consulta que carrega `User` de outra pessoa
ou seleciona campos, ou repassa só campos escolhidos. Os 10 checks estão provados. Restam achados
não bloqueantes em `## Gaps`.

Passo 5 (percorrer o fluxo com o usuário) não se aplica: o Verifier não alcança o usuário.

## Checks

verified at 6f0f04c - todas as provas reexecutadas. Uma única invocação verbosa cobriu os três
arquivos de prova das duas features
(`npx vitest run tests/unit/announcements.test.ts tests/unit/birthday.test.ts tests/unit/skillMatrixPrivacy.test.ts --reporter=verbose`);
cada teste citado apareceu individualmente como executado e aprovado. As provas `grep` foram
executadas como escritas em `checks.md` (exit 0 cada) e `npm run typecheck` saiu com exit 0.
`tests/unit/birthday.test.ts` não mudou desde `4e1756f`, então as linhas de C1 a C9 são as mesmas.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `updateProfile` grava `birthDate` como `1990-03-14T00:00:00.000Z`; schema `@db.Date`; migração `ADD COLUMN "birthDate" DATE` | vitest `updateProfile grava a data como dia de calendario em UTC` - passou; grep do schema e da migração - exit 0 | `tests/unit/birthday.test.ts:46` - `expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { name: "Ana", phone: null, birthDate: new Date("1990-03-14T00:00:00.000Z") } })`; `prisma/schema.prisma:63`; `prisma/migrations/20261002210000_user_birth_date/migration.sql:2` | PASS |
| C2 | `""` grava `null`; ausente não inclui a chave | vitest `vazio limpa e ausente nao altera a data` - passou | `tests/unit/birthday.test.ts:54` - `toHaveBeenLastCalledWith({ where: { id: "u1" }, data: { name: "Ana", phone: null, birthDate: null } })`; `:60` - `toHaveBeenLastCalledWith({ where: { id: "u1" }, data: { name: "Ana", phone: null } })` | PASS |
| C3 | `parseBirthDate` rejeita 30/02, texto, antes de 1900 e amanhã; aceita 1900-01-01 e hoje; data inválida não grava; `ProfileForm` mostra a mensagem | vitest `parseBirthDate rejeita dia inexistente, texto, antes de 1900 e futuro`, `parseBirthDate aceita as bordas 1900-01-01 e hoje` e `data invalida nao grava` - passaram; grep da mensagem - exit 0 | `tests/unit/birthday.test.ts:31` a `:34` - `expect(() => parseBirthDate("1990-02-30", HOJE)).toThrow("INVALID_BIRTH_DATE")` e os outros três; `:38` e `:39` - `toISOString()).toBe("1900-01-01T00:00:00.000Z")` e hoje; `:69` - `expect(prisma.user.update).not.toHaveBeenCalled()`; `app/(app)/perfil/ProfileForm.tsx:9` | PASS |
| C4 | `birthdaysOfMonth` filtra março, ordena por dia e nome, devolve só `userId`, `name`, `day` | vitest `birthdaysOfMonth filtra o mes, ordena por dia e nome e nao expoe o ano` - passou | `tests/unit/birthday.test.ts:85` - `expect(lista).toEqual([{ userId: "c", name: "Caio", day: 2 }, { userId: "a", name: "Ana", day: 14 }, { userId: "b", name: "Bia", day: 14 }])` | PASS |
| C5 | `listBirthdays` consulta só quem tem data e é membro `ACTIVE` dos ministérios; lista vazia não consulta | vitest `listBirthdays consulta so quem tem data e e membro ativo dos ministerios` e `listBirthdays sem ministerios nao consulta` - passaram | `tests/unit/birthday.test.ts:101` - `objectContaining({ where: { birthDate: { not: null }, memberships: { some: { status: "ACTIVE", ministryId: { in: ["m1"] } } } } })`; `:113` - `expect(await listBirthdays(3, [])).toEqual([])`; `:114` - `findMany` com `.not.toHaveBeenCalled()` | PASS |
| C6 | `parseMonthNumber` aceita 3 e 12; ausente, 0, 13, 3.5 e texto caem no fallback | vitest `parseMonthNumber aceita 1..12 e cai no fallback no resto` - passou | `tests/unit/birthday.test.ts:120` - `expect(parseMonthNumber("3", 10)).toBe(3)`; `:121` - `("12", 10)).toBe(12)`; `:122` a `:124` - laço sobre `[undefined, "0", "13", "3.5", "abc"]` com `.toBe(10)` | PASS |
| C7 | `/aniversariantes` mostra "Nenhum aniversariante neste mês" com lista vazia | grep da frase na página - exit 0; `npm run typecheck` - exit 0 | `app/(app)/aniversariantes/page.tsx:68` - `title="Nenhum aniversariante neste mês"` sob a condição de `app/(app)/aniversariantes/page.tsx:66` (`people.length === 0`) | PASS |
| C8 | `isBirthdayToday` só com mesmo dia e mês; a página usa a função para a marca "hoje" | vitest `isBirthdayToday so com mesmo dia e mes` - passou; grep na página - exit 0 | `tests/unit/birthday.test.ts:130` - `expect(isBirthdayToday(14, 3, "2026-03-14")).toBe(true)`; `:131` e `:132` - `.toBe(false)`; `app/(app)/aniversariantes/page.tsx:78` | PASS |
| C9 | página inicial tem a entrada `/aniversariantes` alimentada por `listBirthdays` | dois greps na página inicial - exit 0; `npm run typecheck` - exit 0 | `app/(app)/page.tsx:104` - `href="/aniversariantes"`; `app/(app)/page.tsx:42` - `listBirthdays(todayMonth, memberIds)` | PASS |
| C10 | `listMinistrySkillMatrix` consulta com `include: { user: { select: { id: true, name: true } } }` e cada `user` devolvido tem só `id` e `name`; nenhuma outra consulta manda a linha inteira a client component | vitest `listMinistrySkillMatrix pede e devolve so id e nome da pessoa` - passou; grep negativo de `user: true` em `userSkills.ts` - exit 0 | `tests/unit/skillMatrixPrivacy.test.ts:23` - `expect(prisma.membership.findMany).toHaveBeenCalledWith(expect.objectContaining({ include: { user: { select: { id: true, name: true } } } }))`; `:27` - `expect(Object.keys(matrix[0].user).sort()).toEqual(["id", "name"])`; código em `src/modules/ministries/services/userSkills.ts:94`; segunda metade do claim sustentada pela enumeração de `## User row enumeration` | PASS |

Julgamento de nível e amostragem (verified at 6f0f04c):

- C10 resolve para um teste criado em `151dee8`; o nome casa com o padrão `-t` e existe uma única
  vez. A asserção de `:27` olha as chaves do objeto devolvido, mas o `user` vem do mock, então quem
  de fato protege contra a regressão é a asserção do `include` em `:23`. Basta para o AC 10.
- A segunda metade do claim de C10 ("nenhuma outra consulta do repo…") não tem prova própria: o grep
  olha só `userSkills.ts` (achado 1). A afirmação é verdadeira hoje, conferida consulta a consulta
  abaixo.
- Observações da rodada 1 sobre C2, C3, C7, C8 e C9 seguem válidas (carried from 4e1756f).

## User row enumeration

verified at 6f0f04c. Feita a partir da autoridade, não da correção: o schema declara 9 relações do
tipo `User` em 8 modelos (`Membership.user` `prisma/schema.prisma:103`, `UserSkill.user` `:131`,
`Allocation.user` `:213`, `SwapRequest.requester` `:230` e `.claimer` `:231`, `Unavailability.user`
`:245`, `PushSubscription.user` `:258`, `Notification.user` `:272`, `Announcement.author` `:341`).
Busquei em `src/` e `app/` todo acesso direto a `prisma.user.*` e todo `include`/`select` dessas
chaves (`user`, `requester`, `claimer`, `author`), inclusive via constante (`withNames`). Não há
`$queryRaw`, nem acesso a tabela pelo cliente Supabase, nem rota de API que devolva pessoa.
`requester` e `claimer` não são carregados em lugar nenhum.

| Consulta | O que carrega | Para onde vai | Linha inteira sai do servidor |
| --- | --- | --- | --- |
| `src/modules/ministries/services/userSkills.ts:94` | `user` com `select` de `id` e `name` | prop de `MinistryCard` (client) em `app/(app)/admin/ministerios/page.tsx:44` | não - corrigido em 151dee8 |
| `src/modules/identity/services/birthdays.ts:8` | `select` de `id`, `name`, `birthDate` | mapeado para `userId`, `name`, `day` em `src/modules/identity/domain/birthday.ts:26` | não |
| `src/modules/identity/services/listUsers.ts:8` | linha inteira de todos (só admin) | Server Component; aos client components vão só `userId` e `isAdmin` (`app/(app)/admin/pessoas/page.tsx:34`) e campos da membership (`:42` a `:47`) | não |
| `src/modules/identity/services/reviewMembership.ts:24` e `:58` | `user: true` | não usa a linha; push só com nome do ministério (`:45`, `:83`); a action descarta o retorno (`app/(app)/solicitacoes/actions.ts:19` e `:31`) | não |
| `src/modules/identity/services/setAdmin.ts:8` | linha inteira (retorno do `update`) | a action descarta (`app/(app)/admin/pessoas/actions.ts:8`) | não |
| `src/modules/identity/services/authz.ts:57` | linha inteira de outro usuário | só lê `isAdmin`, devolve booleano | não |
| `src/modules/scheduling/services/listMonthOccurrences.ts:58` | `allocation.user: true` | mapeado para `allocatedName` (`:79`) | não |
| `src/modules/scheduling/services/swap.ts:44` | `user: true` | só o nome no corpo do push (`:95`); a action devolve `{ ok: true }` (`app/(app)/vagas/actions.ts:34`) | não |
| `src/modules/scheduling/services/swap.ts:144` | `allocation.user: true` | só `originalUserName` (`:191`), usado no push; a action devolve `{ ok: true }` (`app/(app)/vagas/actions.ts:60`) | não |
| `app/(app)/escalas/actions.ts:295` | `user: true` | `buildCandidateList` copia só `userId` e `name` (`src/modules/scheduling/domain/candidateList.ts:38` e `:39`) antes do retorno da action (`app/(app)/escalas/actions.ts:326`) | não |
| `app/(app)/solicitacoes/page.tsx:28` | `user: true` | Server Component renderiza `m.user.name`; `ReviewButtons` recebe só `membershipId` | não |
| `src/modules/reports/services/reports.ts:50` e `:75` | `select` de `id` e `name`; `select` de `name` | nomes | não |
| `src/modules/identity/services/requestMembership.ts:47` | `select` de `id` | ids de destinatários do push | não |
| `src/modules/announcements/services/announcements.ts:84` | `author` com `select` de `name` | nome do autor | não |

As leituras do próprio usuário da sessão (`authz.ts:31`, `ensureProfile.ts:31` e `:40`,
`updateProfile.ts:21`) não entram: a data é dele, e `/perfil` a envia só ao próprio formulário
(`app/(app)/perfil/page.tsx:49`).

`MinistryCard` e filhos: o tipo local já era `{ id, name }` (`app/(app)/admin/ministerios/MinistryCard.tsx:13`),
o componente usa só `entry.user.id` e `entry.user.name` (`:114` e `:115`) e repassa escalares a
`MemberSkillsRow`. `npm run typecheck` exit 0. Nenhum outro uso de e-mail, telefone ou data a partir
desse objeto existe em `app/` ou `src/`.

## Swept (existing)

carried from 4e1756f (arquivos citados sem alteração desde então).

| Linha Swept | Restrição citada | Onde está | Confere |
| --- | --- | --- | --- |
| failure modes | `app/(app)/error.tsx` cobre falha de leitura | o arquivo existe | sim |
| failure modes | `ProfileForm` mostra "Erro ao salvar" para erro não mapeado | `app/(app)/perfil/ProfileForm.tsx:10` e `:26`; `app/(app)/perfil/actions.ts:29` | sim |
| authorization | `updateProfile` só altera o usuário da sessão | `src/modules/identity/services/updateProfile.ts:9` e `:22` | sim |
| Observable: loading, error | `app/(app)/loading.tsx` e `app/(app)/error.tsx` | os dois arquivos existem | sim |

A linha "data lifecycle: C4 - o ano não sai do servidor", contradita na rodada 1, agora confere
(verified at 6f0f04c, pela enumeração acima).

## Adversarial read

carried from 4e1756f - `src/modules/identity`, `app/(app)/aniversariantes`, `app/(app)/perfil` e
`prisma/` não mudaram desde então:

- Quem não divide ministério não aparece (`visibleMinistryIds`, membership `ACTIVE`; admin vê todos,
  premissa não confirmada do plano). Ninguém altera a data de outro usuário
  (`src/modules/identity/services/updateProfile.ts:9` e `:22`).
- Sem deslocamento de um dia: valor padrão do formulário por `toISOString().slice(0, 10)`
  (`app/(app)/perfil/page.tsx:49`), lista por `getUTCMonth`/`getUTCDate`
  (`src/modules/identity/domain/birthday.ts:25` e `:26`), "hoje" por `dateKey` em `APP_TZ`.
  `parseBirthDate` conferido em Node na rodada 1: aceita `2000-02-29`; rejeita `1990-02-29`,
  `1990-04-31`, `1990-13-01` e datas futuras.
- Único chamador de `updateProfileAction` é `app/(app)/perfil/ProfileForm.tsx:23`, já adaptado.
- Schema válido; SQL da migração igual ao do `prisma migrate diff`, salvo espaços.

## Gaps

Nenhum bloqueia o veredito. O achado 1 da rodada 1 (vazamento da linha `User`) está fechado em
`151dee8`.

| N | Achado | Onde | Origem | Severidade |
| --- | --- | --- | --- | --- |
| 1 | A segunda metade do claim de C10 ("nenhuma outra consulta do repo passa `include: { user: true }` adiante para client component") não tem prova: o grep negativo cobre só `userSkills.ts`. Ainda existem 7 consultas com `user: true` e 3 leituras de linha inteira que hoje repassam só campos escolhidos (tabela acima); nada falha se uma delas passar a mandar o objeto inteiro a um client component | `.specs/features/aniversariantes/checks.md:51`; ex.: `src/modules/scheduling/services/listMonthOccurrences.ts:58`, `app/(app)/solicitacoes/page.tsx:28` | reduzido do achado 2 da rodada 1 | precisão do check |
| 2 | Lacuna de nível em C5 (Observable "unauthorised"): a ligação das páginas com `visibleMinistryIds` segue sem prova, nem grep. Correta por leitura | `app/(app)/aniversariantes/page.tsx:39`; `app/(app)/page.tsx:35` | carried from 4e1756f (achado 3) | precisão do check |
| 3 | SQL commitado normalizado à mão em relação à saída do `prisma migrate diff`, só em espaços | `prisma/migrations/20261002210000_user_birth_date/migration.sql:2` | carried from 4e1756f (achado 4) | cosmético |

## Gate

verified at 6f0f04c

`npx vitest run tests/unit/announcements.test.ts tests/unit/birthday.test.ts tests/unit/skillMatrixPrivacy.test.ts --reporter=verbose` - 23 passed, 0 failed (10 de `birthday.test.ts`, 1 de `skillMatrixPrivacy.test.ts`)
`npm run test` (suíte inteira no HEAD) - 377 passed, 0 failed
`npm run typecheck` - exit 0
