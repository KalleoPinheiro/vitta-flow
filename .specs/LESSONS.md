# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 — Assert time-derived fields with a non-zero elapsed interval, never only at the degenerate just-created value
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: fase-3-compliance-ux-clinico
- evidence: Sensor #5 — src/app/api/photos/triage/route.ts:61; tests/api/audit-lgpd-routes.test.ts:371 (routes)
- last seen: 2026-08-15T09:40:27Z

### L-002 — Cover a guard at the route level with a failing precondition, not only via the domain rule it delegates to
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: fase-3-compliance-ux-clinico
- evidence: COMP3-03 — src/app/api/portal/patient/photos/route.ts:54 (routes)
- last seen: 2026-08-15T09:40:27Z

### L-003 — Prove the scope of a guard with a multi-entity fixture when the spec states the scope explicitly
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: fase-3-compliance-ux-clinico
- evidence: Edge case 'gate por paciente' — src/app/api/portal/patient/photos/route.ts:53 (routes)
- last seen: 2026-08-15T09:40:27Z

### L-004 — State whether a UI-worded acceptance criterion is satisfied at the API DTO or at the rendered screen
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: fase-3-compliance-ux-clinico
- evidence: COMP3-10 — .specs/features/fase-3-compliance-ux-clinico/spec.md:55 (specs)
- last seen: 2026-08-15T09:40:27Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
