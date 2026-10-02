# Aniversariantes - checks

Profile: light
Plan: `.specs/features/aniversariantes/plan.md`

## Intent

9 checks in 3 slices · 1 one-way door · 1 open, of which 0 block the build (1 blocks go-live)

## Checks

### S1 - Pessoa informa a data · 5 files · 8 KB · ~2k

**C1** - [x] `updateProfile({ name, birthDate: "1990-03-14" })` chama `user.update` com `birthDate` igual a `1990-03-14T00:00:00.000Z`; o schema declara `birthDate DateTime? @db.Date` e a migração contém `ADD COLUMN "birthDate" DATE` (AC 1, door 1)
Proof: `npm run test -- tests/unit/birthday.test.ts -t "updateProfile grava a data"`
Proof: `grep -Eq "birthDate +DateTime\? +@db\.Date" prisma/schema.prisma && grep -rq 'ADD COLUMN "birthDate" DATE' prisma/migrations`

**C2** - [x] `updateProfile` com `birthDate: ""` grava `birthDate: null`; sem `birthDate`, `data` não contém a chave (AC 2)
Proof: `npm run test -- tests/unit/birthday.test.ts -t "vazio limpa e ausente nao altera"`

**C3** - [x] `parseBirthDate` lança `INVALID_BIRTH_DATE` para `"1990-02-30"`, `"abc"`, `"1899-12-31"` e para amanhã; aceita `"1900-01-01"` e a data de hoje; `updateProfile` com data inválida não chama `user.update`; e `ProfileForm` mostra "Data de nascimento inválida" (AC 3)
Proof: `npm run test -- tests/unit/birthday.test.ts -t "parseBirthDate"`
Proof: `npm run test -- tests/unit/birthday.test.ts -t "data invalida nao grava"`
Proof: `grep -q "Data de nascimento inválida" "app/(app)/perfil/ProfileForm.tsx"`

### S2 - Lista do mês · 4 files · 10 KB · ~3k

**C4** - [x] `birthdaysOfMonth` para março, com Bia (14/03/1990), Ana (14/03/2001), Caio (02/03/1985) e Duda (20/04/1992), devolve `[{ day: 2, name: "Caio" }, { day: 14, name: "Ana" }, { day: 14, name: "Bia" }]` com `userId`, e nenhum item tem ano ou `birthDate` (AC 4)
Proof: `npm run test -- tests/unit/birthday.test.ts -t "birthdaysOfMonth"`

**C5** - [x] `listBirthdays(3, ["m1"])` consulta `user.findMany` com `birthDate: { not: null }` e `memberships: { some: { status: "ACTIVE", ministryId: { in: ["m1"] } } }`; com lista de ministérios vazia devolve `[]` sem consultar (AC 5)
Proof: `npm run test -- tests/unit/birthday.test.ts -t "listBirthdays"`

**C6** - [x] `parseMonthNumber("3", 10) = 3`, `("12", 10) = 12`; `(undefined)`, `("0")`, `("13")`, `("3.5")` e `("abc")` devolvem o fallback 10 (AC 6)
Proof: `npm run test -- tests/unit/birthday.test.ts -t "parseMonthNumber"`

**C7** - [x] `/aniversariantes` mostra "Nenhum aniversariante neste mês" com lista vazia (AC 7)
Proof: `grep -q "Nenhum aniversariante neste mês" "app/(app)/aniversariantes/page.tsx" && npm run typecheck`

**C8** - [x] `isBirthdayToday(14, 3, "2026-03-14")` é `true`; `(14, 3, "2026-03-15")` e `(14, 4, "2026-03-14")` são `false`; a página usa `isBirthdayToday` para a marca "hoje" (AC 8)
Proof: `npm run test -- tests/unit/birthday.test.ts -t "isBirthdayToday"`
Proof: `grep -q "isBirthdayToday(" "app/(app)/aniversariantes/page.tsx"`

### S3 - Entrada · 1 file · 6 KB · ~2k

**C9** - [x] A página inicial tem a entrada `href="/aniversariantes"` alimentada por `listBirthdays` (AC 9)
Proof: `grep -q 'href="/aniversariantes"' "app/(app)/page.tsx" && grep -q "listBirthdays(" "app/(app)/page.tsx" && npm run typecheck`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| entrada de `birthDate` no perfil (3) | data válida C1 · vazia C2 · ausente C2 | - |
| datas rejeitadas e bordas (6) | dia inexistente C3 · não é data C3 · antes de 1900 C3 · futura C3 · 1900-01-01 aceita C3 · hoje aceita C3 | - |
| ordenação da lista (3) | por dia C4 · empate por nome C4 · outro mês fica fora C4 | - |
| parâmetro `mes` (7) | 3 C6 · 12 C6 · ausente C6 · 0 C6 · 13 C6 · decimal C6 · texto C6 | - |
| marca "hoje" (3) | mesmo dia e mês C8 · outro dia C8 · outro mês C8 | - |
| door 1 (2 lugares) | schema C1 · migração C1 | - |

- C7, C8 (2ª prova) e C9 são grep (+ typecheck) para a ligação com a tela; o repo não tem teste de componente
- Nenhum outro check afirma mais do que o caso que sua prova exercita

## Swept

- validation: C3, C6
- failure modes: existing - `app/(app)/error.tsx` cobre falha de leitura; `ProfileForm` mostra "Erro ao salvar" para erro não mapeado
- idempotency: n/a - salvar o perfil duas vezes grava o mesmo valor
- authorization: C5; existing - `updateProfile` só altera o usuário da sessão (`requireUser`)
- concurrency: n/a - uma linha, último salvamento vence
- data lifecycle: C2 - a pessoa apaga a própria data deixando o campo vazio; C4 - o ano não sai do servidor
- dependency failure: n/a - sem dependência externa
- state transitions: n/a - nenhum estado além do valor do campo
- observability: n/a - sem requisito de log

## Handoff

- S1 ~2k + S2 ~3k + S3 ~2k = ~7k (wc -c / 4 dos arquivos tocados), abaixo do budget de 150k - one builder
