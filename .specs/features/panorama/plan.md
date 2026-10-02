# Panorama de escalas

## Problem

Para saber onde falta gente no mês, o líder precisa tocar dia por dia no calendário de `/escalas` e
ler vaga por vaga (`EscalaCalendar` mostra um dia de cada vez). Não há uma tela que mostre todas as
datas do mês lado a lado, então buraco em função crítica só aparece quando alguém abre aquele dia.
A fonte (`docs/discovery/2026-09-21-louveapp.md` §4 e §9) não traz número; descreve a grade
"função × datas do mês" e o ganho como "enxergar buracos na escala em 1 tela".

Quando isto sair: o membro abre o panorama de um ministério e vê uma grade com as funções nas linhas,
as datas do mês nas colunas e, em cada célula, quem está escalado ou que a vaga está aberta.

## Flow

Reusa `listMonthOccurrences` (já filtra rascunho por gerenciáveis, AD-006) como única leitura; o
panorama é só outra forma de mostrar o mesmo resultado.

1. membro abre `/escalas/panorama?mes=&ministerio=` -> página do panorama (new, no door - placement per conventions)
2. `scheduling` services (exists) - `visibleMinistryIds`, `ledMinistryIds`, `listMonthOccurrences` do ministério escolhido
3. `scheduling` domain (new, no door - placement per conventions) - monta colunas (datas), linhas (funções) e células, e conta vagas abertas
4. out: grade com rolagem horizontal; `/escalas` (exists) ganha o link "Panorama"

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: `panorama` - grade função × data de um ministério num mês; vive em `scheduling/domain` |
| code | `MonthOccurrenceItem` ganha `time` ("HH:mm"); `occurrenceCache.Item` e fixtures de teste acompanham |
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

### S1: Grade função × data (P1)

**Acceptance Criteria**

1. The system SHALL montar uma coluna por ocorrência do ministério no mês, na ordem recebida (cronológica), com rótulo de dia `dd/MM`, hora `HH:mm` e o estado `published`
2. The system SHALL montar uma linha por função que tenha ao menos uma vaga ativa no mês, em ordem alfabética pt-BR, ignorando vagas inativas
3. WHEN a ocorrência não tem vaga ativa daquela função THEN a célula SHALL ser nula; com vaga ativa sem alocação, `open`; com alocação, `filled` com o nome curto, se é convidado e se está pendente de confirmação
4. The system SHALL encurtar o nome para primeiro nome + inicial do último sobrenome (`"Maria Silva Souza"` -> `"Maria S."`, `"Ana"` -> `"Ana"`)
5. The system SHALL contar como vagas abertas só as células `open` de ocorrências de hoje em diante
6. IF o mês não tem ocorrência do ministério THEN a página SHALL mostrar "Nenhuma escala neste mês"

**Independent test:** abrir o panorama de outubro do Louvor e ver uma linha por função, uma coluna por domingo e "vaga aberta" destacada onde falta gente.

### S2: Escolha de ministério e mês (P1)

**Acceptance Criteria**

7. WHEN o parâmetro `ministerio` é um dos ministérios visíveis do usuário THEN a página SHALL mostrar esse ministério; IF está ausente ou não é visível THEN SHALL mostrar o primeiro ministério visível em ordem de nome
8. IF o usuário não tem ministério visível THEN a página SHALL mostrar "Você ainda não participa de nenhum ministério"
9. WHEN o parâmetro `mes` é inválido ou ausente THEN a página SHALL usar o mês corrente (APP_TZ)
10. WHILE a ocorrência é rascunho, a coluna SHALL trazer a marca "rascunho"; quem não gerencia o ministério SHALL não receber a coluna

**Independent test:** trocar o ministério no seletor e o mês pelas setas; como voluntário, não ver a data em rascunho.

### S3: Entrada (P2)

**Acceptance Criteria**

11. The system SHALL mostrar em `/escalas` um link "Panorama" para `/escalas/panorama`

**Independent test:** tocar em "Panorama" na tela de escalas.

## Out of scope

| Excluded | Why |
| --- | --- |
| Filtros por faixa de horas, dias da semana e membros | filtros do LouveApp para ministérios grandes; a grade de um mês de um ministério cabe sem filtro |
| Modo "compacta" | uma densidade só; sem pedido |
| Alocar direto pela grade | o calendário já faz; a grade é leitura |
| Várias ministérios na mesma grade | funções são por ministério; linhas não se alinham |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quem vê o panorama | qualquer membro ativo, dos seus ministérios | mesmo alcance do calendário de `/escalas` | n |
| Datas passadas do mês | aparecem, mas não contam em "vagas abertas" | vaga passada não é acionável (mesma regra do relatório de vagas em `/admin`) | n |
| Nome na célula | primeiro nome + inicial do último sobrenome | a coluna precisa caber em tela de celular | n |
| Plano sem revisão humana | seguir direto para checks e build | usuário pré-aprovou o backlog nesta sessão | y |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `/escalas/panorama` | empty state | AC 6, AC 8 |
| screen `/escalas/panorama` | loading, error | existing - `app/(app)/loading.tsx` e `app/(app)/error.tsx` |
| screen `/escalas/panorama` | unauthorised | AC 7, AC 10 |
| screen `/escalas/panorama` | density and ordering | AC 1, AC 2, AC 4 |
| screen `/escalas/panorama` | destructive action confirms | n/a - tela só de leitura |

## Sources

- `docs/discovery/2026-09-21-louveapp.md` §4 e §9 - grade função × data; "só uma view dos dados que já temos"
