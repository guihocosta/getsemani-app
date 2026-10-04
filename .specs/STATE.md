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

**Última sessão**: 2026-10-02
**Branch**: `feat/backlog-louveapp` (a partir de `master` em `0099754`). Nada foi pushado.
**Estado**: backlog LouveApp (`docs/discovery/2026-09-21-louveapp.md`) entregue em 8 features, todas com Verifier independente PASS e `validate_verification.py` exit 0. Suíte: 377 testes, typecheck e lint limpos.

**Artefatos** (`.specs/features/<feature>/` com `plan.md`, `checks.md`, `verification.md`):

| Feature | Checks | Rodadas do Verifier | Migração |
| --- | --- | --- | --- |
| `presenca-faltas` | 12 | 1 | - |
| `rascunho-publicar` | 19 | 2 (rodada 1: troca/confirmação por id furavam o rascunho) | `20261002180000_occurrence_published` |
| `repertorio` | 29 | 3 (módulo desligado ainda aceitava mover/remover; reordenar quebrava com buraco) | `20261002190000_repertoire` |
| `panorama` | 11 | 1 | - |
| `avisos` | 12 | 2 | `20261002200000_announcements` |
| `sugestao-automatica` | 17 | 2 (elegíveis contados uma vez só; data cancelada aceitava sugestão) | - |
| `visao-geral` | 7 | 1 | - |
| `aniversariantes` | 10 | 2 (matriz de capacitação mandava a linha `User` inteira ao client) | `20261002210000_user_birth_date` |

**Bloqueia go-live**: as 4 migrações estão commitadas e NÃO aplicadas (AD-008). `npm run db:deploy` precisa rodar antes de o código subir, senão produção quebra ao ler colunas/tabelas novas. Push e deploy pedem autorização explícita.

**Não verificado**: nenhuma tela foi aberta em navegador nem rodada contra banco real (provas são de unidade com Prisma mockado + grep/typecheck para a ligação com a tela). `npm run build` e `npm run test:e2e` não foram rodados.

**Decisões de produto tomadas sem o usuário** (ver `Assumptions` e `Out of scope` de cada plano; todas com `Confirmed? n`):
- rascunho é por data (`Occurrence.published`), não por série; default publicado
- falta = sem check-in depois que o dia acabou; selo "faltou" só para quem gerencia
- repertório é por ministério, ligado pelo admin; classificação é texto livre; uma classificação por música
- sugestão: capacitação declarada bloqueia; regra gulosa com recontagem (não garante preenchimento máximo: ~1-3% dos arranjos deixam vaga vazia com solução existente); quem recusou pode ser sugerido de novo
- aniversário: só dia e mês aparecem para quem divide ministério; campo opcional
- avisos são por ministério; não há aviso para a igreja inteira

**Seguimentos sugeridos**: emparelhamento máximo na sugestão; guardar recusa de escala; líder marcar presença manualmente; série que já nasce em rascunho; itens do discovery fora desta seleção (roteiro do culto, equipes, metrônomo, lixeira).

**Próximo passo**: usuário revisa o diff e as decisões acima, autoriza `db:deploy` e depois push/PR.
