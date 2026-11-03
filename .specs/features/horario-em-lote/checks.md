# Horário em lote checks

Mutations: 3
Build: `npm run typecheck`; `npm run lint`
Plan: `.specs/features/horario-em-lote/plan.md`

27 checks in 3 slices · 3 one-way doors · 0 open

## Checks

### S1 - Mudar o horário

**C1** - [x] `retimeInstant(2026-10-18T21:00Z, "18:30")` devolve `2026-10-18T21:30:00Z` e `retimeInstant(2026-10-18T21:00Z, "00:30")` devolve `2026-10-18T03:30:00Z` (mesmo dia local) (AC 1)
Proof: `npx vitest run tests/unit/retime.test.ts -t "mesmo dia local"`

**C2** - [x] `planRetime` em `SINGLE` com datas 18/10, 25/10 e 01/11 às 18:00, escolhendo 25/10 e "18:30", move só 25/10 para `2026-10-25T21:30:00Z`, sem apagar nada e com `startTime` `null` (AC 1)
Proof: `npx vitest run tests/unit/retime.test.ts -t "so esta data"`

**C3** - [x] `planRetime` em `FROM_HERE` com 18/10, 25/10 e 01/11 cancelada, escolhendo 25/10, move 25/10 e 01/11, deixa 18/10 e devolve `startTime: "18:30"` (AC 2)
Proof: `npx vitest run tests/unit/retime.test.ts -t "esta e as proximas"`

**C4** - [x] `planRetime` em `FROM_HERE` escolhendo 11/10 com agora em 15/10 15:00 move 15/10 18:00 e 18/10 e deixa 11/10 como está (AC 8)
Proof: `npx vitest run tests/unit/retime.test.ts -t "datas passadas ficam"`

**C5** - [x] `planRetime` em `SINGLE` numa data anterior a agora devolve o erro `DATA_PASSADA` sem movimentos (AC 8)
Proof: `npx vitest run tests/unit/retime.test.ts -t "data passada recusa"`

**C6** - [x] `planRetime` com o horário igual ao atual devolve 0 movimentos e 0 exclusões, em `SINGLE` e em `FROM_HERE` (AC 4)
Proof: `npx vitest run tests/unit/retime.test.ts -t "mesmo horario nao muda"`

**C7** - [x] `planRetime` quando o instante novo é de outra ocorrência da escala sem pessoa e sem música apaga essa outra e move a escolhida, também quando a outra é uma das datas de `FROM_HERE` (AC 5)
Proof: `npx vitest run tests/unit/retime.test.ts -t "funde com duplicata vazia"`

**C8** - [x] `planRetime` devolve `conflito` com o instante ocupado e nenhum movimento quando a outra tem 1 pessoa, quando tem só música, e em `FROM_HERE` com 1 conflito em 3 datas (AC 6)
Proof: `npx vitest run tests/unit/retime.test.ts -t "recusa duplicata com conteudo"`

**C9** - [x] `parseTime` aceita `00:00` e `23:59` e recusa `24:00`, `23:60`, `9:00`, `ab` e vazio (AC 9)
Proof: `npx vitest run tests/unit/retime.test.ts -t "horario valido"`

**C10** - [x] `retimeOccurrence` em `SINGLE` grava numa transação `occurrence.update` com `data` igual a `{ date }` e não chama `schedule.update` (AC 1)
Proof: `npx vitest run tests/unit/retimeOccurrence.test.ts -t "so esta data grava a data"`

**C11** - [x] `retimeOccurrence` em `FROM_HERE` grava `schedule.update` com `data: { startTime: "18:30" }` e apaga a duplicata vazia antes de mover (AC 2, AC 5)
Proof: `npx vitest run tests/unit/retimeOccurrence.test.ts -t "proximas grava o modelo"`

**C12** - [x] `retimeOccurrence` com conflito lança `HorarioOcupado` com o instante e não grava nada (AC 6)
Proof: `npx vitest run tests/unit/retimeOccurrence.test.ts -t "conflito nao grava"`

**C13** - [x] `retimeOccurrence` quando `occurrence.update` rejeita com `P2002` lança `HorarioOcupado`, não o erro do Prisma (AC 7)
Proof: `npx vitest run tests/unit/retimeOccurrence.test.ts -t "corrida vira horario ocupado"`

