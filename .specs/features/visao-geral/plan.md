# Visão geral (dashboard de métricas)

## Problem

O líder não tem um resumo do período: `/admin` mostra vagas abertas do mês, carga por pessoa e
presença dos últimos 30 dias em blocos separados, cada um com sua janela fixa, e nenhum responde
"quantas escalas tive, quanta gente usei e quanto do pessoal confirmou" para um período escolhido.
A fonte (`docs/discovery/2026-09-21-louveapp.md` §5 e §9) não traz número; lista os cartões do
concorrente (escalas, membros escalados x/y, total de escalações, confirmações %, faltas %) e
classifica como "agregações sobre dados existentes".

Quando isto sair: o líder abre "Visão geral", escolhe o período (7, 30, 90 dias ou mês atual) e vê
os cartões com os totais e percentuais dos ministérios que lidera.

## Flow

Reusa o recorte `scopeIds` de `/admin` (admin vê tudo, líder vê o que lidera), `startOfDay` /
`monthWindow` para as janelas e a mesma definição de falta de `presenca-faltas`.

1. líder/admin abre `/admin/visao-geral?periodo=` -> página (new, no door - placement per conventions) resolve `scopeIds` e a janela
2. `reports` services (exists) - contam ocorrências, vagas abertas, membros ativos e leem as alocações da janela, só de data publicada (AD-006)
3. `reports` domain (new, no door - placement per conventions) - resume em totais e percentuais
4. out: grade de cartões; `/admin` (exists) ganha a entrada "Visão geral"

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: `visão geral` - resumo de um período para os ministérios do líder; vive em `reports` |
| stored data | nothing to migrate - só leitura |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside; página só deste repo

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| None | - | - |

- Nothing else in this change is hard to reverse: sem schema, sem dependência, sem contrato externo

## Criteria

### S1: Período (P1)

**Acceptance Criteria**

1. The system SHALL resolver `7d`, `30d` e `90d` como a janela que termina no fim de hoje e começa N-1 dias antes do início de hoje (APP_TZ), e `mes` como o mês de calendário corrente
2. IF o parâmetro de período é ausente ou desconhecido THEN o sistema SHALL usar `30d`

**Independent test:** trocar o período pelos botões e ver os números mudarem.

### S2: Métricas (P1)

**Acceptance Criteria**

3. The system SHALL calcular: escalas (ocorrências), escalações (alocações, com ou sem conta), vagas abertas, membros escalados (pessoas distintas com conta) sobre membros ativos, confirmadas sobre alocações com conta, e faltas sobre alocações com conta em dias já encerrados
4. IF o denominador de um percentual é zero THEN o percentual SHALL ser nulo e a tela SHALL mostrar "—"
5. WHEN o serviço consulta THEN SHALL considerar só ocorrência `ACTIVE`, publicada, com data `>= from` e `< to`, dos `ministryIds` recebidos; e membros `ACTIVE` dos mesmos ministérios, sem repetir pessoa

**Independent test:** num período com 2 escalas, 4 escalações de 3 pessoas, 3 confirmadas e 1 falta em dia encerrado, ver os cartões com esses números.

### S3: Acesso e entrada (P1)

**Acceptance Criteria**

6. IF o usuário não é admin nem líder THEN a página SHALL redirecionar para `/`; líder SHALL ver só os ministérios que lidera, admin todos
7. The system SHALL mostrar em `/admin` a entrada "Visão geral" para `/admin/visao-geral`

**Independent test:** como voluntário, abrir `/admin/visao-geral` e cair na página inicial.

## Out of scope

| Excluded | Why |
| --- | --- |
| Filtros por dias da semana, faixa de horas e membros | filtros do LouveApp para bases grandes; período resolve o caso do líder |
| Intervalo customizado | quatro períodos fixos cobrem; sem pedido |
| Músicas selecionadas e mais tocadas | relatório de repertório é item próprio; exigiria `reports` ler tabelas de `repertoire` |
| Indisponibilidades no período | `Unavailability` é por mês/dia/faixa; contar por janela pede regra própria e ninguém pediu |
| Gráficos | cartões numéricos bastam para a pergunta do líder |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Rascunho entra nas métricas | não | confirmação e falta de data não publicada distorcem o número | n |
| Convidado sem conta | conta em escalações, não em membros, confirmações nem faltas | não confirma nem faz check-in | n |
| Período padrão | 30 dias | mesmo horizonte do bloco de presença em `/admin` | n |
| Plano sem revisão humana | seguir direto para checks e build | usuário pré-aprovou o backlog nesta sessão | y |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `/admin/visao-geral` | empty state | AC 4 - zeros e "—" |
| screen `/admin/visao-geral` | loading, error | existing - `app/(app)/loading.tsx` e `app/(app)/error.tsx` |
| screen `/admin/visao-geral` | unauthorised | AC 6 |
| screen `/admin/visao-geral` | density and ordering | AC 3 - ordem fixa dos cartões |
| screen `/admin/visao-geral` | destructive action confirms | n/a - tela só de leitura |

## Sources

- `docs/discovery/2026-09-21-louveapp.md` §5 e §9 - cartões do dashboard; "agregações Prisma sobre dados existentes"
- `.specs/STATE.md` AD-006 - leitura respeita `published`
