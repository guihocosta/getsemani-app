# Sugestão automática de escalação

## Problem

Para preencher uma data, o líder abre vaga por vaga, lê a lista de candidatos e escolhe à mão
(`SlotDetailSheet`). A lista já vem ordenada por capacitação e carga (`buildCandidateList`), mas a
decisão continua manual em cada vaga, e "Repetir escalação" só ajuda quem tem ciclo de rodízio e uma
escalação anterior para copiar (`repeatSchedule`). Data nova, ou ministério sem rodízio, é sempre do
zero. A fonte (`docs/discovery/2026-09-21-louveapp.md` §3 e §9) não traz número; lista "Preencher
auto" e põe a ressalva: heurística determinística, nunca IA paga.

Quando isto sair: o líder toca em "Sugerir escalação" numa data e as vagas abertas são preenchidas
com quem está disponível, é capacitado e tem menos escalas no período, cada pessoa no máximo uma vez
na data. Quem foi escalado entra como pendente, igual à alocação manual.

## Flow

Reusa as mesmas fontes da lista de candidatos manual - `loadByPerson` (carga), `usersUnavailableAt`
(indisponibilidade), `capableUserIdsForRole` (capacitação) - e o mesmo desfecho da alocação manual:
alocação `PENDING` + `notifyIfPublished`.

1. líder abre o menu da data -> `OccurrenceMenu` (exists) -> action em `escalas/actions.ts` (exists)
2. `scheduling` services (exists) - `requireLeaderOf`, carrega a ocorrência, vagas e alocações
3. `identity` services (exists) dá os membros ativos; `reports` services (exists) dão carga e faltas; `availability` services (exists) dão indisponíveis; `ministries` services (exists) dão capacitados por função
4. `scheduling` domain (new, no door - placement per conventions) - decide, sem tocar banco, quem vai em cada vaga aberta
5. `scheduling` services (exists) gravam as alocações `PENDING`; `notifyIfPublished` (exists) avisa se a data está publicada
6. out: `OccurrenceRow` (exists) mostra "N vagas preenchidas, M sem candidato" e recarrega

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: `sugestão` - preenchimento das vagas abertas de uma data por regra fixa; vive em `scheduling/domain` |
| domain | existing term: "capacitação orienta, não bloqueia" (AD-002) continua valendo para a escolha manual; na sugestão, função com capacitação declarada só recebe capacitado - mesma regra que `repeatSchedule` já aplica |
| code | `ActionCode` ganha `OCCURRENCE_PAST` |
| stored data | nothing to migrate - grava `Allocation` com as colunas que já existem |

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside; Server Action só deste repo

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| None | - | - |

- Nothing else in this change is hard to reverse: a regra de escolha é uma função pura, trocável sem migração

## Criteria

### S1: Regra de escolha (P1)

Função pura: dadas as vagas abertas e os candidatos, devolve quem vai onde.

**Acceptance Criteria**

1. The system SHALL escolher, para cada vaga, o candidato elegível de menor carga; no empate, o de menos faltas; no empate, o de menor `userId`
2. The system SHALL considerar inelegível quem está indisponível na data
3. WHILE a função da vaga tem capacitação declarada, só quem está na lista de capacitados SHALL ser elegível; sem declaração (`null`), todo membro SHALL ser elegível
4. The system SHALL usar cada pessoa no máximo uma vez por data, contando quem já estava alocado antes da sugestão
5. The system SHALL preencher primeiro a vaga com menos candidatos elegíveis, mantendo a ordem original no empate
6. IF nenhuma pessoa é elegível para uma vaga THEN a vaga SHALL ficar de fora das escolhas e entrar na contagem "sem candidato"

**Independent test:** três vagas, um único baterista capacitado que também canta: a bateria fica com ele e o vocal com a segunda pessoa de menor carga.

### S2: Comando do líder (P1)

**Acceptance Criteria**

7. WHEN o líder aciona a sugestão THEN o sistema SHALL criar uma alocação por escolha com `source = LEADER` e `status = PENDING`, só em vagas ativas e sem alocação
8. WHEN a data está publicada THEN o sistema SHALL notificar cada escalado com `dedupeKey = assign:<allocationId>`; em rascunho, SHALL não notificar
9. IF quem aciona não lidera o ministério da data THEN o sistema SHALL falhar com `FORBIDDEN` sem gravar
10. IF a data já passou THEN o sistema SHALL falhar com `OCCURRENCE_PAST` sem gravar
11. IF uma vaga é preenchida por outra pessoa durante a sugestão (`P2002`) THEN o sistema SHALL contar a vaga como não preenchida e seguir com as demais
12. The system SHALL medir a carga na janela de 30 dias antes a 30 dias depois da data, no ministério da data, e as faltas nos 30 dias encerrados antes de hoje

