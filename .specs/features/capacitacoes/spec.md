# Capacitações por pessoa — Specification

## Problem Statement

Hoje a tela `/vagas` mostra toda vaga livre dos ministérios do voluntário, sem distinguir o que ele
sabe fazer. Quem serve só em Projeção vê vagas de Som e Stories misturadas, e o líder monta a lista
de candidatos sem nenhum sinal de quem é capacitado naquela função. Falta registrar, por pessoa,
quais funções ela é capacitada a realizar.

## Goals

- [ ] Cada pessoa tem uma lista de funções (`Role`) que é capacitada a realizar, editável por ela mesma e pelo líder do ministério.
- [ ] A tela `/vagas` separa as vagas em "Pra você" (funções capacitadas) e "Outras vagas", sem esconder nada.
- [ ] Ao alocar alguém, o líder vê os capacitados primeiro e um selo "não capacitado" nos demais.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Bloquear alocação de não capacitado | Decisão do usuário: capacitação orienta, não trava. Líder mantém a palavra final. |
| Níveis de capacitação (iniciante/pleno) | YAGNI — booleano resolve o problema atual. |
| Capacitação para pessoa sem conta (guest) | `Allocation.guestName` não tem `User`; não há onde pendurar a lista. |
| Aprovação do líder para autodeclaração | Decisão do usuário: pessoa adiciona sozinha; líder corrige depois. |
| Notificação ao ganhar/perder capacitação | Não é evento acionável; polui o push já existente. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Pessoa sem nenhuma capacitação em `/vagas` | Todas as vagas caem em "Outras vagas"; a seção "Pra você" não é renderizada | Nunca deixa a tela vazia para quem ainda não configurou | y |
| Escopo de edição da própria pessoa | Só funções de ministérios onde ela tem `Membership` ACTIVE | Capacitação sem vínculo ativo não gera vaga; evita listar as funções da igreja toda | n |
| Pessoa sai do ministério (membership removida ou PENDING) | Linha de capacitação é preservada, mas ignorada em toda leitura (filtro por membership ACTIVE) | Readmissão restaura o histórico sem retrabalho; consulta continua correta | n |
| Função desativada (`Role.active = false`) | Não é oferecida para novas capacitações e some das listagens; a linha permanece | Espelha o tratamento que `getAvailableRoles` já dá a `Role.active` | n |
| Agrupamento em `/vagas` vale também para pedidos de troca | Sim — troca também tem `Role`, mesma regra | Item de troca sem agrupamento quebraria a leitura da tela | n |
| Onde o líder edita | Dentro de `/admin/ministerios`, em cada card de ministério | Decisão do usuário; é onde as funções do ministério já vivem | y |
| Ordenação dentro de cada seção de `/vagas` | Por data crescente, como hoje | Mantém a heurística atual da tela | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Pessoa declara suas funções ⭐ MVP

**User Story**: Como voluntário, quero marcar quais funções sei fazer para receber vagas relevantes.

**Why P1**: Sem o dado registrado nenhuma das outras histórias existe.

**Acceptance Criteria**:

1. WHEN o voluntário abre `/perfil` THEN o sistema SHALL exibir a seção "Minhas funções" listando todas as funções ativas dos ministérios em que ele tem membership ACTIVE, com as capacitadas marcadas.
2. WHEN o voluntário marca uma função na seção "Minhas funções" THEN o sistema SHALL persistir uma capacitação `(userId, roleId)` e refletir a marcação sem recarregar a página.
3. WHEN o voluntário desmarca uma função THEN o sistema SHALL remover a capacitação `(userId, roleId)` e manter intactas as alocações já existentes daquela pessoa.
4. IF o voluntário tenta gravar capacitação de uma função cujo ministério ele não tem membership ACTIVE THEN o sistema SHALL rejeitar com `FORBIDDEN` e não gravar nada.
5. The system SHALL tratar `(userId, roleId)` como único, de modo que marcar duas vezes a mesma função não crie linha duplicada.
6. WHILE o voluntário não tem nenhuma membership ACTIVE o sistema SHALL exibir na seção "Minhas funções" o texto "Entre em um ministério para escolher suas funções." em vez de uma lista vazia.

**Independent Test**: Logar como voluntário, marcar "Projeção" em `/perfil`, recarregar e ver a marcação persistida.

---

### P1: Líder ajusta a capacitação da equipe ⭐ MVP

**User Story**: Como líder, quero marcar as funções de cada membro do meu ministério para corrigir e completar o que eles declararam.

**Why P1**: Autodeclaração sozinha não é confiável; o líder é quem conhece a equipe.

**Acceptance Criteria**:

