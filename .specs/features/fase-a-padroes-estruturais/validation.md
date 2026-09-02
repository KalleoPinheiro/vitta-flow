# Fase A — Padrões Estruturais Validation

**Date**: 2026-09-02
**Spec**: `.specs/features/fase-a-padroes-estruturais/spec.md`
**Diff range**: `86c65d7..fix/fase-a-padroes-estruturais` (34 commits, T1-T34)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1-T5 | ✅ Done | `useApiQuery.isLoading` implemented; Prontuário sections migrated |
| T6-T16 | ✅ Done | `overflow-x-auto` confirmed on all 11 pages |
| T17 | ✅ Done | `e2e/responsive-tables.spec.ts` — 12/12 pass in isolation |
| T18-T30 | ⚠️ Partial | `ConfirmAction` + 12 call sites implemented and unit-tested, but the pre-existing e2e specs covering the same 12 flows were never updated for the new confirmation step — see Gate Check |
| T31-T34 | ⚠️ Partial | Toast wired in the 4 target files' primary handlers, but 3 additional mutation handlers inside those same files/pages were left without toast (see AC table, Story 4) |

---

## Spec-Anchored Acceptance Criteria

### P1: Contrato de erro de 3 estados no `useApiQuery`

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: isLoading true during fetch | `isLoading:true`, data/error unchanged until settle | `tests/lib/hooks.test.tsx:65-81` — `expect(result.current.isLoading).toBe(true)` before resolve, `.toBe(false)` after | ✅ PASS |
| AC2: error on 4xx/5xx, isLoading false, page renders distinct error UI (never generic EmptyState) | error message actionable + isLoading false + non-EmptyState UI | `src/lib/use-api-query.ts:38-40`; `tests/lib/hooks.test.tsx:97-104` (hook-level); `tests/pages/staff-paciente-detail.test.tsx:1411-1417` (page-level, asserts `ErrorAlert` text present AND "Nenhuma evolução registrada." absent) | ✅ PASS |
| AC3: success + empty → EmptyState, never error UI | EmptyState renders, no error UI | `src/app/(staff)/pacientes/[id]/evolutions-section.tsx:130-136` (order isLoading→error→empty); no direct empty-array unit test found separately from AC2's negative assertion | ⚠️ Spec-precision gap (covered indirectly, not by a dedicated empty-success assertion) |
| AC4: Prontuário pages (evoluções/condições/planos/fotos) on 4xx/5xx show actionable error **with retry option via `refresh`** | error UI **+ a retry control wired to `refresh()`** | **No evidence found.** `src/components/feedback.tsx:13-19` (`ErrorAlert`) has no button/retry affordance; none of `evolutions-section.tsx`, `conditions-section.tsx`, `care-plans-section.tsx`, `condition-photos.tsx` render a retry control. Repo-wide grep for "tentar novamente"/"retry" in `src/` and `tests/`: 0 matches. | ❌ **GAP** — evidence-or-zero: no retry UI exists anywhere |
| AC5: pages that treated error as empty are migrated to check `error` before `data` | order corrected | `evolutions-section.tsx:130-136`, `conditions-section.tsx:100-101`, `care-plans-section.tsx:73-78` all check `isLoading → error → empty` | ✅ PASS |

**Status**: ❌ Gap present (AC4) — a precisely-worded, testable spec requirement ("opção de tentar novamente via `refresh`") was never implemented on any of the 4 target components.

### P1: Sidebar/shell sem scroll horizontal em mobile

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: sidebar off-canvas below 1024px | drawer behavior preserved | `src/app/(staff)/staff-layout-client.tsx:24` (`defaultOpen={false}`); confirmed pre-existing, not reimplemented | ✅ PASS |
| AC2: 11 named pages wrap table in `overflow-x-auto` | wrapper present on each | `faturamento/page.tsx:52`, `relatorios/page.tsx:76,125`, `profissionais/page.tsx:70`, `pacientes/page.tsx:41`, `parceiros/page.tsx:72`, `auditoria/page.tsx:85`, `procedimentos/page.tsx:76`, `configuracoes/page.tsx:356`, `materiais/page.tsx:199`, `documentos/plano-cuidados/[carePlanId]/page.tsx:92,126`, `documentos/relatorio/[conditionId]/page.tsx:97` — all 11 confirmed by direct grep | ✅ PASS |
| AC3: touch targets ≥44×44px on shell controls | SidebarTrigger etc. ≥44px | `staff-layout-client.tsx:44` (`min-h-11 min-w-11`); `e2e/responsive-tables.spec.ts:213-221` — `expect(box!.width/height).toBeGreaterThanOrEqual(44)` | ✅ PASS (test run: 1/1 pass) |
| AC4: viewport 375px → `scrollWidth` == viewport width | no page-level horizontal scroll | `e2e/responsive-tables.spec.ts:29-33` (`expectNoHorizontalScroll`), applied to all 11 pages + documented `min-w-0` shell fix at `staff-layout-client.tsx:27` | ✅ PASS (11/11 pages pass when run in isolation, see Gate Check) |

