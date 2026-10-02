# Sugestão automática de escalação - checks

Profile: light
Plan: `.specs/features/sugestao-automatica/plan.md`

## Intent

14 checks in 3 slices · 0 one-way doors · 0 open

## Checks

### S1 - Regra de escolha · 2 files · 5 KB · ~2k

**C1** - [x] `planSuggestions` escolhe a menor carga; com carga igual, quem tem menos faltas; com carga e faltas iguais, o menor `userId` (AC 1)
Proof: `npm run test -- tests/unit/suggest.test.ts -t "ordem de escolha"`

**C2** - [x] Candidato com `unavailable: true` não é escolhido mesmo com a menor carga (AC 2)
Proof: `npm run test -- tests/unit/suggest.test.ts -t "indisponivel"`

**C3** - [x] Com `capableByRole` `Set{u2}` para a função, só `u2` é escolhido mesmo com carga maior; com `null`, vale a menor carga (AC 3)
Proof: `npm run test -- tests/unit/suggest.test.ts -t "capacitacao"`

**C4** - [x] Duas vagas e a mesma pessoa como melhor candidata das duas: ela fica com uma e a outra vai para a segunda melhor; quem já está em `alreadyAllocated` não é escolhido (AC 4)
Proof: `npm run test -- tests/unit/suggest.test.ts -t "uma vez por data"`

**C5** - [x] Vagas `[Vocal (3 elegíveis), Bateria (1 elegível: u1)]` com `u1` de menor carga: `u1` vai para Bateria e Vocal recebe o segundo; no empate de elegíveis vale a ordem recebida (AC 5)
Proof: `npm run test -- tests/unit/suggest.test.ts -t "vaga mais restrita primeiro"`

**C6** - [x] Vaga sem elegível sai em `unfilled` e não em `picks` (AC 6)
Proof: `npm run test -- tests/unit/suggest.test.ts -t "sem candidato"`

### S2 - Comando do líder · 4 files · 20 KB · ~5k

**C7** - [x] `suggestAllocations` com duas vagas abertas, uma inativa e uma já preenchida chama `allocation.create` 2 vezes, com `source: "LEADER"` e `status: "PENDING"`, só para as abertas ativas, e devolve `{ filled: 2, unfilled: 0 }` (AC 7)
Proof: `npm run test -- tests/unit/suggestAllocations.test.ts -t "grava PENDING"`

**C8** - [x] Em data publicada `notifyUser` recebe `dedupeKey: "assign:<id>"` por alocação criada; em rascunho não é chamado (AC 8)
Proof: `npm run test -- tests/unit/suggestAllocations.test.ts -t "notifica so se publicada"`

**C9** - [x] Com `requireLeaderOf` lançando `FORBIDDEN`, rejeita com `FORBIDDEN` sem `allocation.create` (AC 9)
Proof: `npm run test -- tests/unit/suggestAllocations.test.ts -t "FORBIDDEN nao grava"`

**C10** - [x] Data anterior a agora rejeita com `OCCURRENCE_PAST` sem `allocation.create`, e `MENSAGENS.OCCURRENCE_PAST` é "Essa data já passou." (AC 10)
Proof: `npm run test -- tests/unit/suggestAllocations.test.ts -t "OCCURRENCE_PAST"`
Proof: `npm run test -- tests/unit/actionError.test.ts -t "OCCURRENCE_PAST"`

**C11** - [x] Com `allocation.create` falhando com `P2002` na 1ª de duas vagas, devolve `{ filled: 1, unfilled: 1 }` (AC 11)
Proof: `npm run test -- tests/unit/suggestAllocations.test.ts -t "P2002"`

**C12** - [x] `loadByPerson` é chamado com `(data - 30 dias, data + 30 dias, [ministryId])` e `attendanceRows` com a janela de `attendanceWindow(agora)` e `[ministryId]` (AC 12)
Proof: `npm run test -- tests/unit/suggestAllocations.test.ts -t "janelas"`

### S3 - Retorno na tela · 3 files · 22 KB · ~6k

**C13** - [x] `suggestOutcome({ ok: true, filled: 2, unfilled: 1 })` devolve "2 vagas preenchidas, 1 sem candidato" com `refresh: true`; `filled: 1` -> "1 vaga preenchida, ..."; `filled: 0` -> `refresh: false`; e `OccurrenceRow` usa `suggestOutcome` (AC 13)
Proof: `npm run test -- tests/unit/suggest.test.ts -t "suggestOutcome"`
Proof: `grep -q "suggestOutcome(" "app/(app)/escalas/OccurrenceRow.tsx" && npm run typecheck`

**C14** - [x] `suggestConfirmText(true)` contém "serão avisados agora" e `suggestConfirmText(false)` contém "só ao publicar"; `OccurrenceRow` chama `confirm` com esse texto antes da action (AC 14)
Proof: `npm run test -- tests/unit/suggest.test.ts -t "suggestConfirmText"`
Proof: `grep -q "suggestConfirmText(props.published)" "app/(app)/escalas/OccurrenceRow.tsx"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| critérios de ordenação (3) | carga C1 · faltas C1 · `userId` C1 | - |
| motivos de inelegibilidade (4) | indisponível C2 · não capacitado C3 · já alocado na data C4 · já escolhido nesta sugestão C4 | - |
| capacitação da função (2) | declarada (`Set`) C3 · não declarada (`null`) C3 | - |
| vaga lida pelo serviço (4) | aberta ativa C7 · inativa C7 · já preenchida C7 · sem elegível C6 | - |
| estado de publicação (2) | publicada C8 · rascunho C8 | - |
| falhas do comando (3) | `FORBIDDEN` C9 · `OCCURRENCE_PAST` C10 · `P2002` C11 | - |
| texto de retorno (3) | plural C13 · singular C13 · nada preenchido C13 | - |

- C13 e C14 têm prova grep (+ typecheck) para a ligação com a tela; o repo não tem teste de componente
- Nenhum outro check afirma mais do que o caso que sua prova exercita

## Swept

- validation: C10
- failure modes: C11; existing - `notifyUser` nunca lança, então push falho não desfaz alocação
- idempotency: C7 - repetir o comando só enxerga vagas ainda abertas; vaga preenchida é ignorada
- authorization: C9
- concurrency: C11 - corrida de vaga resolvida pelo unique `slotId` (`P2002`), como em `allocateVolunteer`
- data lifecycle: n/a - grava `Allocation` comum, sem regra nova de retenção
- dependency failure: existing - falha de push é logada e engolida em `notifyUser`
- state transitions: C7 - vaga aberta -> alocação `PENDING`
- observability: existing - `handleActionError` loga com escopo e `ref`

## Handoff

- S1 ~2k + S2 ~5k + S3 ~6k = ~13k (wc -c / 4 dos arquivos tocados), abaixo do budget de 150k - one builder
