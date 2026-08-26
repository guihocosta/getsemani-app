# Repetir escalação por rodízio — Specification

## Problem Statement

O líder remonta a mesma escalação toda semana no braço. Na prática a equipe já roda em ciclo: quem
serve numa ocorrência volta N ocorrências depois. Hoje não existe nada que aproveite isso — cada
ocorrência materializada nasce vazia e o líder repete o trabalho manualmente.

## Goals

- [ ] Cada escala guarda um ciclo de rodízio (em número de ocorrências) definido pelo líder.
- [ ] Um comando repete a escalação do ciclo anterior no próximo ciclo, em um toque.
- [ ] A repetição nunca sobrescreve trabalho existente nem escala quem não pode.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Repetição automática no cron | Decisão do usuário: gatilho é botão do líder. Escala preenchida sozinha é imprevisível. |
| Botão que repete todos os ministérios de uma vez | Decisão do usuário: uma escala por vez, para o líder ver o que muda. |
| Repetir mais de um ciclo à frente | Decisão do usuário: só o próximo ciclo; o líder clica de novo quando quiser mais. |
| Regra por "Nº domingo do mês" via RRULE | O rodízio por N ocorrências cobre o caso e não quebra em mês de 5 domingos. |
| Editar a recorrência de uma escala existente | Continua bloqueado como hoje; é outra feature. |
| Desfazer a repetição em lote | Líder remove alocação a alocação, como já faz hoje. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Unidade do ciclo | Número de ocorrências da própria escala, não semanas de calendário | Imune a mês de 5 domingos e a feriado pulado; é a lista que o líder enxerga | y |
| Onde o ciclo é configurado | Campo `rotationCycle` na `Schedule`, editável na criação e na edição da escala | Decisão do usuário ("fixo na escala") | y |
| Escala sem ciclo definido | `rotationCycle` nulo; o comando de repetir fica desabilitado com a dica "Defina o ciclo de rodízio ao editar a escala" | Repetir sem ciclo não tem significado definido | n |
| Onde fica o comando | Item "Repetir escalação" no `OccurrenceMenu` de qualquer ocorrência da escala | O menu já carrega `scheduleId` e já é o lugar das ações de série | n |
| Ocorrências consideradas | Só `Occurrence.status = ACTIVE`, ordenadas por data crescente; canceladas não entram na contagem do ciclo | Ocorrência cancelada não tem escalação a copiar nem vaga a preencher | n |
| Status da alocação criada | `PENDING`, `source = LEADER`, com notificação ASSIGNMENT | Decisão do usuário; idêntico a alocar pelo líder, então a pessoa pode recusar | y |
| Alocação de pessoa sem conta (guest) | Copiada como está, `PENDING`, sem notificação | Espelha `allocateGuest`; guest não tem push nem indisponibilidade a checar | n |
| Dependência de capacitação | Só bloqueia quando **alguém** já foi marcado capaz naquela função e a pessoa da origem não está nesse grupo. Função sem nenhuma capacitação declarada (ninguém configurou ainda) não bloqueia ninguém | Resolvido durante a validação (Verifier, gap REPT-04.4): a leitura literal — bloquear sempre que a origem não está no `Set` de capacitados — bloquearia 100% das cópias em qualquer função que ninguém tenha configurado em `/perfil`, contradizendo AD-002 ("capacitação orienta, não trava"). "WHERE a capacitação... existe" (EARS optional-feature) é lido por função: só existe quando alguém a declarou | y (ajustado na implementação) |
| Limite superior do ciclo | 1 a 12 ocorrências | Ciclo maior que 12 ultrapassa a janela de 90 dias de materialização e nunca teria origem | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Definir o ciclo de rodízio da escala ⭐ MVP

**User Story**: Como líder, quero registrar de quantas em quantas ocorrências minha equipe se repete para o app saber o que copiar.

**Why P1**: Sem o ciclo o comando de repetir não tem entrada.

**Acceptance Criteria**:

1. WHEN o líder cria ou edita uma escala THEN o sistema SHALL exibir o campo "Ciclo de rodízio" com as opções de 1 a 12 ocorrências e a opção "Sem rodízio".
2. WHEN o líder salva a escala com um ciclo escolhido THEN o sistema SHALL persistir o valor em `Schedule.rotationCycle`.
3. WHEN o líder salva a escala com "Sem rodízio" THEN o sistema SHALL persistir `Schedule.rotationCycle` como nulo.
4. IF o valor enviado está fora do intervalo de 1 a 12 THEN o sistema SHALL rejeitar o salvamento com a mensagem "Ciclo de rodízio deve ser entre 1 e 12." e não gravar.
5. The system SHALL manter `rotationCycle` nulo em toda escala já existente, sem alterar o comportamento atual dessas escalas.

**Independent Test**: Editar uma escala, escolher ciclo 4, salvar, reabrir a edição e ver 4 selecionado.

---

### P1: Repetir a escalação no próximo ciclo ⭐ MVP

**User Story**: Como líder, quero repetir a escalação do ciclo anterior nas próximas N ocorrências para não remontar a escala do zero.

