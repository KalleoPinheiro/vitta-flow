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

### L-005 — Um script que serve de gate precisa de teste próprio, com fixture e violação plantada — senão ele fica cego em silêncio e segue reportando OK
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `scripts` · harmful: 0
- features: still-void-v2-migration
- evidence: Sensor M8 — scripts/check-sv-adoption.sh; tests/scripts/check-sv-adoption.test.ts (scripts)
- last seen: 2026-08-22T21:21:54Z

### L-006 — Ao asserir sobre saída de linha de comando, exija o marcador de falha e a contagem, nunca só o rótulo da checagem, que costuma ser impresso nos dois estados
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: still-void-v2-migration
- evidence: Sensor M12 — tests/scripts/check-sv-adoption.test.ts:107 (tests)
- last seen: 2026-08-22T21:21:54Z

### L-007 — Ao exigir que um documento liste um item, diga se satisfaz com seção própria ou com menção no corpo — as duas leituras são válidas e o verificador não tem como escolher
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: still-void-v2-migration
- evidence: AC P1-3.3 — .specs/features/still-void-v2-migration/spec.md:103 (specs)
- last seen: 2026-08-22T21:21:54Z

### L-008 — useApiQuery guarda estado por componente e não tem cache compartilhado: dois componentes que consultam a mesma URL divergem depois de uma mutação — quem depende do mesmo dado precisa recebê-lo por prop de um pai único.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `src/app/**,src/lib/use-api-query.ts` · harmful: 0
- features: e2e-consentimento-verdes
- evidence: src/lib/use-api-query.ts:13 (src/app/**,src/lib/use-api-query.ts)
- last seen: 2026-08-22T22:14:58Z

### L-009 — Asserção de ausência (toHaveCount(0)) exige uma âncora de presença na mesma lista, senão passa por lista vazia e casa por engano com registro vizinho de descrição parecida.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `e2e/**` · harmful: 0
- features: e2e-consentimento-verdes
- evidence: e2e/faturamento.spec.ts:136 (e2e/**)
- last seen: 2026-08-22T22:14:58Z

### L-010 — Ao testar escape/sanitização, escolha a entrada negativa provando que o defeito realmente aparece sem a correção — 'Dr. Ana' vs 'DrXAna' não exercita o curinga (falta o espaço), e uma string com '|' vira alternação que casa trivialmente.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: auditoria-seguranca-dependencias
- evidence: tests/support/regexp.test.ts:M3 (tests)
- last seen: 2026-08-23T15:46:52Z

### L-011 — Relatório de scanner externo pode citar versão que não existe na árvore atual: confronte sempre com 'npm ls <pkg>' e 'npm audit' antes de agir — o scan de 2026-08-23 apontou postcss 8.4.31 (era cópia aninhada do next) e omitiu 3 HIGH reais (undici, nanoid, js-yaml).
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `deps` · harmful: 0
- features: auditoria-seguranca-dependencias
- evidence: relatorio-gitguard-cmt5621 (deps)
- last seen: 2026-08-23T15:46:52Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
