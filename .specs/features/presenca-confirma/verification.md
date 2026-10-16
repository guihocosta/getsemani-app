# Presença confirma escala verification

**Verdict**: PASS
**Profile**: light
**Diff range**: caaea67..de65caf
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Escopo do round 2: diff do fix `6d657c5..de65caf` (`OccurrenceRow.tsx`, `occurrenceCache.ts`, `attendanceMark.test.ts`, `patchOccurrenceSlot.test.ts`, `checks.md`) + o veredito não-PASS do round 1 (C6) + a nota de precisão de C2/C3. Todas as provas (C1-C6) re-rodadas em `de65caf`. Nenhum arquivo de `src/`, `actions.ts`, `setAttendance.test.ts` ou `setAttendanceAction.test.ts` mudou no fix.

## Binding sources

carried from 6d657c5. Passo 1 não roda sob o profile `light` (só em `ui`); não há plan.md nem fonte binding - small-change escape, o `## Intent` de checks.md é o plano.

## Checks

verified at de65caf (todas as provas re-rodadas; citações refrescadas nos arquivos tocados pelo fix; C4/C5 citações carried from 6d657c5, arquivos não tocados).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `attendanceUpdate(PENDING, true, now)` devolve `{ checkedInAt: now, status: "CONFIRMED", respondedAt: now }` | `npm run test -- tests/unit/attendanceMark.test.ts tests/unit/setAttendance.test.ts tests/unit/setAttendanceAction.test.ts tests/unit/patchOccurrenceSlot.test.ts --reporter=verbose` exit 0 em de65caf; "attendanceUpdate > presente em PENDING confirma" passou individualmente | `tests/unit/attendanceMark.test.ts:20` - `expect(attendanceUpdate({ status: "PENDING", checkedInAt: null }, true, now)).toEqual({ checkedInAt: now, status: "CONFIRMED", respondedAt: now })` (linha inalterada pelo fix; `toEqual` basta aqui, a claim afirma presença de chaves) | PASS |
| C2 | `attendanceUpdate(CONFIRMED com t0, true, now)` devolve `{ checkedInAt: t0 }` sem `status`/`respondedAt` | mesma invocação; "presente em CONFIRMED so mantem check-in" passou | `tests/unit/attendanceMark.test.ts:28` - `expect(attendanceUpdate({ status: "CONFIRMED", checkedInAt: t0 }, true, now)).toStrictEqual({ checkedInAt: t0 })`. `toStrictEqual` falha se houver chave `status`/`respondedAt` mesmo com valor `undefined`, então agora prova a ausência da chave - nota de precisão do round 1 resolvida | PASS |
| C3 | `present = false` devolve `{ checkedInAt: null }` sem `status`, para PENDING e CONFIRMED | mesma invocação; "desmarcar nao mexe no status" passou | `tests/unit/attendanceMark.test.ts:32-33` - `for (const status of ["PENDING", "CONFIRMED"] as const) expect(attendanceUpdate({ status, checkedInAt: t0 }, false, now)).toStrictEqual({ checkedInAt: null })`. Cobre os 2 status; ausência de chave agora provada | PASS |
| C4 | `setAttendance` em PENDING/present chama `prisma.allocation.update` com `data.status = "CONFIRMED"` e `data.respondedAt` Date | mesma invocação; "setAttendance > presente em PENDING confirma a escala" passou | carried from 6d657c5 (arquivo não tocado): `tests/unit/setAttendance.test.ts:58` - `expect(data.status).toBe("CONFIRMED")`; `:59` - `expect(data.respondedAt).toBeInstanceOf(Date)` | PASS |
| C5 | `setAttendanceAction("a1", true)` com serviço devolvendo `{ status: "CONFIRMED", checkedInAt: Date }` retorna `{ ok: true, allocation: { status: "CONFIRMED", checkedIn: true } }` | mesma invocação; "setAttendanceAction > devolve status e presenca" passou | carried from 6d657c5 (arquivo não tocado): `tests/unit/setAttendanceAction.test.ts:15` - `expect(await setAttendanceAction("a1", true)).toEqual({ ok: true, allocation: { status: "CONFIRMED", checkedIn: true } })`; chama a própria Server Action, sem level gap | PASS |
| C6 | `OccurrenceRow` repassa ao cache local o `status` devolvido pela action como `allocatedStatus`, junto de `checkedIn` | mesma invocação; "patchOccurrenceSlot > presenca confirmada tira o aguardando" passou. `grep -q "onAttendanceChanged(slot.slotId, attendancePatch(res.allocation))" "app/(app)/escalas/OccurrenceRow.tsx"` exit 0 em de65caf; `git show caaea67:"app/(app)/escalas/OccurrenceRow.tsx" \| grep -c "attendancePatch(res.allocation)"` = 0 (também 0 em 6d657c5) | Comportamento: `tests/unit/patchOccurrenceSlot.test.ts:100` - `expect(result[0].slots[0].allocatedStatus).toBe("CONFIRMED")`; `:101` - `expect(result[0].slots[0].checkedIn).toBe(true)`; o slot parte de `allocatedStatus: "PENDING"` (`PATCH`, `:50`) e recebe `attendancePatch({ status: "CONFIRMED", checkedIn: true })` (`:98`), então o teste discrimina: se `attendancePatch` (`app/(app)/escalas/occurrenceCache.ts:59-64`) não mapeasse `status -> allocatedStatus`, o slot ficaria `PENDING` e `:100` falharia; `:102` (`allocatedName` "Ana") prova que o merge preserva o resto. Ligação: a grep amarra o único `onAttendanceChanged` de `OccurrenceRow.tsx` (`:259`, dentro de `toggleAttendance`, `:249`) a `attendancePatch(res.allocation)`, e não casa na base. O par cobre a claim: a tela passa o retorno da action por `attendancePatch`, e `attendancePatch` comprovadamente põe `status` em `allocatedStatus` com `checkedIn`. Resíduo aceitável sob `light`: a ligação call site é estrutural (grep), não um teste do componente | PASS |

