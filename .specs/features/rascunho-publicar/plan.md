# Rascunho e publicação de escala

## Problem

Toda alteração que o líder faz numa data já vale para todo mundo na hora: `allocateVolunteer`
dispara push "Você foi escalado" a cada pessoa colocada (`allocateVolunteer.ts:85`), trocar a pessoa
dispara "Você foi removido" para a anterior (`allocateVolunteer.ts:164`), e a data aparece em
`/vagas` e no calendário dos voluntários enquanto ainda está sendo montada. Quem paga é o
voluntário, que recebe aviso de escala que o líder ainda vai mexer, e o líder, que não tem como
montar com calma. A fonte (`docs/discovery/2026-09-21-louveapp.md` §3 e §9) não traz número; cita
"evita notificar escala errada".

Quando isto sair: o líder marca uma data como rascunho, monta a escalação sem ninguém ser avisado
nem enxergar, e ao publicar todos os escalados recebem o aviso de uma vez.

## Flow

Reusa `notifyUser` e sua idempotência por `dedupeKey` (`assign:<allocationId>`) para o aviso em lote
da publicação, e `requireLeaderOf` como único gate de quem pode publicar.

1. líder abre o menu da data -> `OccurrenceMenu` (exists) -> `setOccurrencePublishedAction` em `escalas/actions.ts` (exists)
2. `scheduling` services (exists) - `requireLeaderOf`, grava o estado em `Occurrence` (door 1)
3. ao publicar: `scheduling` services (exists) -> `notifyUser` (exists) uma vez por pessoa com conta alocada naquela data
4. enquanto rascunho: os serviços de alocação de `scheduling` (exists) gravam a alocação e pulam `notifyUser`
5. leitura do voluntário: `listMonthOccurrences`, `getMySchedule` (exists), `/vagas` page (exists), `selfAllocate` (exists) e o cron `reminders` (exists) ignoram data em rascunho
6. leitura do líder: `listMonthOccurrences` (exists) devolve o rascunho só para ministérios que ele gerencia; `OccurrenceRow` (exists) mostra o selo "rascunho"
7. `reports` services (exists) - presença ignora data em rascunho

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: `rascunho` - ocorrência não publicada: invisível para quem não gerencia o ministério e sem notificações; vive em `scheduling` |
| domain | existing term: "ocorrência ativa" (`status = ACTIVE`) significava "visível para o ministério"; agora visível = `ACTIVE` e publicada. Quem ramifica hoje: `listMonthOccurrences`, `getMySchedule`, `/vagas` page, `reminders` cron, `selfAllocate`, `attendanceRows` |
| code | `listMonthOccurrences` ganha um 4º parâmetro (ministérios gerenciáveis); 4 chamadas mudam (`escalas/page.tsx` ×3, `loadMonthAction`) |
| checks anteriores | `presenca-faltas` C4: o `where` de `attendanceRows` ganha o filtro de publicada; o teste `tests/unit/attendanceReport.test.ts` acompanha |
| stored data | coluna nova com default: toda ocorrência existente fica publicada; nada a migrar. A migração precisa de `prisma migrate deploy` antes do deploy do código |

## Relations

None - no new entity or relation; só um estado novo em `Occurrence` (door 1)

## Surface

None - nothing consumed outside; as Server Actions novas só são chamadas por componentes deste repo

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. estado de publicação persistido | `Occurrence.published Boolean @default(true)` | `Schedule.published`: vale para a série inteira, não deixa montar uma data com calma depois que a série existe. `publishedAt DateTime?` nulo = rascunho: esconderia todas as ocorrências já existentes sem backfill |

- Nothing else in this change is hard to reverse: sem dependência nova, sem contrato externo

## Criteria

### S1: Líder alterna rascunho e publicada (P1)

O líder tira uma data do ar e a devolve, com aviso em lote na volta.

**Acceptance Criteria**

1. WHEN o líder aciona "Tornar rascunho" numa data THEN o sistema SHALL gravar a ocorrência como não publicada e não enviar notificação
2. WHEN o líder aciona "Publicar" THEN o sistema SHALL gravar a ocorrência como publicada e chamar `notifyUser` uma vez por alocação com conta, com `type = ASSIGNMENT` e `dedupeKey = assign:<allocationId>`
3. WHEN a publicação encontra alocação de convidado sem conta THEN o sistema SHALL não chamar `notifyUser` para ela
4. IF quem aciona não lidera o ministério da data THEN o sistema SHALL falhar com `FORBIDDEN` sem gravar
5. The system SHALL criar toda ocorrência nova como publicada e manter publicadas as já existentes

**Independent test:** tornar uma data rascunho, alocar duas pessoas, publicar e ver dois avisos saindo só na publicação.

### S2: Rascunho não notifica (P1)

