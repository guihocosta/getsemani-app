# Presença e faltas

## Problem

O voluntário já confirma a escala (`Allocation.status` `PENDING` → `CONFIRMED`) e já faz check-in no
dia (`Allocation.checkedInAt`), mas o líder não enxerga quem deixou de comparecer: o ícone de
check-in só aparece na ocorrência de hoje (`app/(app)/escalas/OccurrenceRow.tsx:372`) e `/admin` não
agrega presença. Passado o dia, o dado existe no banco e não aparece em tela nenhuma. A fonte
(`docs/discovery/2026-09-21-louveapp.md` §5 e §9) não traz número; a dor citada é "o escalado viu?
vai?".

Quando isto sair: o líder abre `/admin` e vê a taxa de presença dos últimos 30 dias e quem mais
faltou; abre um dia passado em `/escalas` e vê, vaga a vaga, quem fez check-in e quem faltou.

## Flow

Reusa `Allocation.checkedInAt` (check-in já existente) como única fonte de presença e o recorte por
`scopeIds` já usado pelos relatórios de `/admin`; nada novo é gravado.

1. líder/admin abre `/admin` -> `AdminPage` (exists) resolve `scopeIds` e a janela `[hoje-30d, início de hoje)`
2. `reports` services (exists) - lê alocações com pessoa em ocorrências `ACTIVE` da janela, entrega linhas `{ userId, name, checkedIn }`
3. `reports` domain (new, no door - placement per conventions) - resume em total, presentes, faltas, taxa e ranking por pessoa
4. out: `AdminPage` (exists) renderiza o bloco "Presença"
5. qualquer membro abre um dia em `/escalas` -> `EscalaCalendar` (exists) passa `dayKey` e `todayKey` -> `OccurrenceRow` (exists)
6. `scheduling` domain (new, no door - placement per conventions) - decide a marca da vaga: presente, falta ou nenhuma
7. out: `OccurrenceRow` (exists) mostra ícone de check-in ou selo "faltou"

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: `falta` - alocação com pessoa (não convidado) em ocorrência `ACTIVE` de dia anterior a hoje, sem `checkedInAt`; vive em `scheduling/domain` e `reports/domain` |
| domain | existing term: `checkedIn` no calendário significava "mostrar ícone só hoje", agora "mostrar ícone hoje e em dias passados" - quem ramifica hoje: só `OccurrenceRow.tsx:372` |
| stored data | nothing to migrate; alocações anteriores a 2026-07-23 (migração `allocation_status_checkin`) não têm check-in e contariam como falta, mas ficam fora da janela de 30 dias |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside; páginas e componentes só deste repo

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| None | - | - |

- Nothing else in this change is hard to reverse: sem schema, sem dependência, sem contrato externo

## Criteria

### S1: Relatório de presença em `/admin` (P1)

Líder vê taxa de presença e quem mais faltou nos últimos 30 dias.

**Acceptance Criteria**

1. WHEN o resumo recebe uma linha com `checkedIn: false` THEN o sistema SHALL contar 1 falta para aquela pessoa; com `checkedIn: true`, 1 presença
2. The system SHALL calcular a taxa de presença como `round(presentes / total * 100)` inteiro, e `null` quando `total = 0`
3. The system SHALL ordenar o ranking por faltas decrescente e, no empate, por nome crescente, incluindo só pessoas com faltas ≥ 1
4. WHEN o relatório consulta o banco THEN o sistema SHALL filtrar por `userId` não nulo, ocorrência `ACTIVE` e publicada, data `>= from` e `< to`, e pelos `ministryIds` recebidos
5. WHEN `/admin` abre THEN o sistema SHALL usar a janela `from = início de hoje - 30 dias`, `to = início de hoje` (APP_TZ) e os mesmos `scopeIds` dos outros relatórios
6. IF `total = 0` THEN `/admin` SHALL mostrar "Sem escalas concluídas no período."
7. IF `total > 0` e nenhuma falta THEN `/admin` SHALL mostrar "Nenhuma falta no período."
8. WHEN há faltas THEN `/admin` SHALL listar no máximo 5 pessoas, cada uma com "N falta(s) de M"

**Independent test:** semear duas alocações passadas, uma com check-in e uma sem, abrir `/admin` e ver "50% de presença" e a pessoa sem check-in com "1 falta de 1".

### S2: Marca de presença no dia passado em `/escalas` (P1)

Quem abre um dia passado vê quem fez check-in; quem gerencia vê também quem faltou.

**Acceptance Criteria**

9. WHILE o dia da ocorrência é anterior a hoje e a vaga tem pessoa sem check-in, a marca SHALL ser `FALTA`
10. WHILE o dia da ocorrência é hoje ou anterior e a vaga tem pessoa com check-in, a marca SHALL ser `PRESENTE`
11. The system SHALL devolver marca nula para convidado sem conta, dia futuro, e dia de hoje sem check-in; a tela só chama a função para vaga com pessoa
12. WHILE o usuário não gerencia o ministério, `OccurrenceRow` SHALL não mostrar o selo "faltou"

**Independent test:** abrir no calendário um dia passado com uma vaga sem check-in, como líder ver "faltou" e como voluntário não ver.

## Out of scope

| Excluded | Why |
| --- | --- |
| Confirmação de presença (confirmar/recusar escala) | já existe: `respondAllocation.ts`, `PendingConfirmationsCard` |
| Líder marcar presença ou abonar falta manualmente | capacidade nova; hoje presença é só auto check-in. Candidata a próxima fatia se o número ficar ruidoso |
| Filtro de período no relatório | o dashboard (feature 7 do backlog) traz filtros |
| Notificar a pessoa ou o líder sobre a falta | não pedido |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| O que é falta | sem `checkedInAt` depois que o dia acabou | único sinal de presença que o sistema tem | n |
| Alocação `PENDING` nunca confirmada em dia passado | conta como falta se não houve check-in | a pessoa estava escalada; confirmar não é pré-requisito do check-in | n |
| Quem vê o selo "faltou" | só quem gerencia o ministério | expor falta para todos os voluntários é sensível | n |
| Plano sem revisão humana | seguir direto para checks e build | usuário pré-aprovou o backlog nesta sessão | y |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `/admin` bloco Presença | empty state | AC 6, AC 7 |
| screen `/admin` bloco Presença | loading | existing - `app/(app)/loading.tsx` |
| screen `/admin` bloco Presença | error state | existing - `app/(app)/error.tsx` |
| screen `/admin` bloco Presença | unauthorised | existing - `AdminPage` redireciona quem não é admin nem líder |
| screen `/admin` bloco Presença | density and ordering | AC 3, AC 8 |
| screen `/admin` bloco Presença | destructive action confirms | n/a - bloco só de leitura |
| screen `OccurrenceRow` | empty state | AC 11 |
| screen `OccurrenceRow` | unauthorised | AC 12 |
| screen `OccurrenceRow` | loading, error | n/a - marca derivada de dados já carregados pelo calendário |
| screen `OccurrenceRow` | destructive action confirms | n/a - marca só de leitura |

## Sources

- `docs/discovery/2026-09-21-louveapp.md` §9 - "Faltas / histórico de presença" entra, derivado da confirmação