1. WHEN o líder abre `/admin/ministerios` THEN o sistema SHALL exibir, em cada ministério que ele lidera, a lista de membros ACTIVE com as funções daquele ministério marcáveis por membro.
2. WHEN o líder marca ou desmarca uma função de um membro THEN o sistema SHALL gravar ou remover a capacitação `(userId, roleId)` daquele membro.
3. IF o líder tenta alterar capacitação de um membro ou de uma função de ministério que ele não lidera THEN o sistema SHALL rejeitar com `FORBIDDEN` e não gravar nada.
4. WHERE o usuário é admin o sistema SHALL permitir a mesma edição em todos os ministérios.
5. The system SHALL listar apenas funções com `Role.active = true` e membros com `Membership.status = ACTIVE`.

**Independent Test**: Logar como líder de Mídia, marcar "Som" para um membro, e ver a marcação ao recarregar.

---

### P1: Vagas separadas por capacitação ⭐ MVP

**User Story**: Como voluntário, quero ver primeiro as vagas das funções que sei fazer para não caçar na lista.

**Why P1**: É o efeito visível que motivou a feature.

**Acceptance Criteria**:

1. WHEN o voluntário abre `/vagas` THEN o sistema SHALL renderizar duas seções, "Pra você" com os itens cuja função ele é capacitado e "Outras vagas" com os demais, nessa ordem.
2. The system SHALL aplicar o mesmo agrupamento a vagas livres e a pedidos de troca, classificando cada item pela função (`Role`) do slot.
3. WHILE o voluntário não é capacitado em nenhuma das funções dos itens listados o sistema SHALL omitir o cabeçalho "Pra você" e renderizar todos os itens sob "Outras vagas".
4. WHILE todos os itens listados são de funções capacitadas o sistema SHALL omitir o cabeçalho "Outras vagas".
5. The system SHALL manter dentro de cada seção a ordenação por data crescente já usada hoje.
6. WHEN não há nenhum item THEN o sistema SHALL exibir o `EmptyState` atual, sem cabeçalho de seção.

**Independent Test**: Com capacitação em "Projeção" e vagas abertas de Projeção e Som, abrir `/vagas` e ver Projeção sob "Pra você".

---

### P2: Capacitação na lista de candidatos do líder

**User Story**: Como líder, quero ver quem é capacitado ao escolher a pessoa de uma vaga, sem perder a liberdade de escalar quem eu quiser.

**Why P2**: Melhora a decisão do líder, mas a feature entrega valor sem isso.

**Acceptance Criteria**:

1. WHEN o líder abre o detalhe de uma vaga para escolher alguém THEN o sistema SHALL ordenar os candidatos com os capacitados naquela função antes dos não capacitados.
2. WHILE um candidato não é capacitado na função da vaga o sistema SHALL exibir ao lado do nome o selo "não capacitado".
3. The system SHALL manter os não capacitados clicáveis e alocáveis, sem bloqueio.
4. The system SHALL preservar, dentro de cada grupo, a ordenação atual por menor carga nos últimos 30 dias.

**Independent Test**: Abrir uma vaga de "Som" com um membro capacitado e outro não; ver o capacitado no topo e o selo no outro.

---

## Edge Cases

- IF a mesma pessoa tem duas memberships no mesmo ministério THEN o sistema SHALL exibi-la uma única vez na lista de membros do líder.
- IF uma função é desativada depois de já ter capacitados THEN o sistema SHALL ocultá-la das listagens sem apagar as capacitações existentes.
- IF um ministério é excluído THEN o sistema SHALL remover em cascata as capacitações das suas funções.
- IF uma pessoa é excluída THEN o sistema SHALL remover em cascata as suas capacitações.
- WHEN o voluntário alterna rapidamente a mesma função duas vezes THEN o sistema SHALL convergir para o último estado clicado, sem erro de linha duplicada.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CAPA-01 | P1: Pessoa declara suas funções | Verified | Verified |
| CAPA-03 | P1: Líder ajusta a capacitação da equipe | Verified | Verified |
| CAPA-04 | P1: Vagas separadas por capacitação | Verified | Verified |
| CAPA-05 | P2: Capacitação na lista de candidatos do líder | Verified | Verified |

**Coverage:** 4 total, 4 mapeados para tarefas, 0 não mapeados.

**Nota**: a numeração pula de CAPA-01 pra CAPA-03 — um `CAPA-02` órfão (linha duplicada, nunca referenciado em design.md/tasks.md) foi removido durante a validação; ver `validation.md`.

---

## Success Criteria

- [ ] Voluntário com capacitação em 1 função vê essa vaga sob "Pra você" e as demais sob "Outras vagas".
- [ ] Líder consegue marcar função de um membro em menos de 3 toques a partir de `/admin/ministerios`.
- [ ] Nenhuma alocação existente é alterada por marcar ou desmarcar capacitação.
- [ ] Tentativa de editar capacitação fora do escopo retorna erro e não grava.
