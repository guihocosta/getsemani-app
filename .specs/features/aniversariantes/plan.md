# Aniversariantes

## Problem

O app não sabe quando ninguém faz aniversário: `User` guarda nome, e-mail e telefone
(`prisma/schema.prisma`), sem data de nascimento. O líder que quer lembrar do aniversário de quem
serve com ele depende de memória ou de planilha à parte. A fonte
(`docs/discovery/2026-09-21-louveapp.md` §7 e §9) não traz número; lista "aniversariantes do mês" e
classifica como "campo de data no `User` + listagem; cuidado pastoral barato".

Quando isto sair: cada pessoa informa (se quiser) a data de nascimento no perfil, e todo membro vê a
lista de aniversariantes do mês dos seus ministérios, com quem faz aniversário hoje em destaque.

## Flow

Reusa `updateProfile` (única escrita do próprio perfil) e `visibleMinistryIds` para decidir de quem
o usuário vê o aniversário.

1. pessoa abre `/perfil` -> `ProfileForm` (exists) -> `updateProfile` em `identity` services (exists) valida e grava a data em `User` (door 1)
2. membro abre `/aniversariantes?mes=` (new, no door - placement per conventions) -> `identity` services (exists) leem quem tem data e é membro ativo de um dos ministérios do usuário
3. `identity` domain (new, no door - placement per conventions) - filtra pelo mês, ordena por dia e devolve só dia e nome (o ano não sai do servidor)
4. out: lista do mês; página inicial `app/(app)/page.tsx` (exists) mostra a entrada "Aniversariantes" com quem faz aniversário hoje

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: `aniversariante` - pessoa com data de nascimento informada, vista por quem divide ministério com ela; vive em `identity` |
| code | `updateProfile` ganha o parâmetro opcional `birthDate`; chamadas existentes continuam válidas |
| stored data | coluna nova anulável; quem não informar fica fora da lista. Precisa de `prisma migrate deploy` antes do deploy |

## Relations

None - no new entity or relation; só um dado novo em `User` (door 1)

## Surface

None - nothing consumed outside; páginas e Server Actions só deste repo

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. data de nascimento persistida | `User.birthDate DateTime? @db.Date` (dia de calendário, sem hora) | dia e mês em duas colunas inteiras: perde o ano, que a pessoa pode querer corrigir depois, e não valida 30/02. `DateTime` com hora: o dia escorrega com fuso |

- Nothing else in this change is hard to reverse

## Criteria

### S1: Pessoa informa a data (P1)

**Acceptance Criteria**

1. WHEN a pessoa salva o perfil com uma data válida `yyyy-MM-dd` THEN o sistema SHALL gravar `birthDate` como aquele dia de calendário (meia-noite UTC)
2. WHEN a pessoa salva com a data vazia THEN o sistema SHALL gravar `birthDate` nulo; WHEN o campo não é enviado THEN SHALL não alterar `birthDate`
3. IF a data não é um dia real, é futura ou anterior a 1900 THEN o sistema SHALL rejeitar com `INVALID_BIRTH_DATE` sem gravar, e o perfil SHALL mostrar "Data de nascimento inválida"

**Independent test:** informar 14/03/1990 no perfil, salvar, reabrir e ver a data.

### S2: Lista do mês (P1)

**Acceptance Criteria**

4. The system SHALL listar do mês pedido só quem tem `birthDate` naquele mês, em ordem de dia e depois nome, devolvendo dia e nome, nunca o ano
5. WHEN o serviço consulta THEN SHALL trazer só usuários com data informada que são membros `ACTIVE` de algum dos ministérios recebidos
6. WHEN o parâmetro `mes` é um inteiro de 1 a 12 THEN a página SHALL usar esse mês; ausente ou inválido, o mês corrente (APP_TZ)
7. IF o mês não tem aniversariante THEN a página SHALL mostrar "Nenhum aniversariante neste mês"
8. WHILE o dia e o mês de alguém são os de hoje, a lista SHALL marcar a pessoa como "hoje"

**Independent test:** abrir `/aniversariantes` em março e ver "14 · Ana" na lista.

### S3: Entrada (P2)

**Acceptance Criteria**

9. The system SHALL mostrar na página inicial a entrada "Aniversariantes" para `/aniversariantes`, com os nomes de quem faz aniversário hoje quando houver

**Independent test:** no dia do aniversário de alguém do ministério, ver o nome na página inicial.

## Out of scope

| Excluded | Why |
| --- | --- |
| Push de parabéns / lembrete ao líder | sem pedido; cron novo e mais notificação |
| Mostrar a idade | dado sensível sem uso pastoral; o ano fica no servidor |
| Admin informar a data de outra pessoa | a pessoa informa a própria; evita dado pessoal cadastrado por terceiro |
| Opção "não mostrar meu aniversário" | não informar a data já é a opção |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quem vê meu aniversário | quem é membro de um ministério de que eu sou membro ativo; admin vê todos os ministérios | mesmo alcance de `visibleMinistryIds` | n |
| Campo obrigatório | não | dado pessoal; informar é opcional | n |
| 29 de fevereiro | aparece em fevereiro, dia 29, todo ano | regra mais simples; a lista é por mês | n |
| Aplicar migração no banco | não aplicada; arquivo commitado (AD-008) | mudança em produção exige autorização explícita | y |
| Plano sem revisão humana | seguir direto para checks e build | usuário pré-aprovou o backlog nesta sessão | y |

**Open questions:**

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| 1 | blocks go-live | Quem roda `npm run db:deploy` e quando? | código que lê `User.birthDate` quebra em produção se subir antes da migração |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `/aniversariantes` | empty state | AC 7 |
| screen `/aniversariantes` | loading, error | existing - `app/(app)/loading.tsx` e `app/(app)/error.tsx` |
| screen `/aniversariantes` | unauthorised | AC 5 |
| screen `/aniversariantes` | density and ordering | AC 4, AC 8 |
| screen `/aniversariantes` | destructive action confirms | n/a - tela só de leitura |
| screen `/perfil` | error state do campo de data | AC 3 |

## Sources

- `docs/discovery/2026-09-21-louveapp.md` §9 - "Aniversariantes: campo de data no `User` + listagem"