**C14** - [x] `retimeOccurrence` com `requireLeaderOf` lançando `FORBIDDEN` propaga `FORBIDDEN` sem abrir transação (AC 10)
Proof: `npx vitest run tests/unit/retimeOccurrence.test.ts -t "sem permissao"`

**C15** - [x] `updateSchedule` com `startTime` de 18:00 para 18:30 move na mesma transação as 13 datas a partir de agora; com o mesmo `startTime`, não chama `occurrence.update` (AC 3)
Proof: `npx vitest run tests/unit/retimeOccurrence.test.ts -t "editar escala move as datas"`

**C16** - [x] Depois de mover 13 datas semanais de 18:00 para 18:30, `expandOccurrences` com `startTime: "18:30"` na janela de 90 dias devolve exatamente os 13 instantes movidos: a materialização não acha dia faltando (AC 3)
Proof: `npx vitest run tests/unit/retime.test.ts -t "materializacao nao duplica"`

**C17** - [x] `retimeOccurrenceAction` devolve `{ ok: true, moved: 2 }` no sucesso; `FORBIDDEN` vira "Você não tem permissão para essa ação.", `HorarioOcupado(01/11 18:30)` vira "Já existe outra data desta escala em 01/11 às 18:30.", `DATA_PASSADA` vira "Essa data já passou.", `HORARIO_INVALIDO` vira "Informe um horário válido."; erro de redirect é relançado (AC 6, 8, 9, 10)
Proof: `npx vitest run tests/unit/retimeAction.test.ts -t "retimeOccurrenceAction"`

**C18** - [x] `updateScheduleAction` com `updateSchedule` lançando `HorarioOcupado(01/11 18:30)` devolve `{ ok: false, error: "Já existe outra data desta escala em 01/11 às 18:30." }` (AC 6)
Proof: `npx vitest run tests/unit/retimeAction.test.ts -t "editar escala ocupado"`

**C26** - [x] Depois de "Só esta data" em 25/10 (modelo 18:00) e de "Esta e as próximas" a partir de 25/10 (18/10 fica 18:00, modelo 18:30), `missingDays` sobre `expandOccurrences` do modelo resultante devolve `[]`; um dia sem ocorrência continua faltando (AC 1, AC 2; door 3)
Proof: `npx vitest run tests/unit/retime.test.ts -t "dia movido nao volta"`
Proof: `npx vitest run tests/unit/retime.test.ts -t "dia sem data continua faltando"`

**C27** - [x] `materializeOccurrences` com 25/10 já existente às 18:30 e modelo 18:00 cria 0 datas; sem 01/11 no banco cria só `2026-11-01T21:00:00Z` (door 3)
Proof: `npx vitest run tests/unit/materializeOccurrences.test.ts -t "materializa por dia local"`

### S2 - Aviso

**C19** - [x] `retimeNotices` agrupa por pessoa: 1 data "Culto Louvor: 18/10 agora às 18:30."; 2 datas "18/10 e 25/10"; 5 datas "18/10, 25/10, 01/11 e mais 2 datas"; mesma pessoa em 2 vagas da mesma data dá 1 aviso (AC 11)
Proof: `npx vitest run tests/unit/retime.test.ts -t "um aviso por pessoa"`

**C20** - [x] `retimeNotices` ignora data em rascunho, data cancelada e vaga de convidado (`userId` nulo) (AC 12, AC 13)
Proof: `npx vitest run tests/unit/retime.test.ts -t "aviso ignora rascunho e convidado"`

**C21** - [x] `retimeOccurrence` chama `notifyUser` uma vez por pessoa com `type: "ASSIGNMENT"`, `title: "Horário alterado"`, `url: "/"` e `dedupeKey` no formato `retime:<uuid>:<userId>`, o mesmo `<uuid>` para todas no lote (AC 11)
Proof: `npx vitest run tests/unit/retimeOccurrence.test.ts -t "aviso por pessoa"`

**C22** - [x] `retimeOccurrence` com `notifyUser` rejeitando resolve `{ moved: 1 }` e a transação já foi gravada (AC 14)
Proof: `npx vitest run tests/unit/retimeOccurrence.test.ts -t "falha do aviso nao desfaz"`

### S3 - Telas

**C23** - [x] No menu ⋮ da data 01/11 do Culto Louvor o líder vê "Mudar horário"; usá-lo abre uma folha com o horário `18:00` preenchido, "Só esta data" marcado, "Esta e as próximas" e "Salvar" (AC 15)
Proof: `npx playwright test tests/e2e/horario.spec.ts -g "folha de mudar horario"`