**Status**: ✅ All ACs covered when run in isolation (`e2e/responsive-tables.spec.ts` alone: 12/12 pass). See Gate Check for a full-suite caveat unrelated to this story's own spec (a flaky scheduling collision in one test, absorbed by retry).

### P1: `AlertDialog` em todas as ações destrutivas/irreversíveis

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: 12 destructive actions open `AlertDialog` with specific copy | dialog opens, copy names real consequence | `src/components/confirm-action.tsx` used at all 12 call sites (dashboard×3, faturamento, parceiros, pacientes, procedimentos, profissionais, configuracoes, care-plans-section, conditions-section, condition-photos); copy verified e.g. `conditions-section.tsx:149-150` ("A condição é travada permanentemente. Não existe ação de reabrir depois.") | ✅ PASS (unit level) |
| AC2: confirm executes the same API call as before | unchanged API call on confirm | `tests/components/confirm-action.test.tsx:32-53` (`onConfirm` called once); per-page unit tests updated (e.g. `tests/pages/staff-pacientes-list.test.tsx`) | ✅ PASS (unit level) — ❌ **GAP at e2e level**, see below |
| AC3: cancel/Esc/click-outside never calls the API | no dispatch | `tests/components/confirm-action.test.tsx:56-98` (cancel + Escape, both assert `onConfirm` not called); page-level cancel tests present for pacientes (`staff-pacientes-list.test.tsx:289-309`), procedimentos, faturamento, and configuracoes/profissionais/parceiros (`staff-operations.test.tsx:541-567,986-1013,1437-1456`) | ✅ PASS |
| AC4: new destructive action without `AlertDialog` requires recorded justification | process rule, not a runtime assertion | N/A — organizational rule, not independently testable in code | ⚠️ Spec-precision gap (not code-checkable; no evidence expected) |

**Status**: ❌ **GAP** — see Gate Check: the 8 pre-existing e2e specs that exercise these exact 12 flows end-to-end (`equipe.spec.ts`, `pacientes.spec.ts`, `clinico.spec.ts`, `followup.spec.ts`, `plano-cuidados.spec.ts`, `triagem.spec.ts` ×2) were never updated for the new confirmation step and now fail against real HTTP/DB — the migration is proven only at the unit/mock level, not end-to-end. `tasks.md`'s own Phase 3 status note admits: "E2E completo não executado nesta fase" — an unverified assumption that later turned out false.

### P1: Feedback de sucesso (toast) após toda ação de escrita

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: every successful mutation on the 4 named pages fires a success toast via `useToast` | toast fired, page-scoped (not handler-scoped) | `pacientes/page.tsx:162-165,184-187`; `configuracoes/page.tsx:228-231,299` (AccountsSection only); `portal/patient-view.tsx:57`; `portal/consent-card.tsx:50` — **but** `configuracoes/page.tsx:96-104` (`ScheduleSection.save`, a `PUT` mutation) uses an inline `<Alert variant="success">` instead of `toast()`; `configuracoes/page.tsx:240-260` (`resendInvite`, a `POST` mutation) uses `setActionNotice` instead of `toast()`; `portal/consent-card.tsx:106-127` (`PatientPhotoUpload.upload`, a `POST` mutation in the same file named by the spec) uses local `sent`/`error` state, no `toast()` | ❌ **GAP** — 3 mutation handlers inside the 4 spec-named files/pages have no toast, contradicting the page-level wording of AC1 ("toda mutação... nas páginas [X]") |
| AC2: failed mutation → `variant="danger"` toast with message | danger toast on error | `pacientes/page.tsx:192`, `configuracoes/page.tsx:236,474`, `portal/patient-view.tsx:62`, `portal/consent-card.tsx:55` | ✅ PASS (for the handlers that do call `toast`) |
| AC3: successful mutation → `variant="success"` toast | success toast | Same locations as AC1's covered handlers | ⚠️ **Spec-precision gap at test level** — see Discrimination Sensor: no test in the repo asserts the toast's `variant` (only its text), so a swapped `success`/`danger` variant would ship undetected |
| AC4: new toast usage reuses the central `useToast` hook, not ad-hoc | single hook, no divergent implementation | 3 of the handlers above (`ScheduleSection.save`, `resendInvite`, `PatientPhotoUpload.upload`) implement their own ad-hoc inline notice instead of reusing `useToast` | ❌ **GAP** (same 3 handlers as AC1) |