## Prova alterada pelo fix

verified at de65caf. O fix trocou a prova grep do C6 (`allocatedStatus: res.allocation.status` -> `onAttendanceChanged(slot.slotId, attendancePatch(res.allocation))`) e acrescentou uma prova de comportamento; a claim ficou idêntica. Julgamento: **reforço**, não enfraquecimento - a grep antiga casava 3 linhas na base (não discriminava); a nova casa 0 na base e 1 em HEAD, e mira o call site exato; o teste novo exercita o mapeamento real e falharia sem ele. C2/C3 também foram reforçados (`toEqual` -> `toStrictEqual`), mais estrito, claim inalterada.

## Coverage

carried from 6d657c5. O recompute de Coverage não roda sob o profile `light`. A tabela de checks.md foi lida e não recomputada; a linha "camadas que carregam o status novo (3)" põe "cache da tela" em C6, agora PASS.

## Test policy rows

carried from 6d657c5. checks.md não tem seção `Test policy`; além disso, esse passo não roda sob `light`.

## Faults injected

O passo 4 (fault injection) não roda sob o profile `light`. Para C6, a grep nova rodada contra a base `caaea67` dá 0 (antes casava), ou seja, o "mutante" que derrotava a prova do round 1 agora é morto.

## Swept existing

carried from 6d657c5 (nenhum arquivo citado foi tocado pelo fix; `OccurrenceRow.tsx` mudou só no import e no call site de `toggleAttendance`).

| Row | Constraint cited | Found in code |
| --- | --- | --- |
| validation | `canMarkAttendance` em `setAttendance.ts` | sim - `src/modules/scheduling/services/setAttendance.ts:22-27`; coberto por `tests/unit/setAttendance.test.ts:71-77` |
| failure modes | `handleActionError` em `setAttendanceAction` traduz para `MENSAGENS` | sim - `app/(app)/escalas/actions.ts:196`; `src/lib/actionError.ts:70-79`; UI usa `MENSAGENS[res.code]` em `OccurrenceRow.tsx:256` |
| authorization | `requireLeaderOf` em `setAttendance.ts` | sim - `src/modules/scheduling/services/setAttendance.ts:20`; coberto por `tests/unit/setAttendance.test.ts:79-85` |
| Intent ref | `respondedAt` como em `swap.ts:179` e `selfAllocate.ts:59` | sim - `swap.ts:178-179`, `selfAllocate.ts:58-59` |

## Gate

`npm run test -- tests/unit/attendanceMark.test.ts tests/unit/setAttendance.test.ts tests/unit/setAttendanceAction.test.ts tests/unit/patchOccurrenceSlot.test.ts --reporter=verbose` - 22 passed, 0 failed (4 arquivos), em de65caf. Grep do C6: exit 0 em HEAD, 0 ocorrências na base `caaea67`.
