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

### AD-006 — Ocorrência em rascunho: toda leitura e ação de voluntário filtra `published`

**Data**: 2026-10-02
**Decisão**: `Occurrence.published` (default `true`). Rascunho só aparece para quem gerencia o ministério e não notifica. Toda consulta nova que mostre ocorrência, vaga ou alocação a quem não gerencia filtra `published: true`; todo serviço novo que aceite id de vaga/alocação vindo do voluntário rejeita com `NOT_PUBLISHED`; notificação nova em `scheduling` passa por `notifyIfPublished`.
**Motivo**: a rodada 1 do Verifier de `rascunho-publicar` achou vazamento exatamente nos serviços que não estavam na lista (troca, confirmação, check-in). A regra vale para as próximas features (panorama, dashboard, sugestão automática).

### AD-007 — Módulo opcional por ministério é um booleano em `Ministry`

**Data**: 2026-10-02
**Decisão**: `Ministry.repertoireEnabled` (default `false`), ligado pelo admin. Serviço do módulo checa com `assertRepertoireEnabled`; desligar preserva os dados e bloqueia o acesso. Próximo módulo opcional segue o mesmo formato até existir motivo para uma tabela genérica.
**Motivo**: só existe um módulo opcional; tabela `MinistryModule` seria estrutura sem segundo uso.

### AD-008 — Migração é commitada, não aplicada, pelas features

**Data**: 2026-10-02
**Decisão**: o SQL sai de `prisma migrate diff --from-schema-datamodel <schema anterior> --to-schema-datamodel prisma/schema.prisma --script` (não precisa de banco) e é commitado em `prisma/migrations/`. Aplicar (`npm run db:deploy`) é ação separada, com autorização explícita, e precisa acontecer antes do deploy do código.
**Motivo**: `DATABASE_URL` aponta para o banco real; mudança em produção não é coberta pela aprovação do plano.

---

## Handoff

**Última sessão**: 2026-08-26
**Branch**: `feat/capacitacao-vaga-rodizio`
**Estado**: as 3 features do pedido original estão concluídas e validadas (Verifier PASS nas 3). Nada foi pushado — tudo local na branch `feat/capacitacao-vaga-rodizio`, hook `commit-msg` ativo.

**Artefatos**:

- `.specs/features/capacitacoes/` — spec + design (+ addendum de T13) + tasks (13/13) + validation.md (PASS, 21/21 ACs, 0 mutantes sobreviventes) — **Done**
- `.specs/features/cancelar-vaga-vazia/` — spec (VAGA-01) + validation.md (PASS, 5/5 ACs por inspeção) — **Done**
- `.specs/features/repetir-escalacao/` — spec + design + tasks (9/9) + validation.md (PASS, 18/18 ACs após 1 rodada de fix→re-verify) — **Done**

**Gaps reais corrigidos durante Execute** (ambos com fix→re-verify, Verifier confirmou PASS depois):
- `capacitacoes` T13: design original assumia capacidade por vaga, mas `getOccurrenceCandidatesAction` cacheia candidatos por ocorrência (várias funções). Corrigido com `capableUserIdsByRole` + `markCapable` client-side — ver Addendum em `capacitacoes/design.md`.
- `repetir-escalacao`: (1) mutante sobrevivente em `decideCopyAllocation` — faltava teste de precedência membership-antes-de-capacitação (código já estava certo, só o teste faltava); (2) gap funcional — função sem ninguém capacitado bloqueava 100% das cópias, contradizendo AD-002; corrigido em `repeatSchedule.ts` (capacidade só bloqueia se alguém já foi marcado capaz).

**Próximo passo**: nada pendente do pedido original. Falta decidir com o usuário: revisar o diff, abrir PR, ou dar `git push` (nenhum feito ainda — exige autorização explícita separada da aprovação do Execute).
