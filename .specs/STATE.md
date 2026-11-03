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

### AD-009 — Layout web começa em `lg` (1024 px); abaixo dele, nada muda

**Data**: 2026-10-30
**Contexto**: discovery `docs/discovery/2026-10-30-responsividade-web.md`. Perguntas: público, escopo, larguras e navegação. Respostas: "Líderes e admins", "Shell + telas densas", "Celular e desktop 1024+", "Sidebar com tudo".
**Decisão**: a web atende líderes e admins. A partir de 1024 px entra a navegação lateral com todos os destinos e as telas densas usam a largura; formulários seguem em coluna. Abaixo de 1024 px, tablet incluso, o layout continua o do celular. Tela nova escreve primeiro o layout de celular e só depois as variantes `lg:`.
**Motivo**: o uso diário segue no celular (constituição, princípio VI), e um único ponto de corte evita um terceiro layout para testar em cada tela.

### AD-010 — Tema escuro por padrão; claro continua no perfil

**Data**: 2026-10-30
**Contexto**: pergunta: "O manual pede fundo grafite em tudo [...] Qual o tema padrão do app?". Opção escolhida: "Escuro por padrão". A recomendação era seguir o celular.
**Decisão**: sem `theme` salvo, o app abre em grafite. O tema claro segue disponível no botão de `/perfil`, em desvio aprovado do "nunca branco" do manual.
**Consequência**: tela nova é conferida primeiro no escuro, sem deixar o claro quebrar.

### AD-011 — App usa só Gotham até existir licença web da Monument Extended

**Data**: 2026-10-30
**Contexto**: o arquivo disponível é "Free for Personal Use" e a licença proíbe redistribuir; o app web entregaria a fonte a todo visitante. Opção escolhida: "Só Gotham por ora".
**Decisão**: nenhum arquivo de Monument em `public/`; títulos seguem em Gotham, caixa normal.
**Consequência**: com a licença comercial/web da Pangram Pangram, a mudança é um `@font-face` e `--font-title`.

### AD-012 — Grão e brilho no pé só no login

**Data**: 2026-10-30
**Contexto**: opção aprovada "Login com assinatura": "Só no login: grão nas telas de uso pesa e atrapalha a leitura."
**Decisão**: a textura da marca fica em `/login`. Telas de uso não recebem grão nem brilho.

### AD-013 — Mudança de horário funde com duplicata vazia no mesmo instante

**Data**: 2026-11-03
**Contexto**: o bug de editar horário criou ocorrências vazias ao lado das antigas. Pergunta: "Se o novo horário cair numa data que já tem outra ocorrência da mesma escala nesse horário [...] o que acontece?". Opção escolhida: "Junta se a outra estiver vazia (Recomendado)".
**Decisão**: a ocorrência que ocupa o instante novo é apagada quando não tem `Allocation` nem `OccurrenceSong`; com pessoa ou música, a mudança inteira é recusada. Duplicatas antigas não são limpas em lote ("Só impedir novas").
**Consequência**: `Occurrence.date` passa a mudar depois de criado; leitura nova de ocorrência não pode guardar `date` como chave estável fora do `id`.

### AD-014 — Materialização compara ocorrências por dia local

**Data**: 2026-11-03
**Contexto**: o Verifier de `horario-em-lote` mostrou que "Só esta data" (modelo fica no horário antigo) e "Esta e as próximas" a partir de uma data posterior (datas anteriores ficam no horário antigo) deixavam o instante da recorrência vazio, e a materialização recriava a data vazia no mesmo dia.
**Decisão**: `materializeOccurrences` cria só a data cujo dia local (`APP_TZ`) não tem ocorrência da escala, em qualquer horário (`missingDays`). Vale porque `buildRRule` só gera `WEEKLY` e `MONTHLY`: no máximo uma data por dia por escala.
**Consequência**: uma recorrência com mais de uma data no mesmo dia (ex.: `HOURLY`, ou dois horários por dia) exige outra chave antes de existir. Duplicatas antigas do bug deixam de crescer.

---

## Handoff

**Horário em lote (2026-11-03)**: branch `feat/horario-em-lote`, gate verde em `62fc631` (31 provas, 3 mutações mortas), sem migração. Lições renumeradas para L-029, L-030, L-031, L-032, L-033, L-034 no merge com master. Ver `.specs/features/horario-em-lote/`.

**Identidade de marca (2026-11-01)**: branch `feat/identidade-marca`, gate verde, nada pushado, sem migração. Ver `.specs/features/identidade-marca/`. Em Windows, `check_proofs.py` só roda com adaptação de `npx` e sinais POSIX fora do repo.

**Responsividade web (2026-10-30)**: branch `feat/responsividade-web`, gate verde em `76d2412`, nada pushado, sem migração. Ver `.specs/features/responsividade-web/`.

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