**C24** - [x] Na folha, mudar para 19:30 e usar "Salvar" fecha a folha e a data 01/11 mostra "19:30"; com a data 04/10, "Salvar" deixa a folha aberta com "Essa data já passou." (AC 16)
Proof: `npx playwright test tests/e2e/horario.spec.ts -g "salvar mostra horario novo"`
Proof: `npx playwright test tests/e2e/horario.spec.ts -g "erro mantem a folha"`

**C25** - [x] Em "Editar escala" o campo Hora mostra "Muda também as datas já criadas a partir de hoje." (AC 17)
Proof: `npx playwright test tests/e2e/horario.spec.ts -g "aviso no editar"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| escopo (2) | `SINGLE` C2 C10 · `FROM_HERE` C3 C11 | - |
| hora local, AC 1 (2 exemplos) | 18:30 C1 · 00:30 C1 | - |
| status da data em `FROM_HERE` (3) | passada C4 · ativa futura C3 · cancelada futura C3 | - |
| colisão, AC 6 (4 exemplos) | vazia C7 · com pessoa C8 · só música C8 · 1 em 3 C8 | - |
| caminhos que mudam o horário (2) | "Mudar horário" C10 C23 · "Editar escala" C15 C25 | - |
| horário, AC 9 (7 entradas) | C9, table-driven over all 7: `00:00` `23:59` `24:00` `23:60` `9:00` `ab` vazio | - |
| corpo do aviso, AC 11 (4 exemplos) | 1 data C19 · 2 datas C19 · 5 datas C19 · 2 vagas mesma pessoa C19 | - |
| quem não é avisado (3) | rascunho C20 · cancelada C20 · convidado C20 | - |
| `retimeOccurrenceAction` statuses (6) | ok C17 · `FORBIDDEN` C17 · `HORARIO_OCUPADO` C17 · `DATA_PASSADA` C17 · `HORARIO_INVALIDO` C17 · 303 redirect C17 | - |
| `updateScheduleAction` statuses (2 novos) | 303 ao salvar C15 · `HORARIO_OCUPADO` C18 | - |
| door 1: tipo e dedupe do aviso (1) | C21 | - |
| door 2: fusão apaga duplicata vazia (1) | C7 C11 | - |
| door 3: materialização por dia local, por caminho (3) | "Só esta data" C26 · "Esta e as próximas" C26 · "Editar escala" C16 C27 | - |
| controles da folha (4) | horário C24 · "Só esta data" C23 · "Esta e as próximas" C23 · "Salvar" C24 | - |

## Swept

- validation: C9, C5
- failure modes: C12 - conflito recusa tudo na transação; C22 - aviso fora da transação
- idempotency: C6 - mesmo horário é no-op; C21 - `dedupeKey` por lote e pessoa
- authorization: C14; existing - `requireLeaderOf` em `authz.ts`
- concurrency: C13
- data lifecycle: C10 - só `date` muda; vagas, pessoas, músicas e publicação ficam
- dependency failure: C22
- state transitions: C3 - cancelada muda de horário e continua cancelada; C20
- observability: existing - erro desconhecido na action passa por `logError` com ref, como `repeatScheduleAction`

## Handoff

- **Settled mid-build:** none. Door 3 (AD-014) decidida pelo autor depois do Verifier, sem pergunta: fecha os achados 1 e 2 sem migração
- **Dispatched:** Verifier at `2687b60` (sem screens sub-agent: nenhuma captura) - returned FAIL, 7 achados, todos fechados em `1de6990`
- **Boundary:** C1-C25 closed at `2687b60`
- **Abandoned:** folha com campos controlados e reinício num `useEffect` na abertura: o efeito rodava depois da pintura e o `fill` do e2e perdia o horário; trocado por formulário não controlado lido por `FormData`
- **Walked:** sem captura. O Playwright abriu `/escalas?mes=2026-11` como líder, tocou o dia 1, ⋮ > "Mudar horário", viu 18:00 e "Só esta data" marcado, salvou 19:30, a folha fechou e o card mostrou `· 19:30`, voltou para 18:00; no dia 04/10 "Salvar" deixou a folha aberta com "Essa data já passou."; ⋮ > "Editar" mostrou o aviso sob Hora. O líder chega a cada estado pelo menu ⋮ do card da data em Escalas.
