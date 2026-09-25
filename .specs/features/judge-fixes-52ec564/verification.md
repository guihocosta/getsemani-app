# Correções do julgamento do merge 52ec564 - verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 52ec564..62c46a9
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 2 scope: fix commit `62c46a9` (tests only: `tests/unit/candidateList.test.ts`, `tests/unit/userSkills.test.ts`, new `tests/unit/scheduleFormRotation.test.ts`). Re-judged: C8 (was FAIL), plus citations in the touched files (C6, C7, C8, C10, C11). Every other verdict is carried from 8c499db, because the fix touched no source file and no test file those verdicts cite.

## Checks

Proofs re-run in full at 62c46a9, one batched call: `npx vitest run tests/unit/repeatScheduleAction.test.ts tests/unit/repeatSchedule.test.ts tests/unit/repeatOutcome.test.ts tests/unit/userSkills.test.ts tests/unit/candidateList.test.ts tests/unit/rotationCycleSchema.test.ts tests/unit/scheduleFormRotation.test.ts --reporter=verbose -t "relanca redirect|loga erro desconhecido|falha parcial|refresh|capableUserIdsForRole|markCapable|capacitacao nao declarada|rotationCycleSchema|setMemberSkill|setOwnSkill|createScheduleAction rotationCycle"`, exit 0: 7 files, 30 passed, 8 skipped (filtered out). Every named test is listed individually as passed. The C12 shell command exited 0 and `npm run typecheck` exited 0 at 62c46a9.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | action rethrows `NEXT_REDIRECT;replace;/login;307;` | batched vitest at 62c46a9, `relanca redirect do Next (sessao expirada vai pro /login)` passed | carried from 8c499db (file untouched): `tests/unit/repeatScheduleAction.test.ts:25` - `await expect(repeatScheduleAction("s1")).rejects.toBe(redirectErr)`; `:26` `expect(logError).not.toHaveBeenCalled()` | PASS |
| C2 | unknown error -> `logError("escalas.repeatSchedule")` + `{ ok:false, error:"Não deu para repetir a escalação agora.", ref }` | batched vitest at 62c46a9, `loga erro desconhecido e devolve ref` and `loga erro desconhecido: FORBIDDEN e NO_ROTATION_CYCLE...` passed | carried from 8c499db: `tests/unit/repeatScheduleAction.test.ts:33` - `expect(logError).toHaveBeenCalledWith("escalas.repeatSchedule", boom, { scheduleId: "s1" })`; `:34` - `expect(res).toEqual({ ok: false, error: "Não deu para repetir a escalação agora.", ref: "REF123" })`; `:39`, `:44` | PASS |
| C3 | 2nd `allocation.create` fails without `code` after 1 copy -> `RepeatPartialFailure` with `filled = 1` | batched vitest at 62c46a9, `falha parcial carrega filled quando a 2a copia quebra sem code` passed | carried from 8c499db: `tests/unit/repeatSchedule.test.ts:68` - `expect(err).toBeInstanceOf(RepeatPartialFailure)`; `:69` - `expect((err as RepeatPartialFailure).filled).toBe(1)` | PASS |
| C4 | partial failure `filled=3` logs + plural message; `filled=1` singular | batched vitest at 62c46a9, both `falha parcial com ...` tests passed | carried from 8c499db: `tests/unit/repeatScheduleAction.test.ts:54` - `expect(logError).toHaveBeenCalledWith("escalas.repeatSchedule", err, { scheduleId: "s1" })`; `:55` - `toMatchObject({ ok: false, filled: 3, error: "3 vagas preenchidas antes da falha. Tente de novo para completar." })`; `:65` - `toMatchObject({ ok: false, filled: 1, error: "1 vaga preenchida antes da falha. Tente de novo para completar." })` | PASS |
| C5 | `repeatOutcome` refresh true for ok/filled 0 and error/filled 2; false for error without filled | batched vitest at 62c46a9, 3 `repeatOutcome` tests passed | carried from 8c499db: `tests/unit/repeatOutcome.test.ts:6` - `...refresh).toBe(true)` (ok, filled 0); `:11` - `expect(out.refresh).toBe(true)` (filled 2); `:16` - `...refresh).toBe(false)` | PASS |
| C6 | `capableUserIdsForRole` -> `null` on 0 rows, `Set` on >= 1 | batched vitest at 62c46a9, 2 `capableUserIdsForRole` tests passed | verified at 62c46a9 (lines moved): `tests/unit/userSkills.test.ts:32` - `expect(await capableUserIdsForRole("r1")).toBeNull()`; `:37` - `expect(await capableUserIdsForRole("r1")).toEqual(new Set(["u1", "u2"]))` | PASS |
| C7 | `markCapable(c, null)` -> all `capable: true`, sorted by `count30d` asc | batched vitest at 62c46a9, `null marca todos capazes...` passed | verified at 62c46a9 (lines moved): `tests/unit/candidateList.test.ts:172` - `expect(list.map((c) => c.userId)).toEqual(["u2", "u3", "u1"])`; `:173` - `expect(list.every((c) => c.capable)).toBe(true)` | PASS |
| C8 | `markCapable(c, Set{u3})` keeps u3 first and `capable: false` on the others | batched vitest at 62c46a9, new `Set com declarados: declarado primeiro, demais capable false` passed (added in 62c46a9) | verified at 62c46a9: `tests/unit/candidateList.test.ts:160` `markCapable(base, new Set(["u3"]))`; `:161` - `expect(list.map((c) => c.userId)).toEqual(["u3", "u1", "u2"])`; `:162` - `expect(list.map((c) => c.capable)).toEqual([true, false, false])`. The fixture feeds u1/u2 as `capable: true` (`:156-157`), so the assertion shows the flag is recomputed, not passed through | PASS |
| C9 | `null` -> source copied (`filled = 1`); `Set{outro}` -> skipped (`skipped = 1`) | batched vitest at 62c46a9, 2 `capacitacao nao declarada...` tests passed | carried from 8c499db: `tests/unit/repeatSchedule.test.ts:77` - `toEqual({ filled: 1, skipped: 0 })`; `:84` - `toEqual({ filled: 0, skipped: 1 })`; `:85` - `expect(prisma.allocation.create).not.toHaveBeenCalled()` | PASS |
| C10 | schema accepts 1,12,null,undefined; rejects 0,13,1.5 with `INVALID_ROTATION_CYCLE`; create/update share it | batched vitest at 62c46a9, 7 `rotationCycleSchema` cases and 2 `createScheduleAction rotationCycle` cases passed; `npm run typecheck` exit 0 | schema carried from 8c499db: `tests/unit/rotationCycleSchema.test.ts:6` - `...safeParse(value).success).toBe(true)`; `:11` - `expect(res.success).toBe(false)`; `:12` - `expect(res.error?.issues[0].message).toBe("INVALID_ROTATION_CYCLE")`. Action level verified at 62c46a9: `tests/unit/scheduleFormRotation.test.ts:28` - `expect(res).toEqual({ ok: false, error: "Ciclo de rodízio deve ser entre 1 e 12." })` for `"0"` and `"13"`, through the real `createSchedule` (not mocked). Shared schema by reading: `createSchedule.ts:14`, `updateSchedule.ts:12` `rotationCycle: rotationCycleSchema` | PASS |
| C11 | `setMemberSkill` enabled true -> `upsert` on `userId_roleId`; false -> `deleteMany` | batched vitest at 62c46a9, 2 `setMemberSkill` tests and the `setOwnSkill` test passed | verified at 62c46a9 (lines moved): `tests/unit/userSkills.test.ts:63` - `expect(prisma.userSkill.upsert).toHaveBeenCalledWith({ where: { userId_roleId: { userId: "u9", roleId: "r1" } }, create: {...}, update: {} })`; `:73` - `expect(prisma.userSkill.deleteMany).toHaveBeenCalledWith({ where: { userId: "u9", roleId: "r1" } })`; `setOwnSkill` `:46` (upsert with `userId: "me"`) and `:52` (deleteMany) | PASS |
| C12 | domain `candidateList.ts` exists, no `@/lib/prisma`, services copy gone | `test -f ... && ! grep -q "lib/prisma" ... && test ! -f src/modules/scheduling/services/candidateList.ts` exit 0 at 62c46a9 | carried from 8c499db (source untouched): `src/modules/scheduling/domain/candidateList.ts:59` - `capable: capableUserIds === null` OR `capableUserIds.has(c.userId)` (logical-or expression; pipe characters omitted for the table); rename `services/ => domain/` in 8c499db | PASS |

