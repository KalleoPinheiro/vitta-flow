---
description: End-to-end fix pipeline for a named subset of audit-sourced GitHub issues (spec -> implement -> PR -> merge -> close -> STATE.md)
---

Follow `docs/agents/fix-audit-issues.md` exactly, for the issue numbers given in `$ARGUMENTS`.

Do not deviate from that document's 10 steps or its "O que NÃO fazer" section. In particular:

- Specify with the `tlc-spec-driven` skill (`.specs/features/<slug>/spec.md`) covering only the issues named — restrict scope if the source audit doc is broader, and record that restriction in the spec, not in the audit doc.
- Branch from an up-to-date `main` (`git checkout main && git pull --ff-only && git status` clean, then `git checkout -b fix/<slug>`).
- Implement with `tlc-spec-driven` (`/implement`); gate green (`typecheck`, `lint`, `check:sv`, `test:coverage` >= 90%, `test:e2e`) before every commit — the `audit-fix-gate` subagent runs this.
- One semantic commit per issue (or one atomic commit per task if `tasks.md` was generated), each closing its issue via `Closes #N`.
- Update `docs/plano-evolucao-faseado.md` and, only if setup/env/API contract changed, `README.md`/`AGENTS.md` — never `docs/audits/*.md`.
- PR from the up-to-date branch, track CodeRabbit, squash merge with `Closes #N` per issue in the squash body.
- Record the outcome in `.specs/STATE.md` → Handoff, same format as prior phases.

If `$ARGUMENTS` is empty, ask which issue numbers to fix — do not guess a batch.
