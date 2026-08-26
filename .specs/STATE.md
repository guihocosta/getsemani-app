# Project State

## Decisions

### AD-001 — Capacitação é vínculo pessoa↔função, no módulo `ministries`

**Data**: 2026-08-26
**Contexto**: "Vagas para cada pessoa" foi esclarecido como lista de funções que cada pessoa é capacitada a realizar.
**Decisão**: novo modelo `UserSkill (userId, roleId)` unique, dono no módulo `ministries` (a função pertence ao ministério). `scheduling` e as páginas leem via função de serviço, nunca por acesso cruzado à tabela.
**Consequência**: `/vagas`, lista de candidatos e a repetição de escalação passam a depender de uma leitura do módulo `ministries`.

### AD-002 — Capacitação orienta, não bloqueia

**Data**: 2026-08-26
**Decisão**: capacitação ordena e sinaliza (selo "não capacitado"), mas o líder continua podendo alocar qualquer membro ativo. Em `/vagas` nada é escondido: duas seções, "Pra você" e "Outras vagas".
**Motivo**: líder mantém a palavra final; ninguém fica travado por dado desatualizado.

### AD-003 — Rodízio conta ocorrências, não semanas de calendário

**Data**: 2026-08-26
**Contexto**: o pedido original era "repetir conforme 1º domingo, 2º domingo".
**Decisão**: `Schedule.rotationCycle` guarda o ciclo em número de ocorrências (1..12). O emparelhamento é `alvo[i] ← origem[i - N]` sobre as ocorrências ACTIVE ordenadas.
**Motivo**: mês de 5 domingos, feriado pulado e ocorrência cancelada quebrariam a regra por posição no mês; por ocorrência, não quebram.
**Alternativa descartada**: `FREQ=MONTHLY;BYDAY=1SU` via RRULE — resolve a recorrência, não a repetição de pessoas, que era o objetivo real.

### AD-004 — Repetição é comando explícito do líder, uma escala por vez

**Data**: 2026-08-26
**Decisão**: item "Repetir escalação" no `OccurrenceMenu`, repetindo apenas o próximo ciclo. Sem gatilho automático no cron.
**Motivo**: escala preenchida sozinha é imprevisível para o líder. Alocações entram como `PENDING` com notificação, então a pessoa pode recusar.

### AD-005 — Ordem de entrega das três features

**Data**: 2026-08-26
**Decisão**: `capacitacoes` → `cancelar-vaga-vazia` → `repetir-escalacao`.
**Motivo**: `repetir-escalacao` consome `capableUserIdsForRole` para pular quem perdeu a capacitação. `cancelar-vaga-vazia` é independente e entra no meio por ser barata.

---

## Handoff

**Última sessão**: 2026-08-26
**Branch**: `feat/capacitacao-vaga-rodizio`
**Estado**: `capacitacoes` e `cancelar-vaga-vazia` concluídas e validadas (Verifier PASS nas duas). Commits atômicos na branch, hook `commit-msg` local ativo. Nenhum `git push`.

**Artefatos**:

- `.specs/features/capacitacoes/` — spec + design (+ addendum de T13) + tasks (13/13 done) + validation.md (PASS, 21/21 ACs, 0 mutantes sobreviventes) — **Done**
- `.specs/features/cancelar-vaga-vazia/` — spec (VAGA-01) + validation.md (PASS, 5/5 ACs por inspeção) — **Done**
- `.specs/features/repetir-escalacao/` — spec + design + tasks (9 tarefas, 3 fases) — **não iniciada**, depende de `capableUserIdsForRole` (já existe, de `capacitacoes`)

**Gap descoberto na execução de `capacitacoes`**: T13 original assumia capacidade por vaga, mas `getOccurrenceCandidatesAction` cacheia candidatos por ocorrência (várias funções). Corrigido com `capableUserIdsByRole` + `markCapable` client-side — ver Addendum em `design.md`. Vale reler antes de desenhar `repetir-escalacao`, que toca a mesma área (candidatos/alocação por função).

**Próximo passo**: Execute de `repetir-escalacao`, começando por T1 (campo `rotationCycle` na `Schedule` + migration).