**Independent test:** numa data futura com três vagas abertas, tocar em "Sugerir escalação" e ver as três preenchidas como "aguardando confirmação".

### S3: Retorno na tela (P2)

**Acceptance Criteria**

13. WHEN a sugestão termina THEN `OccurrenceRow` SHALL mostrar "N vaga(s) preenchida(s), M sem candidato" e recarregar a data quando N > 0
14. WHEN o líder aciona "Sugerir escalação" THEN `OccurrenceRow` SHALL pedir confirmação dizendo se os escalados serão avisados agora (publicada) ou só ao publicar (rascunho)

**Independent test:** tocar em "Sugerir escalação", confirmar e ler a contagem.

### S4: Correções da verificação, rodada 1 (P1)

**Acceptance Criteria**

15. The system SHALL recontar os elegíveis de cada vaga restante depois de cada escolha, sem contar quem já foi usado, antes de decidir qual vaga preencher em seguida
16. IF a data está cancelada THEN o sistema SHALL falhar com `OCCURRENCE_CANCELLED` sem gravar nem notificar
17. WHEN a data não tem vaga aberta THEN `OccurrenceRow` SHALL mostrar "Nenhuma vaga aberta nesta data."

**Independent test:** Vocal {a,b}, Violão {b,c}, Teclado {a,c}: as três vagas saem preenchidas.

## Out of scope

| Excluded | Why |
| --- | --- |
| Sugerir para o mês inteiro de uma vez | uma data por vez mantém o líder no controle (mesma linha de AD-004); a janela de carga já espalha as pessoas entre datas |
| Pré-visualizar e editar antes de gravar | a alocação entra como pendente e o líder troca qualquer vaga depois, como já faz |
| Preencher músicas automaticamente | item separado da triagem ("N menos tocadas"); não pedido nesta seleção |
| Sugerir convidado sem conta | convidado não tem carga, indisponibilidade nem capacitação |
| IA / modelo pago | vetado na triagem: heurística determinística |
| Garantia de preenchimento máximo (emparelhamento ótimo) | a regra é gulosa com recontagem (AC 15): resolve os casos comuns, mas não prova o máximo em todo arranjo de capacitações; o líder completa à mão |
| Lembrar quem recusou a data | recusar apaga a alocação (`respondAllocation.ts`), sem registro; a sugestão pode escolher a mesma pessoa de novo. Guardar a recusa pede coluna nova e decisão de produto |
| Distinguir "perdida em corrida" de "sem candidato" na mensagem | AC 11 conta as duas como não preenchidas; corrida entre dois líderes na mesma data é rara |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Capacitação na sugestão | bloqueia quando declarada na função | automático não deve pôr não capacitado; manual continua livre (AD-002) | n |
| Critério de desempate | carga, depois faltas, depois `userId` | determinístico e explicável; usuário pediu peso de faltas | n |
| Janela de carga | 30 dias antes a 30 depois da data | conta escalas futuras já marcadas, então sugerir datas seguidas não repete a mesma pessoa | n |
| Mesma pessoa em duas vagas da data | não | uma pessoa, uma função por data | n |
| Plano sem revisão humana | seguir direto para checks e build | usuário pré-aprovou o backlog nesta sessão | y |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `OccurrenceRow` (sugerir) | empty state | AC 6, AC 13 - "0 vagas preenchidas, M sem candidato" |
| screen `OccurrenceRow` (sugerir) | loading | existing - `pending` de `useTransition` desabilita o menu |
| screen `OccurrenceRow` (sugerir) | error state | AC 9, AC 10 |
| screen `OccurrenceRow` (sugerir) | unauthorised | AC 9 |
| screen `OccurrenceRow` (sugerir) | destructive action confirms | AC 14 |

## Sources

- `docs/discovery/2026-09-21-louveapp.md` §9 - "Sugestão automática de escalação: heurística determinística (rodízio por menor nº de escalações + respeita indisponibilidade + capacitação), nunca IA paga"
- `.specs/STATE.md` AD-002, AD-004, AD-006 - capacitação, comando explícito, rascunho silencioso