Mexer numa data em rascunho não avisa ninguém.

**Acceptance Criteria**

6. WHILE a ocorrência é rascunho, o helper de notificação de `scheduling` SHALL devolver `"skipped"` sem chamar `notifyUser`; publicada, SHALL repassar os mesmos parâmetros a `notifyUser`
7. WHILE a ocorrência é rascunho, `allocateVolunteer` SHALL criar a alocação `PENDING` sem chamar `notifyUser`
8. The system SHALL rotear por esse helper toda notificação de `allocateVolunteer.ts`, `allocateGuest.ts`, `linkGuestAllocation.ts`, `repeatSchedule.ts` e `setSlotActive.ts`

**Independent test:** em rascunho, alocar, trocar e desativar vaga; nenhuma linha nova em `Notification`.

### S3: Rascunho invisível para quem não gerencia (P1)

Voluntário não vê, não pega vaga e não é lembrado de data em rascunho.

**Acceptance Criteria**

9. WHEN `listMonthOccurrences` consulta THEN o sistema SHALL devolver ocorrência em rascunho só de ministério presente na lista de gerenciáveis, e cada item SHALL carregar `published`
10. The system SHALL filtrar `getMySchedule` por ocorrência publicada
11. The system SHALL filtrar por ocorrência publicada as vagas livres e as trocas abertas de `/vagas`
12. IF alguém tenta `selfAllocate` numa vaga de ocorrência em rascunho THEN o sistema SHALL falhar com `NOT_PUBLISHED`, e a action SHALL mostrar "Essa escala ainda não foi publicada."
13. The system SHALL filtrar o cron `reminders` e `attendanceRows` por ocorrência publicada

**Independent test:** como voluntário, abrir calendário, `/vagas` e início com uma data em rascunho e não vê-la em nenhum dos três.

### S4: Líder enxerga o estado (P2)

**Acceptance Criteria**

14. WHILE a ocorrência é rascunho, `OccurrenceRow` SHALL mostrar o selo "rascunho" e o menu SHALL oferecer "Publicar"; publicada, o menu SHALL oferecer "Tornar rascunho"
15. WHEN o líder aciona "Tornar rascunho" THEN `OccurrenceRow` SHALL pedir confirmação com o texto "Voluntários deixam de ver esta data até você publicar de novo."

**Independent test:** abrir o menu de uma data, tornar rascunho, ver o selo e a opção trocar para "Publicar".

## Out of scope

| Excluded | Why |
| --- | --- |
| Série que já nasce em rascunho (toggle no formulário da escala) | segunda fatia; o default publicado mantém o comportamento atual sem regressão |
| Publicar/despublicar várias datas de uma vez | sem pedido; uma data por vez cobre o caso de montar o mês |
| Avisar "sua escala foi retirada" ao voltar para rascunho | rascunho é silencioso por definição; o líder confirma antes |
| Troca, confirmação e recusa em data em rascunho | inalcançável: o voluntário não vê a alocação enquanto rascunho |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Rascunho por data ou por série | por data (`Occurrence`) | a série é recorrente; o que o líder monta com calma é o domingo X | n |
| Estado inicial das datas | publicada | zero regressão: quem não usa rascunho não percebe mudança | n |
| Admin e líder de outro ministério | só quem gerencia o ministério da data vê o rascunho; admin gerencia todos | mesma regra de `ledMinistryIds` | n |
| Alocações feitas antes de virar rascunho | ficam gravadas; publicar não reenvia aviso já enviado | `dedupeKey` único em `Notification` | n |
| Aplicar migração no banco | não aplicada por esta feature; arquivo de migração commitado | mudança em banco de produção exige autorização explícita | y |
| Plano sem revisão humana | seguir direto para checks e build | usuário pré-aprovou o backlog nesta sessão | y |

**Open questions:**

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| 1 | blocks go-live | Quem roda `npm run db:deploy` e quando? | código que lê `published` quebra em produção se subir antes da migração |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `OccurrenceRow` | empty state | n/a - selo é um estado da linha, não uma lista |
| screen `OccurrenceRow` | loading | existing - `pending` de `useTransition` desabilita o menu |
| screen `OccurrenceRow` | error state | existing - `handleActionError` devolve `code` e a linha mostra `MENSAGENS[code]` |
| screen `OccurrenceRow` | unauthorised | AC 4 |
| screen `OccurrenceRow` | destructive action confirms | AC 15 |
| screen `/vagas` | error state de vaga em rascunho | AC 12 |
| screen calendário, `/vagas`, início | density and ordering | n/a - só some o que é rascunho; ordenação inalterada |

## Sources

- `docs/discovery/2026-09-21-louveapp.md` §9 - "Rascunho vs publicada na escala: 1 booleano + gate"
