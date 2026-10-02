# Aniversariantes verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: e2b2015..4e1756f (provas executadas no HEAD `4e1756f` da branch `feat/backlog-louveapp`)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Os 9 checks estão provados com evidência localizada, mas a leitura adversarial achou um furo real
que nenhum check cobre: a data de nascimento completa (com o ano) de outras pessoas sai do servidor
para o navegador de líderes e admins em `/admin/ministerios`. Isso contradiz o invariante do plano
("o ano não sai do servidor", Flow passo 3, AC 4 e Out of scope "Mostrar a idade") e a linha do
Swept "data lifecycle: C4 - o ano não sai do servidor". Furo real reprova mesmo com os checks verdes.

Passo 5 (percorrer o fluxo com o usuário) não se aplica: o Verifier não alcança o usuário.

## Checks

Uma única invocação verbosa cobriu os dois arquivos de prova das duas features
(`npx vitest run tests/unit/announcements.test.ts tests/unit/birthday.test.ts --reporter=verbose`);
cada teste citado abaixo apareceu individualmente como executado e aprovado. As provas `grep` foram
executadas como escritas em `checks.md` (exit 0 cada) e `npm run typecheck` saiu com exit 0.

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

Julgamento de nível e amostragem:

- Cada nome de teste casa com o padrão `-t` do check e foi criado nesta feature
  (`tests/unit/birthday.test.ts` é arquivo novo no diff).
- C3: os quatro casos rejeitados e as duas bordas aceitas têm asserção própria; "amanhã" é
  `2026-10-03` contra `HOJE = 2026-10-02` com relógio falso.
- C2: `toHaveBeenLastCalledWith` não distingue chave ausente de `birthDate: undefined`; para o
  Prisma as duas formas não alteram a coluna, então a asserção basta para o AC 2.
- C7, C8 (2ª prova) e C9 são grep + typecheck, como declarado em `checks.md`.
- **Lacuna de cobertura**: o invariante "o ano não sai do servidor" só é provado para o retorno de
  `birthdaysOfMonth` (C4). Nenhum check enumera as outras leituras de `User` que chegam a um
  componente client. É exatamente ali que o furo do achado 1 está.

## Swept (existing)

| Linha Swept | Restrição citada | Onde está | Confere |
| --- | --- | --- | --- |
| failure modes | `app/(app)/error.tsx` cobre falha de leitura | o arquivo existe | sim |
| failure modes | `ProfileForm` mostra "Erro ao salvar" para erro não mapeado | `app/(app)/perfil/ProfileForm.tsx:10` e `:26`; `app/(app)/perfil/actions.ts:29` | sim |
| authorization | `updateProfile` só altera o usuário da sessão | `src/modules/identity/services/updateProfile.ts:9` (`requireUser`) e `:22` (`where: { id: user.id }`) | sim |
| Observable: loading, error | `app/(app)/loading.tsx` e `app/(app)/error.tsx` | os dois arquivos existem | sim |
| data lifecycle (não é linha "existing", mas a afirmação é mais larga que a prova) | "C4 - o ano não sai do servidor" | contradita por `src/modules/ministries/services/userSkills.ts:112` | não - ver achado 1 |

## Adversarial read

- **Privacidade (d)**: a lista e a página inicial estão corretas. `listBirthdays` seleciona
  `birthDate` só no servidor (`src/modules/identity/services/birthdays.ts:13`) e devolve
  `userId`, `name`, `day` (`src/modules/identity/domain/birthday.ts:26`); a página é Server Component
  e renderiza dia e nome (`app/(app)/aniversariantes/page.tsx:76` e `:77`); a página inicial mostra só
  o primeiro nome (`app/(app)/page.tsx:108`). O escopo é `visibleMinistryIds` (membership `ACTIVE`;
  admin vê todos, conforme a premissa não confirmada do plano), então quem não divide ministério não
  aparece. `/perfil` passa a data só do próprio usuário ao próprio formulário
  (`app/(app)/perfil/page.tsx:49`). **O furo está fora do diff**: achado 1.
- **Alterar a data de outro usuário (d)**: não é possível. `updateProfile` ignora qualquer id vindo
  do chamador e monta `data` campo a campo (`updateProfile.ts:22` a `:27`).
