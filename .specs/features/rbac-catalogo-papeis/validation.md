# RBAC: Catálogo de 6 Papéis — Validation Report

**Verdict: PASS**

**Diff range verified**: `main..feature/issue-20` (commits 6ed2762..5ca89b3, the full branch history — T1-T19, all 19 tasks).

**Gate commands** (re-confirmed clean per orchestrator, not re-run by this Verifier): `npm run typecheck`, `npm run lint`, `npm run test:coverage --no-file-parallelism` (97.01% statements), `npm run build`, `npm run check:sv`, `npm run test:e2e` (68/68).

---

## 1. Spec-anchored outcome check

Sampled 15 of the 21 acceptance criteria across all 4 user stories (spec.md: P1 has 6, P2 has 8, P3 has 2, P4 has 5) — one representative test per row below, not an exhaustive per-AC walk. For each sampled AC, the test asserts the spec-defined outcome precisely, not a looser proxy. The 6 ACs not individually evidenced here (P1-AC1 "recognizes exactly 6 roles", P1-AC3 self-signup route absence already covered under P2-AC8's row, P2-AC1/2/3/6/7 — the remaining hierarchy-matrix directions and multi-company_admin) are exercised by the same test files cited below (`tests/domain/user-role.test.ts`, `tests/application/create-account.test.ts`, `tests/api/accounts-provisioning.test.ts`) but were not traced line-by-line in this pass; the gate (`npm run test:coverage`, 97.01%) confirms they run and pass.

| Story | AC sampled | Test | Implementation | Verdict |
| --- | --- | --- | --- | --- |
| P1 (RBAC-02/04) | Password login always uses account's own role, never defaults | `tests/api/auth-routes.test.ts:188-222` — decodes session cookie via `verifySessionToken`, asserts `session.role === "profissional"` AND explicitly `session.role !== "admin"` | `src/app/api/auth/login/route.ts:83-93` (`authenticateAccount` returns `account.role`, not a fixed value); `authenticateMaster` is the sole exception, mapped to `super_admin` (documented, transitional) | Matches spec's literal Independent Test — cookie decoded, not just "login succeeds" |
| P1 (RBAC-05/06) | Route-family conformance across 6 roles | `tests/api/route-guard-conformance.test.ts:170-240` — parametrized over every route file × role, asserts exact 401/403/pass per family matrix | `src/lib/auth/route-family.ts` (`classifyRoute`, `isFamilyAllowedForRole`) wired through `src/lib/auth/access-policy.ts:isAllowedForRole` and `require-session.ts:requireStaffSession` | Full sweep, not a sampled subset |
| P2 (RBAC-11..14) | Hierarchy matrix, cross-empresa denial, no self-signup | `tests/application/create-account.test.ts` (unit, in-memory, full matrix incl. patient/partner-can't-provision) + `tests/api/accounts-provisioning.test.ts` (HTTP+PGlite, 403 on cross-hierarchy, 200 for 2nd company_admin) + `tests/api/no-self-registration.test.ts` (401 with no session, plus filesystem sweep for register/signup routes) | `src/domain/auth/role-hierarchy.ts` (`canProvision`), `src/application/auth/create-account.ts` (`CreateAccount.execute`), `src/app/api/accounts/route.ts` | 403 for company_admin→super_admin, 403 for atendente→profissional, 200 for atendente→patient — matches spec table exactly |
| P3 (RBAC-15/16) | Atendente: operational success, clinical 403 | `tests/api/atendente-operational-scope.test.ts` — GET/POST appointments/patients/partners succeed (200), GET evolutions/assessments/photos → 403 | `route-family.ts` `FAMILY_ALLOWED_ROLES.clinical` excludes `atendente` | Matches AC literally, distinct from generic conformance sweep |
| P4 (RBAC-17..21) | Immediate access on patient creation, 404 for no link, transfer-of-case scenario | `tests/api/professional-patient-scope.test.ts` — full journey: Dr. A registers patient → 200 immediate access; Dr. Forasteiro → 404; Dr. B gets appointment → both Dr. A and Dr. B retain 200 access; Forasteiro still 404 after transfer | `src/lib/auth/professional-patient-scope.ts` (`assertPatientAccessibleToProfessional`, 404 via `NotFoundError`), `src/infrastructure/persistence/drizzle/professional-patient-link-repository.ts` (`ensureLink` idempotent via `onConflictDoNothing`), call sites in `patients/route.ts`, `appointments/route.ts`, `evolutions/route.ts` | Covers all 5 P4 ACs in one end-to-end test, exactly the spec's Independent Test (a)/(b)/(c) |

No spec-precision gaps found: every sampled test asserts the specific status code / session field / list-emptiness the spec calls for, not a generic "doesn't error" check.

## 2. Discrimination sensor

Isolated worktree: `git worktree add --detach /tmp/verify-issue20 feature/issue-20` (node_modules symlinked, `.env` copied). 3 mutants injected one at a time into real implementation files (never test files), reverted after each via backup copy + `git diff --stat`/`git status --porcelain` confirming a clean tree before removal.

| # | Mutant | File | Change | Result |
| --- | --- | --- | --- | --- |
| 1 | Disable vínculo check | `src/lib/auth/professional-patient-scope.ts` | `assertPatientAccessibleToProfessional` body replaced with unconditional `return` | **Killed** — `tests/api/professional-patient-scope.test.ts` failed (expected 404, got 200 for unlinked professional) |
| 2 | Remove Atendente's exclusion from `clinical` family | `src/lib/auth/route-family.ts` | Added `"atendente"` to `FAMILY_ALLOWED_ROLES.clinical` | **Killed** — 18 failures across `tests/api/route-guard-conformance.test.ts` and `tests/api/atendente-operational-scope.test.ts` (expected 403, got 200/other) |
| 3 | No-op hierarchy check | `src/domain/auth/role-hierarchy.ts` | `canProvision` always returns `true` | **Killed** — 30 failures across `tests/domain/role-hierarchy.test.ts`, `tests/application/create-account.test.ts`, `tests/api/accounts-provisioning.test.ts` |

**3/3 mutants killed. No surviving mutants.**

Worktree cleanup confirmed: `git worktree remove /tmp/verify-issue20 --force` succeeded, `git worktree list` shows it gone, and `git status`/`git diff` on the main checkout `feature/issue-20` show no residue from the mutation work (the only pending change, `AGENTS.md`, is the pre-existing `next dev`-regenerated banner documented in `AGENTS.md` itself, unrelated to this verification).

## 3. Result

No grounded failures found (no surviving mutant, no spec-precision gap, no failed AC). Per the Verifier protocol, no lessons were distilled — clean PASS records nothing in `.specs/LESSONS.md`.