### Gaps (level / sampling / precision)

- **C8**: closed in 62c46a9 (new test at `candidateList.test.ts:154-163`).
- **C10 (level)**: closed for `createScheduleAction`, where out-of-range `0` and `13` show the pt-BR message (`scheduleFormRotation.test.ts:28`). Remaining sampling: `updateScheduleAction` and the non-integer `1.5` are proven only at schema level. Both share the same schema and `friendlyError` (`app/(app)/escalas/actions.ts:35`). Not blocking.
- **C11 (sampling)**: closed. `setOwnSkill` now has a test that it uses the session user in both branches (`userSkills.test.ts:46`, `:52`).
- **C6 (level)**, carried from 8c499db: `findMany` is mocked, so the ACTIVE-membership filter is not exercised. Only the `length > 0` branch at `userSkills.ts:147` is proven. Not blocking.
- **C3 (precision)**, carried from 8c499db: the claim text says "2 cópias OK" and "falhando na 2ª", which contradict each other. The asserted `filled = 1` matches the intent. Not blocking.
- **C5 (level)**, carried from 8c499db: the `OccurrenceRow.tsx:249-251` wiring is confirmed by reading only. Not blocking.

### Swept rows resolving to `existing` (carried from 8c499db, source untouched)

- idempotency: `decideCopyAllocation` returns `"SKIP_SLOT_TAKEN"` at `src/modules/scheduling/domain/rotation.ts:53`, called from `repeatSchedule.ts:125`. Present.
- concurrency: `P2002` is counted as skipped at `src/modules/scheduling/services/repeatSchedule.ts:164-166`. Present.

## Faults injected

light - no faults injected.

## Gate

`npm run test` at 62c46a9 - 228 passed, 0 failed (40 files)
`npm run typecheck` at 62c46a9 - exit 0