- **Datas (e)**: sem deslocamento de um dia. O valor padrão do formulário usa
  `toISOString().slice(0, 10)` (UTC, `app/(app)/perfil/page.tsx:49`), a lista usa `getUTCMonth` e
  `getUTCDate` (`birthday.ts:25` e `:26`), e "hoje" compara dia e mês com `dateKey(new Date())` em
  `APP_TZ` (`app/(app)/aniversariantes/page.tsx:37`, `app/(app)/page.tsx:36`). Conferido em Node:
  `2026-10-03T02:30Z` dá `dateKey` `2026-10-02` (23h30 em São Paulo); formatar a data gravada em
  `APP_TZ` daria o dia anterior, e o código não faz isso em lugar nenhum. `parseBirthDate` conferido
  em Node com a mesma lógica: `2000-02-29` aceita; `1990-02-29`, `1900-02-29`, `1990-04-31`,
  `1990-13-01`, `1990-00-10`, `1990-01-00` rejeitadas; `2026-10-03` e `9999-12-31` rejeitadas como
  futuras; `0000-01-01` rejeitada. Quem nasceu em 29/02 aparece em fevereiro dia 29 e nunca recebe a
  marca "hoje" em ano não bissexto, conforme a premissa do plano.
- **Contrato de `updateProfileAction` (f)**: único chamador é `ProfileForm.tsx:23`, já adaptado ao
  retorno `{ ok }` ou `{ ok: false, code }`. Nenhum outro uso em `app`, `src`, `tests` ou `scripts`.
- **Schema e migração (g)**: `npx prisma validate` - schema válido. O SQL regenerado sem banco por
  `prisma migrate diff` entre o schema de `4e1756f^` e o de `4e1756f` difere do arquivo commitado só
  em espaços (`ADD COLUMN     "birthDate" DATE` contra `ADD COLUMN "birthDate" DATE`);
  semanticamente idêntico. `prisma/schema.prisma` não mudou depois de `4e1756f`.
- **Convenções**: nenhuma cor crua do Tailwind no diff; textos em pt-BR; `Membership` pertence a
  `identity`, então o filtro por relação em `birthdays.ts:11` não cruza módulo.

## Gaps

| N | Achado | Onde | Severidade |
| --- | --- | --- | --- |
| 1 | **A data de nascimento completa de outras pessoas sai do servidor.** `listMinistrySkillMatrix` carrega a linha inteira de `User` (`include: { user: true }`) e devolve `user: m.user`; a página `/admin/ministerios` passa esse objeto como prop a `MinistryCard`, que é componente client. O React serializa o objeto inteiro no payload, não o tipo TypeScript, então a coluna nova `birthDate` (com o ano) de cada membro ativo vai para o navegador de qualquer líder daquele ministério e de qualquer admin, junto com e-mail e telefone que já iam. Contradiz o plano (Flow 3, AC 4, Out of scope "o ano fica no servidor"). Constatado por leitura do código; o servidor de desenvolvimento não foi iniciado | `src/modules/ministries/services/userSkills.ts:92` e `:112`; `app/(app)/admin/ministerios/page.tsx:44`; `app/(app)/admin/ministerios/MinistryCard.tsx:1` | maior - bloqueia |
| 2 | Lacuna de cobertura nos checks: "o ano não sai do servidor" é provado só em `birthdaysOfMonth`; faltou enumerar toda consulta que carrega `User` sem `select` e chega a componente client. As outras 8 consultas com `user: true` ou `user.findMany` sem `select` foram lidas e não vazam hoje (mapeiam para nome no servidor), mas nada as protege de uma regressão | `tests/unit/birthday.test.ts:85`; ex. de consulta sem `select` que hoje é segura: `src/modules/scheduling/services/listMonthOccurrences.ts:58` | precisão do check |
| 3 | Lacuna de nível em C5 (Observable "unauthorised"): a restrição "só meus ministérios" vive nas páginas, que passam `visibleMinistryIds` ao serviço; nenhuma prova, nem grep, cobre essa ligação. Correta por leitura | `app/(app)/aniversariantes/page.tsx:39`; `app/(app)/page.tsx:35` | precisão do check |
| 4 | O SQL commitado foi normalizado à mão em relação à saída do `prisma migrate diff` (AD-008), só em espaços. Sem efeito no banco | `prisma/migrations/20261002210000_user_birth_date/migration.sql:2` | cosmético |

Correção sugerida para o achado 1 (o Verifier não corrige nada): trocar o `include: { user: true }`
por `select` de `id` e `name` em `listMinistrySkillMatrix`, e acrescentar um teste que afirme que o
retorno não contém `birthDate`.

## Gate

`npx vitest run tests/unit/announcements.test.ts tests/unit/birthday.test.ts --reporter=verbose` - 20 passed, 0 failed (10 de `birthday.test.ts`)
`npm run test` (suíte inteira no HEAD) - 365 passed, 0 failed
`npm run typecheck` - exit 0