**Why P1**: É a feature inteira.

**Acceptance Criteria**:

1. WHEN o líder aciona "Repetir escalação" numa escala com `rotationCycle = N` THEN o sistema SHALL tomar como destino as N primeiras ocorrências ACTIVE da escala com data futura, na ordem cronológica.
2. The system SHALL usar como origem de cada ocorrência de destino a ocorrência ACTIVE da mesma escala que está N posições antes dela na ordem cronológica.
3. WHEN uma vaga da ocorrência de destino está ativa e vazia e a vaga de mesma função na origem tem alguém alocado THEN o sistema SHALL criar uma alocação para essa mesma pessoa com `status = PENDING` e `source = LEADER`.
4. WHEN o sistema cria uma alocação para uma pessoa com conta THEN o sistema SHALL enviar a ela uma notificação ASSIGNMENT, no mesmo formato de `allocateVolunteer`.
5. WHEN a repetição termina THEN o sistema SHALL retornar e exibir quantas vagas foram preenchidas e quantas foram puladas.
6. WHILE `Schedule.rotationCycle` é nulo o sistema SHALL exibir "Repetir escalação" desabilitado, com a dica "Defina o ciclo de rodízio ao editar a escala".
7. IF o usuário não é líder do ministério da escala THEN o sistema SHALL rejeitar com `FORBIDDEN` e não criar nenhuma alocação.
8. WHEN o líder aciona "Repetir escalação" duas vezes seguidas sem outra alteração THEN o sistema SHALL não criar nenhuma alocação na segunda vez e reportar zero vagas preenchidas.

**Independent Test**: Numa escala semanal com ciclo 2 e as duas ocorrências passadas escaladas, acionar "Repetir escalação" e ver as duas próximas ocorrências preenchidas com as mesmas pessoas, em PENDING.

---

### P1: Pular quem não pode servir ⭐ MVP

**User Story**: Como líder, quero que a repetição pule automaticamente quem não pode para não gerar escala inválida.

**Why P1**: Copiar cego produziria escalas erradas e notificação indevida.

**Acceptance Criteria**:

1. IF a pessoa da origem tem indisponibilidade que conflita com a data de destino THEN o sistema SHALL deixar a vaga vazia e contá-la como pulada.
2. IF a vaga de destino já tem alguém alocado THEN o sistema SHALL manter a alocação existente intacta e contar a vaga como pulada.
3. IF a pessoa da origem não tem mais `Membership` ACTIVE no ministério da escala THEN o sistema SHALL deixar a vaga vazia e contá-la como pulada.
4. WHERE a capacitação por função existe, IF a pessoa da origem não é capacitada na função da vaga THEN o sistema SHALL deixar a vaga vazia e contá-la como pulada.
5. IF a vaga de destino está inativa (`Slot.active = false`) THEN o sistema SHALL ignorá-la sem criar alocação.
6. IF não existe vaga da mesma função na ocorrência de destino THEN o sistema SHALL ignorar aquela alocação de origem sem criar vaga nova.
7. The system SHALL deixar toda vaga pulada disponível em `/vagas`, como qualquer vaga livre.

**Independent Test**: Marcar indisponibilidade de um voluntário na data de destino, repetir a escalação e ver a vaga dele continuar vazia enquanto as demais são preenchidas.

---

## Edge Cases

- IF a escala não tem N ocorrências futuras THEN o sistema SHALL processar apenas as que existem, sem erro.
- IF uma ocorrência de destino não tem origem correspondente (a escala é mais nova que N ocorrências) THEN o sistema SHALL ignorá-la e contá-la como pulada.
- IF todas as ocorrências de origem estão vazias THEN o sistema SHALL reportar zero vagas preenchidas.
- IF uma alocação de origem é de pessoa sem conta THEN o sistema SHALL copiar o `guestName` com `status = PENDING` e não enviar notificação.
- WHEN alguém preenche uma vaga de destino durante a execução THEN o sistema SHALL tratar o conflito de unicidade de `slotId` como vaga pulada, sem abortar a repetição inteira.
- IF a origem tem duas ocorrências no mesmo dia THEN o sistema SHALL desempatar pela ordem de `id`, mantendo a correspondência estável entre execuções.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| REPT-01 | P1: Definir o ciclo de rodízio da escala | Design | Pending |
| REPT-02 | P1: Repetir a escalação no próximo ciclo | Design | Pending |
| REPT-03 | P1: Repetir a escalação no próximo ciclo | Design | Pending |
| REPT-04 | P1: Pular quem não pode servir | Design | Pending |
| REPT-05 | P1: Pular quem não pode servir | Design | Pending |

**Coverage:** 5 total, 0 mapeados para tarefas, 5 não mapeados.

---

## Success Criteria

- [ ] Líder repete a escalação de um ciclo em um toque a partir do menu da ocorrência.
- [ ] Nenhuma alocação existente é sobrescrita pela repetição.
- [ ] Ninguém indisponível, fora do ministério ou sem capacitação é escalado pela repetição.
- [ ] Repetir duas vezes seguidas não duplica nem altera nada.