**Status**: ❌ Gaps present (AC1/AC4 scope-narrowing; AC3 test-precision gap confirmed by sensor).

---

## Discrimination Sensor

All mutations injected via direct file edit on the clean working tree, run against the targeted test file, then reverted with `git checkout --`; tree confirmed clean before and after.

| # | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `src/lib/use-api-query.ts:23` | Flipped `settledKey !== requestKey` → `settledKey === requestKey` (inverts `isLoading`) | ✅ Killed — 3 tests in `tests/lib/hooks.test.tsx` failed |
| 2 | `src/components/confirm-action.tsx:55` | Removed the `onConfirm()` call from `AlertDialogAction.onClick` | ✅ Killed — `tests/components/confirm-action.test.tsx` "confirmação" test failed |
| 3 | `src/app/(staff)/pacientes/[id]/evolutions-section.tsx:132-135` | Swapped render order to check `evolutions.length === 0` before `error` (error would render as generic empty state) | ✅ Killed — `tests/pages/staff-paciente-detail.test.tsx:1411-1417` failed |
| 4 | `src/app/(staff)/pacientes/page.tsx:164` | Flipped `handleSubmit` success toast `variant: "success"` → `variant: "danger"` | ❌ **Survived** — `tests/pages/staff-pacientes-list.test.tsx` (11/11 still pass): the test asserts only the toast's text ("Paciente criado"), never its `variant`/CSS class (`sv-toast--success` vs `sv-toast--danger`, confirmed present and queryable in `node_modules/@still-void/ui/dist/react/client/index.js:726`) |

