# docs/

## Planejamento

- [`planning/plano-evolucao-faseado.md`](./planning/plano-evolucao-faseado.md) — master roadmap, one row per phase. Start here.
- [`planning/product/`](./planning/product/) — one PRD per phase, written only when a phase involves an explicit product/business decision.
- [`audits/`](./audits/) — dated audit/analysis findings (security, UX, design system). Input to planning, not a work request by itself.

## Decisões de arquitetura

- [`adr/`](./adr/) — durable architecture/domain decisions. Read alongside [`../CONTEXT.md`](../CONTEXT.md).

## Operação

- [`setup-local.md`](./setup-local.md) — local dev reference: prerequisites, env vars, project structure, scripts, tests, security scanning.
- [`runbooks/`](./runbooks/) — task-scoped operational guides (run locally, configure Resend/Google Calendar/WhatsApp, bootstrap first admin).

## Design system

- [`backlog-design-system.md`](./backlog-design-system.md), [`still-void-gaps.md`](./still-void-gaps.md) — `@still-void/ui` adoption tracking. `still-void-gaps.md`'s path is also hardcoded as the default in `scripts/check-sv-adoption.sh` — don't move it without updating that script.

## Agents

- [`agents/`](./agents/) — how agent skills should consume this repo's docs (issue tracking, triage labels, domain glossary, planning).

---

Feature-level execution specs (spec/design/tasks/validation) live in `.specs/features/`, not here — see [`agents/planning.md`](./agents/planning.md) for how the two relate.
