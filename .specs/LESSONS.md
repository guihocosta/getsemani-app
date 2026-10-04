# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

### L-002 - When a new state gates visibility of an entity, guard every service that accepts that entity's id, not only the ones its list pages link to
- signal: `ac_gap` · recurrence: 2 feature(s) · scope: `scheduling` · harmful: 0
- features: rascunho-publicar, repertorio
- evidence: src/modules/scheduling/services/swap.ts:150 (scheduling) (+1 more)
- last seen: 2026-10-02T18:46:30Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Check que reusa teste pre-existente como prova exige assert do valor exato do claim; conferir antes de marcar, senao Verifier reprova.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tests/unit` · harmful: 0
- features: judge-fixes-52ec564
- evidence: C8 round 1 (tests/unit)
- last seen: 2026-09-25T19:21:32Z

### L-003 - Enumerate notifying services by searching for the notify call, not from the list of files the change already touches
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `scheduling` · harmful: 0
- features: rascunho-publicar
- evidence: src/modules/scheduling/services/swap.ts:87 (scheduling)
- last seen: 2026-10-02T18:32:21Z

### L-004 - When a criterion says every service of a module rejects under a guard, the check enumerates every exported function of the module, not a sample
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tests/unit` · harmful: 0
- features: repertorio
- evidence: C3 - tests/unit/repertoireSongs.test.ts:133 (tests/unit)
- last seen: 2026-10-02T18:46:30Z

### L-005 - A page that turns a service error into notFound() matches only the expected domain codes and rethrows the rest
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `app` · harmful: 0
- features: repertorio
- evidence: Swept failure modes - app/(app)/repertorio/[id]/page.tsx:15 (app)
- last seen: 2026-10-02T18:46:30Z

### L-006 - A Prisma include of a relation owned by another module is a cross-module table read; fetch it through that module's service
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `modules` · harmful: 0
- features: repertorio
- evidence: door 5 - src/modules/repertoire/services/songs.ts:42 (modules)
- last seen: 2026-10-02T18:46:30Z

### L-007 - Test reordering on lists whose positions have gaps and ties, not only on contiguous positions starting at 1
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `repertoire` · harmful: 0
- features: repertorio
- evidence: C19 - src/modules/repertoire/services/setlist.ts:110 (repertoire)
- last seen: 2026-10-02T19:01:24Z

### L-008 - A greedy assignment criterion says whether its ordering key is recomputed after each pick, and its check includes a case where every slot ties
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `scheduling` · harmful: 0
- features: sugestao-automatica
- evidence: C5 - src/modules/scheduling/domain/suggest.ts:42 (scheduling)
- last seen: 2026-10-02T19:02:45Z

### L-009 - A service that writes to an occurrence by id rejects a cancelled occurrence, because list pages hide it but a stale tab still sends the id
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `scheduling` · harmful: 0
- features: sugestao-automatica
- evidence: src/modules/scheduling/services/suggestAllocations.ts:30 (scheduling)
- last seen: 2026-10-02T19:02:45Z

### L-010 - A deterministic automatic pick states what happens to a person who just refused the same slot, since refusal deletes the allocation and lowers their load
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `scheduling` · harmful: 0
- features: sugestao-automatica
- evidence: src/modules/scheduling/services/respondAllocation.ts:45 (scheduling)
- last seen: 2026-10-02T19:02:45Z

### L-011 - When a column that must stay on the server is added to a model, give a select to every query that passes that model's rows to a client component
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `modules` · harmful: 0
- features: aniversariantes
- evidence: src/modules/ministries/services/userSkills.ts:112 (modules)
- last seen: 2026-10-02T19:05:02Z

### L-012 - A check for a never-leaves-the-server invariant enumerates every query that loads the model, not only the new feature's return value
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tests/unit` · harmful: 0
- features: aniversariantes
- evidence: C4 - tests/unit/birthday.test.ts:85 (tests/unit)
- last seen: 2026-10-02T19:05:02Z

### L-013 - When a gate's scope is derived from a lookup, assert the argument the authorization function receives, not only that it rejects
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tests/unit` · harmful: 0
- features: avisos
- evidence: C3 - tests/unit/announcements.test.ts:116 (tests/unit)
- last seen: 2026-10-02T19:05:02Z

### L-014 - Update the check claim when a later commit adds a filter to a queried where clause the check asserts by deep equality
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `repo-layer` · harmful: 0
- features: presenca-faltas
- evidence: C4 tests/unit/attendanceReport.test.ts:30 (repo-layer)
- last seen: 2026-10-04T00:15:16Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