**Sensor depth**: lightweight (4 targeted mutations across the feature's highest-risk new code: hook state, dialog confirmation gate, error/empty ordering, toast variant)
**Result**: 3/4 killed — ❌ **1 survived** (mutation #4)

---

## Interactive UAT Results

Not performed — backend/structural, non-visual-judgment feature; automated checks are sufficient per skill guidance (Level 3 is reserved for complex user-facing behavior requiring human judgment).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ (documented Phase 1/Phase 2 deviations are both justified and narrowly scoped) |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ❌ (toast variant never asserted — see Sensor #4; retry-via-refresh never implemented — see Story 1 AC4) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ (12 destructive-action flows covered only at unit/mock level, not e2e — see Gate Check) |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed | `AGENTS.md` (90% coverage minimum) — met (96.65% statements) |

---

## Edge Cases

- [x] `url === null` → `isLoading:false, data:null, error:null` — `tests/lib/hooks.test.tsx:107-113`
- [x] `AlertDialog` open + underlying action fails after confirm → error toast fires (composes with Story 4) — confirmed by code path (`onConfirm` = existing mutation handler that already has its own try/catch + toast)
- [x] Empty table (0 rows) still gets `overflow-x-auto` wrapper — wrapper is unconditional markup in all 11 pages, not conditional on row count
- [x] Two toasts in rapid succession → default `ToastProvider` queue/max behavior, no change made — confirmed no custom queuing code added

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run check:sv && npm run test:coverage && npm run test:e2e`
- **`typecheck`**: ✅ pass (no errors)
- **`lint`**: ✅ pass ("ESLint: No issues found")
- **`check:sv`**: ✅ pass ("OK — adoção do @still-void/ui v2 completa")
- **`test:coverage`**: ✅ pass — 96.65% statements / 91.17% branches / 96.56% functions / 96.72% lines (exceeds AGENTS.md's 90% minimum), exit code 0
- **`test:e2e`** (full suite): ❌ **FAIL** — **8 failed, 1 flaky, 73 passed**

**Failing e2e tests** (all pre-existing specs covering the 12 `ConfirmAction`-migrated flows, none updated for the confirmation step):
1. `e2e/clinico.spec.ts:110` — "condição resolvida bloqueia novas avaliações"
2. `e2e/equipe.spec.ts:28` — "desativa e reativa um profissional"
3. `e2e/equipe.spec.ts:71` — "desativa um parceiro"
4. `e2e/followup.spec.ts:24` — "retorno atrasado mostra alerta e pode ser cancelado"
5. `e2e/pacientes.spec.ts:39` — "inativa um paciente e bloqueia novo agendamento para ele"
6. `e2e/plano-cuidados.spec.ts:125` — "plano resolvido fica somente-leitura"
7. `e2e/triagem.spec.ts:38` — "mantém o plano: foto sai da fila sem gerar retorno"
8. `e2e/triagem.spec.ts:64` — "antecipa retorno: foto sai da fila e cria um retorno pendente"

Root cause confirmed by reading the failing specs (e.g. `e2e/equipe.spec.ts:37-38`): the test clicks the destructive button and immediately asserts the post-mutation state (`await row.getByRole("button", { name: "Desativar" }).click(); await expect(row.getByText("Inativo")).toBeVisible();`) — with `ConfirmAction` now gating the click behind a dialog, the button click alone no longer executes the mutation, so the assertion times out. This is a real, reproducible regression, not flakiness (also reproduced by design: 12/12 `ConfirmAction` unit tests pass because they explicitly click the confirm button, while these e2e specs never learned to).

- **1 flaky**: `e2e/responsive-tables.spec.ts:102` ("relatórios") — failed once on a `409 Horário indisponível` scheduling collision unrelated to this feature's own assertions, passed on retry. Consistent with `tasks.md`'s own note ("1 flaky por colisão de horário, absorvida pelo retry padrão da suíte").
- **Test count before feature**: not independently reconstructed (would require checking out `86c65d7`); coverage/count deltas were not verified against a pre-feature baseline for this report — flagged as a residual gap in verification depth, not a finding against the feature itself.
- **Skipped tests**: none observed in either run.

**Conclusion**: the mandatory Build gate does **not** pass. `npm run test:e2e` fails with 8 real failures directly caused by this feature's Story 3 changes.

---

## Fix Plans

### Fix 1: Update the 8 failing e2e specs for the `ConfirmAction` confirmation step

- **Root cause**: `ConfirmAction` (T18-T30) intercepts the destructive button click behind an `AlertDialog`; the pre-existing e2e specs for these same 12 flows (`clinico.spec.ts`, `equipe.spec.ts` ×2, `followup.spec.ts`, `pacientes.spec.ts`, `plano-cuidados.spec.ts`, `triagem.spec.ts` ×2) still click the original button and expect the mutation to have executed immediately.
- **Fix task**: In each failing spec, after clicking the trigger button, add a step that clicks the dialog's confirm action (e.g. `page.getByRole("alertdialog").getByRole("button", { name: <confirmLabel> }).click()`) before asserting the post-mutation state. Confirm labels are visible in the corresponding call sites (e.g. `conditions-section.tsx:151` `confirmLabel="Confirmar"` or similar per page).
- **Priority**: Blocker (mandatory Build gate command fails)

### Fix 2: Implement retry-via-`refresh` on the Prontuário error state (Story 1, AC4)

- **Root cause**: `ErrorAlert` (`src/components/feedback.tsx`) is a static alert with no action; none of `evolutions-section.tsx`, `conditions-section.tsx`, `care-plans-section.tsx`, `condition-photos.tsx` wire a retry button to the already-available `refresh()` (or, for `condition-photos.tsx`, `load()`).
- **Fix task**: Extend `ErrorAlert` with an optional `onRetry` prop rendering a "Tentar novamente" button, and pass `refresh`/`load` from each of the 4 consuming components.
- **Priority**: Major (explicit, precisely-worded spec AC with zero implementation)

### Fix 3: Cover the 3 orphaned mutation handlers with toast (Story 4, AC1/AC4)

- **Root cause**: `ScheduleSection.save` and `resendInvite` in `configuracoes/page.tsx`, and `PatientPhotoUpload.upload` in `portal/consent-card.tsx`, were excluded from the toast migration by the implementer's own narrower reading of task scope ("criar/editar/desativar conta" / "ação de assinar/consentir"), which conflicts with the spec's page-level wording ("toda mutação... nas páginas [X]").
- **Fix task**: Either (a) add `toast()` calls to the 3 handlers reusing the same pattern as their sibling handlers, or (b) if the narrower scope is intentional, get it explicitly ratified (spec update or ADR) rather than left as an unreviewed implementer decision in `tasks.md`'s prose.
- **Priority**: Major (contradicts literal, unambiguous AC wording)

### Fix 4: Add toast-variant assertions to kill the surviving mutant (Story 4, AC3)

- **Root cause**: no test in the repo asserts a toast's `variant` (success vs. danger) — only its text — even though `@still-void/ui` renders a queryable `sv-toast--{variant}` class.
- **Fix task**: In `tests/pages/staff-pacientes-list.test.tsx` and the equivalent tests for `configuracoes`, `portal/patient-view`, `portal/consent-card`, assert the toast's variant class (e.g. `screen.getByText(...).closest(".sv-toast--success")`) alongside the existing text assertion.
- **Priority**: Major (weak test caught by discrimination sensor)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| FASEA-01 | Implementing | ✅ Verified |
| FASEA-02 | Implementing | ✅ Verified |
| FASEA-03 | Implementing | ⚠️ Spec-precision gap |
| FASEA-04 | Implementing | ❌ Needs Fix (retry-via-refresh missing) |
| FASEA-05 | Implementing | ✅ Verified |
| FASEA-06 | Implementing | ✅ Verified |
| FASEA-07 | Implementing | ✅ Verified |
| FASEA-08 | Implementing | ✅ Verified |
| FASEA-09 | Implementing | ✅ Verified |
| FASEA-10 | Implementing | ✅ Verified (unit) |
| FASEA-11 | Implementing | ❌ Needs Fix (e2e regression) |
| FASEA-12 | Implementing | ⚠️ Spec-precision gap (process rule, not code-checkable) |
| FASEA-13 | Implementing | ❌ Needs Fix (e2e regression, same root cause as FASEA-11) |
| FASEA-14 | Implementing | ❌ Needs Fix (3 orphaned handlers) |
| FASEA-15 | Implementing | ❌ Needs Fix (same) |
| FASEA-16 | Implementing | ⚠️ Spec-precision gap (variant never test-asserted) |
| FASEA-17 | Implementing | ❌ Needs Fix (ad-hoc implementations in 3 handlers) |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 9/17 ACs cleanly PASS, 4 spec-precision gaps flagged, 4 GAPs confirmed with file:line evidence (Story 1 AC4 retry; Story 3 AC2 e2e coverage; Story 4 AC1/AC4 orphaned handlers)
**Sensor**: 3/4 mutations killed, 1 survived (toast variant untested)
**Gate**: typecheck/lint/check:sv/test:coverage all pass; **test:e2e fails (8 failed, 1 flaky, 73 passed)**

**What works**: `useApiQuery.isLoading` contract is solid and well-tested (hook + page level); all 11 tables have `overflow-x-auto`; the mobile shell `min-w-0`/touch-target fix genuinely resolves the documented Phase 2 deviation (12/12 e2e pass in isolation); `ConfirmAction` itself is a clean, well-tested component with all 4 of its own behaviors (open/confirm/cancel/Escape) correctly asserted; 3 of the 4 toast pages' primary handlers are correctly wired.

**Issues found**:
1. **Blocker** — `npm run test:e2e` (the mandatory Build gate command) fails: 8 pre-existing specs covering the very 12 flows this feature changed were never updated for the new `AlertDialog` confirmation step. This is not a flake; it is a reproducible behavioral regression proven by reading the failing assertions against the new code.
2. **Major** — Story 1 AC4's explicit "retry via `refresh`" requirement has zero implementation anywhere in the 4 migrated Prontuário components.
3. **Major** — Story 4's page-level toast requirement is violated by 3 mutation handlers (`ScheduleSection.save`, `resendInvite`, `PatientPhotoUpload.upload`) that use ad-hoc inline notices instead of `useToast`, contradicting both AC1 and AC4 of that story.
4. **Major** — the discrimination sensor found a real, exploitable test-weakness: toast `variant` is never asserted anywhere, so a `success`/`danger` swap ships silently.

**Next steps**: Fix 1 (update the 8 e2e specs) is the blocking item — it must land before this branch can be considered done, since it fails the feature's own declared Build gate. Fixes 2-4 should be scoped as fix tasks and routed back through the implement→verify cycle (iteration 1 of the bounded 3).
