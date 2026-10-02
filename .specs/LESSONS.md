# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Check que reusa teste pre-existente como prova exige assert do valor exato do claim; conferir antes de marcar, senao Verifier reprova.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tests/unit` · harmful: 0
- features: judge-fixes-52ec564
- evidence: C8 round 1 (tests/unit)
- last seen: 2026-09-25T19:21:32Z

### L-002 - When a new state gates visibility of an entity, guard every service that accepts that entity's id, not only the ones its list pages link to
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `scheduling` · harmful: 0
- features: rascunho-publicar
- evidence: src/modules/scheduling/services/swap.ts:150 (scheduling)
- last seen: 2026-10-02T18:32:21Z

### L-003 - Enumerate notifying services by searching for the notify call, not from the list of files the change already touches
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `scheduling` · harmful: 0
- features: rascunho-publicar
- evidence: src/modules/scheduling/services/swap.ts:87 (scheduling)
- last seen: 2026-10-02T18:32:21Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
