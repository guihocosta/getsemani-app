# Presença confirma escala - checks

Profile: light

## Intent

Hoje, quando o líder marca presença numa vaga cuja alocação está `PENDING`, a vaga continua
"aguardando confirmação": a pessoa foi, mas a escala segue como não confirmada. Quando isto sair,
marcar presente numa alocação `PENDING` também a confirma (`status = CONFIRMED`, `respondedAt`
preenchido), e o selo "aguardando confirmação" some na hora, sem recarregar o mês.

Decisão tomada (padrão escolhido, reversível): **desmarcar presença não desfaz a confirmação**.
A pessoa estava escalada e foi tratada como confirmada; voltar a `PENDING` reabriria o pedido de
confirmação para um dia que já passou. `respondedAt` é preenchido como em `swap.ts:179` e
`selfAllocate.ts:59`, que também confirmam sem resposta explícita do voluntário.

6 checks in 2 slices · 0 one-way doors · 0 open

## Checks

### S1 - Regra e serviço · 3 files · 4 KB · ~1k

**C1** - [x] `attendanceUpdate({ status: "PENDING", checkedInAt: null }, true, now)` devolve `{ checkedInAt: now, status: "CONFIRMED", respondedAt: now }`
Proof: `npm run test -- tests/unit/attendanceMark.test.ts -t "presente em PENDING confirma"`

**C2** - [x] `attendanceUpdate({ status: "CONFIRMED", checkedInAt: t0 }, true, now)` devolve `{ checkedInAt: t0 }`, sem chave `status` nem `respondedAt`
Proof: `npm run test -- tests/unit/attendanceMark.test.ts -t "presente em CONFIRMED so mantem check-in"`

**C3** - [x] `attendanceUpdate` com `present = false` devolve `{ checkedInAt: null }`, sem chave `status`, tanto para `PENDING` quanto para `CONFIRMED`
Proof: `npm run test -- tests/unit/attendanceMark.test.ts -t "desmarcar nao mexe no status"`

**C4** - [x] `setAttendance` numa alocação `PENDING` com `present = true` chama `prisma.allocation.update` com `data.status = "CONFIRMED"` e `data.respondedAt` instância de `Date`
Proof: `npm run test -- tests/unit/setAttendance.test.ts -t "presente em PENDING confirma a escala"`

### S2 - Action e tela · 2 files · 30 KB · ~8k

**C5** - [x] `setAttendanceAction("a1", true)` com o serviço devolvendo `{ status: "CONFIRMED", checkedInAt: <Date> }` retorna `{ ok: true, allocation: { status: "CONFIRMED", checkedIn: true } }`
Proof: `npm run test -- tests/unit/setAttendanceAction.test.ts -t "devolve status e presenca"`

**C6** - [x] `OccurrenceRow` repassa ao cache local o `status` devolvido pela action como `allocatedStatus`, junto de `checkedIn`
Proof: `npm run test -- tests/unit/patchOccurrenceSlot.test.ts -t "presenca confirmada tira o aguardando"`
Proof: `grep -q "onAttendanceChanged(slot.slotId, attendancePatch(res.allocation))" "app/(app)/escalas/OccurrenceRow.tsx"`

Prova reforçada no round 2: o grep original (`allocatedStatus: res.allocation.status`) já casava na base `caaea67` em callbacks de allocate/reassign e não discriminava (achado do Verifier). A claim não mudou.

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| status atual × present (4) | `PENDING`/true C1 · `CONFIRMED`/true C2 · `PENDING`/false C3 · `CONFIRMED`/false C3 | - |
| camadas que carregam o status novo (3) | serviço C4 · action C5 · cache da tela C6 | - |

- Claims naming a response shape: C5 - proof calls the Server Action itself
- No other check claims more than the single case its proof exercises

## Swept

- validation: existing - `canMarkAttendance` em `setAttendance.ts` (dia futuro, convidado), coberto por `tests/unit/setAttendance.test.ts`
- failure modes: existing - `handleActionError` em `setAttendanceAction` traduz erro para `MENSAGENS`
- idempotency: C2 - marcar presente de novo numa alocação já confirmada não reescreve status nem horário
- authorization: existing - `requireLeaderOf` em `setAttendance.ts`, coberto por "quem nao lidera o ministerio recebe FORBIDDEN"
- concurrency: n/a - update de uma linha por id; voluntário confirmando ao mesmo tempo leva ao mesmo estado final `CONFIRMED`
- data lifecycle: C3 - desmarcar preserva a confirmação (decisão em Intent)
- dependency failure: n/a - nenhuma dependência externa nova
- state transitions: C1, C3 - `PENDING -> CONFIRMED` via presença; nenhuma transição de volta
- observability: n/a - sem requisito de log; erros já passam por `logError` em `handleActionError`

## Out of scope

- Notificar o voluntário de que a escala foi confirmada pelo líder - não pedido
- Desmarcar presença voltar a `PENDING` - decidido contra em Intent

## Handoff

- S1 = 1k, S2 entra em `escalas` a 9k total, sob o budget de 150k - one builder
- Mechanism: one builder (dentro do budget, sem pergunta)
