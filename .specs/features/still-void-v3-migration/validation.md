# still-void-v3-migration Validation (iteração 2)

**Date**: 2026-08-25
**Spec**: `.specs/features/still-void-v3-migration/spec.md`
**Diff range (full feature)**: `c30c632..7a3e385` (49 commits)
**Diff range (this iteration's fixes)**: `0f146a6..7a3e385` (5 commits)
**Verifier**: independent sub-agent (author ≠ verifier) — re-derived from scratch, iteration 1's report read only for context on what to re-check, not trusted as evidence

---

## Task Completion

39/39 tasks (T1–T39) marked `[x]` in `tasks.md`, zero unchecked items. The 5 fix commits from this iteration (`d1792ac`, `bcb2b41`, `26568ec`, `d6a076e`, `7a3e385`) are test-only additions layered on top of the already-complete task list — no task status changed, consistent with them being Verifier-routed fix tasks rather new spec tasks.

---

## Re-verification of the 3 Major gaps from iteration 1

### Gap 1 — RadioGroup: 2/3 groups untested + structural regression undetected

**Fix**: `d1792ac` added mutual-exclusivity tests for `intervention-priority` and `outcome-score` (the 2 previously-untested groups), and — critically — a `name`-attribute assertion (`toHaveAttribute("name", "<group>")`) on **all 3** groups, including the previously-tested `diagnosis-type`.

**Re-verification**: read `tests/pages/staff-paciente-care-plans.test.tsx` — confirmed all 3 groups (`diagnosis-type` line ~528, `intervention-priority` line ~537-548, `outcome-score` line ~570-608) now assert `toHaveAttribute("name", ...)` on every rendered radio, plus click-driven mutual-exclusivity assertions.

**Sensor repeat**: wrapped `RadioGroupItem` in an extra `<div>` inside the `intervention-priority` group (`care-plans-section.tsx:880-891`, the one iteration 1 did NOT mutate) via `Edit`, ran `npx vitest run tests/pages/staff-paciente-care-plans.test.tsx`, reverted via `git checkout --`.
**Result**: ❌→✅ **Killed** — `expect(element).toHaveAttribute("name", "intervention-priority")` failed with `Received: null`, exactly the mechanism iteration 1 found missing. **Gap 1 is resolved.**

### Gap 2 — Print-table neutral override (`text-black`) has zero regression protection

**Fix**: `26568ec` added check `[13]` to `scripts/check-sv-adoption.sh` — an `awk` line-scan over `src/app/documentos/**/*.tsx` that flags any `<Table ...>`/`<TableHead ...>` opening tag missing `text-black` on the same line — plus 4 fixture tests in `tests/scripts/check-sv-adoption.test.ts` proving positive detection, clean-pass, and out-of-scope exclusion.

**Re-verification**: ran `npm run check:sv` clean — check `[13]` reports `✓`. Read the script logic (`scripts/check-sv-adoption.sh:214-229`) — the pattern matches both `plano-cuidados/[carePlanId]/page.tsx` and `relatorio/[conditionId]/page.tsx` (both live under `src/app/documentos/**`).

**Sensor repeat**: removed `text-black` from the NOC `<Table>` in `plano-cuidados/[carePlanId]/page.tsx:92` via `sed`, ran `npm run check:sv`, reverted via `git checkout --`.
**Result**: ❌→✅ **Killed** — exit code 1, output: `✗ [override text-black ausente em tabela de documentos] 1 achado(s)` pointing at the exact mutated line. **Gap 2 is resolved.**

### Gap 3 — Header nav regression (SV3-03 P1 AC) had zero test coverage

**Fix**: `d6a076e` added `tests/components/portal-layout.test.tsx` — but instead of asserting nav `href`s (which the AC's literal wording demands), it asserts the logo, subtitle, logout action, and the **confirmed absence** of `<nav>`/`<summary>`/`<details>`.

**Independent judgment** (not inherited from the fix agent's claim — re-derived from git history myself):
- `git diff c30c632..7a3e385 --stat -- src/app/portal/layout.tsx` → **empty**. This migration's 49 commits never touch `layout.tsx` at all.
- `git show f14dec5:src/app/portal/layout.tsx` (the commit that first adopted `@still-void/ui`, predating this v3 migration) → `<Header logo={...} actions={<LogoutButton />} />`, **no `items` prop**, identical to the current file.
- `git show 161f074:src/app/portal/layout.tsx` (pre-still-void, plain HTML `<header>`) → also **no nav**, just brand + logout button.

**Conclusion**: the absence of navigation items in the portal `Header` is not a regression of this migration — it never existed, neither in the pre-still-void version nor in the first still-void adoption, nor after this v3 bump. Spec.md's AC4 ("o `<nav>` do `Header` SHALL continuar expondo os mesmos itens de navegação, com os mesmos `href`") describes a behavior the app never had. The fix agent's adaptation — protecting what is real (brand/subtitle/logout, and the *confirmed* absence of nav) instead of fabricating nav assertions for a feature that doesn't exist — is the correct response to a spec-precision defect, not a regression cover-up. **Judgment: válido.** This is new information beyond iteration 1 (which flagged the AC as simply uncovered, not as possibly describing a non-existent behavior), and is recorded as a lesson below.

**Gap 3 is resolved** — with the caveat that spec.md's AC4 wording itself is imprecise (see Requirement Traceability note).

---

## Minor/Cosmetic fixes — confirmed present

| Fix | Commit | Confirmed |
| --- | --- | --- |
| Modal negative assertion: `queryByText` → `queryByRole` | `bcb2b41` | `tests/components/modal.test.tsx:46` now reads `expect(screen.queryByRole("button", { name: "Close dialog" })).not.toBeInTheDocument();` — targets accessible name as spec wording requires |
| FileInput `accept`/`disabled`/value-reset assertions | `7a3e385` | Both call sites (`tests/pages/portal.test.tsx:920-936`, `tests/pages/staff-paciente-detail.test.tsx`) now assert `accept` attribute, `disabled` before/during/after, and `input.value === ""` after upload |

**New finding on the FileInput fix** (not present in iteration 1, surfaced by sensor mutation this iteration): the `accept` and `disabled` assertions discriminate correctly (confirmed by mutation below), but the `expect(input.value).toBe("")` assertion does **not** — see Discrimination Sensor #4.

---

## Spec-Anchored Acceptance Criteria (all 21 requirements, re-derived from scratch)

| Requirement | Spec-defined outcome | `file:line` + evidence | Result |
| --- | --- | --- | --- |
| SV3-01 | `package.json` declares `^3.1.0`; installed package `version` starts with `3.` | `package.json:21` `"@still-void/ui": "^3.1.0"`; `node_modules/@still-void/ui/package.json:3` `"version": "3.1.0"` | ✅ PASS |
| SV3-02 | `showCloseButton={false}`; exactly 1 "Fechar", 0 "Close dialog" (accessible name) | `src/components/modal.tsx:58` `showCloseButton={false}`; `tests/components/modal.test.tsx:44-46` `getAllByLabelText("Fechar")).toHaveLength(1)` + `queryByRole("button", {name:"Close dialog"})).not.toBeInTheDocument()` | ✅ PASS (spec-precision gap from iter. 1 closed) |
| SV3-03 | Header nav preserved, `<summary>` non-empty name | `src/app/portal/layout.tsx` (untouched by migration, confirmed via `git diff c30c632..7a3e385 --stat`); `tests/components/portal-layout.test.tsx:34-53` asserts real behavior (logo/subtitle/logout, confirmed absent nav) | ✅ PASS — AC4 itself describes a non-existent pre-migration behavior (see judgment above); test protects what is real |
| SV3-04 | 0 raw `<select` in `src/**/*.tsx` (baseline 23) | `find src -name "*.tsx" | xargs grep -n "<select"` → 1 hit, inside a `{/* SPEC_DEVIATION */}` comment at `procedimentos/page.tsx:304` — 0 live elements | ✅ PASS |
| SV3-05 | 0 raw `<textarea` (baseline 7) | same sweep → 0 | ✅ PASS |
| SV3-06 (select) | `NativeSelect` preserves `name`/`value`/`onChange`/`required`/`disabled`/options, serializes in `FormData` | `care-plans-section.tsx:156-167` spreads props; `tests/pages/staff-paciente-care-plans.test.tsx` exercises submit payload | ✅ PASS |
| SV3-06 (radio) | 3 `RadioGroup`s, direct-child `RadioGroupItem`, `legendHidden`, mutual exclusivity | `care-plans-section.tsx:638-649,880-891,932-941` — all direct-child; `tests/pages/staff-paciente-care-plans.test.tsx` — all 3 groups now behavior + `name`-attribute tested (see Gap 1 above) | ✅ PASS |
| SV3-06 (checkbox) | Toggles `values.active`, accessible label preserved | `materiais/page.tsx:389-396`; `tests/pages/staff-materiais.test.tsx:432-438` `toMatchObject({..., active:false})` | ✅ PASS |
| SV3-06 (FileInput) | Preserves `accept`/`disabled`/`onChange`/value-reset, 2 call sites | `consent-card.tsx:155-164`, `condition-photos.tsx:93-101` — all 4 preserved in source; tests assert `accept`+`disabled` (discriminating), `value`-reset assertion present but not discriminating in jsdom (see Sensor #4) | ✅ PASS (implementation correct; 1 non-discriminating assertion noted, not blocking — see Fix Plans) |
| SV3-07 | `src/lib/ui.ts` absent; 0 `nativeField`/`accentButton` in `src` | `ls src/lib/ui.ts` → not found; `grep -rn "nativeField\|accentButton" src` → 0 | ✅ PASS |
| SV3-08 | 0 raw `<table`; `Table` family with `role="table"`, same columns, `sv-table-container`; print override survives | `find src -name "*.tsx" | xargs grep -n "<table"` → 0; `pacientes/page.tsx`, `relatorios/page.tsx` use `Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell`; print override protected by gate check `[13]` (Gap 2, resolved) | ✅ PASS |
| SV3-09 | 0 `accentButton` (baseline 59); `Button variant="accent"` preserves `type`/`disabled`/`onClick`/text | `grep -rc accentButton src -r` → 0; spot-checked `login/page.tsx`, `pacientes/page.tsx`, `faturamento/page.tsx` → `Button variant="accent"` | ✅ PASS |
| SV3-10 | Gaps doc: version 3.1.0, 14 closed sections absent, 4 kept, 2 new, each cross-checked against `.d.ts` export lines | `docs/still-void-gaps.md:5` version 3.1.0; sections present: `pagination`, `progress`, `separator`, `data-chart`, `icon-set-gaps`, `dialog-close-label` — exactly 4 old + 2 new, 0 of the 14 closed-gap sections found | ✅ PASS |
| SV3-11 | Field validation attrs preserved byte-for-byte via `...props` spread | `NativeSelect`/`Textarea`/`FileInput`/`Checkbox`/`RadioGroupItem` call sites spread props (spot-checked across `care-plans-section.tsx`, `consent-card.tsx`, `materiais/page.tsx`) | ✅ PASS |
| SV3-12 | Atomic commits, gate green per commit | 39/39 tasks `[x]`; commit log shows one scoped commit per task, `docs(tasks)` execution notes for 2 documented mid-flight fixes (T17, T30) | ✅ PASS |
| SV3-13 | 0 new `"use client"` from this migration | `git diff c30c632..7a3e385 -- '*.tsx' \| grep '^+.*use client'` → 0 | ✅ PASS |
| SV3-14 | Lockfile updated, 0 new HIGH/CRITICAL audit findings | `package-lock.json` has the 5 Radix deps + `@heroicons/react`; `npm audit --json` → `{high:0, critical:0, moderate:4}` (pre-existing `esbuild`/`drizzle-kit` chain) | ✅ PASS |
| SV3-15 | Controlled-field state semantics; radio `name` mechanism intact | Same evidence as SV3-06 radio row; sensor mutation confirms the `name`-injection mechanism is now actually tested (Gap 1) | ✅ PASS |
| SV3-16 | `check:sv` extended with 5 (now 6, incl. fix `[13]`) new checks, fixture-tested | `scripts/check-sv-adoption.sh` — 12 checks total incl. `[13]`; `tests/scripts/check-sv-adoption.test.ts` — fixture tests prove positive detection for each | ✅ PASS |
| SV3-17 | `Card as=`/`asChild` at 9 points, same HTML tag, manual surface classes gone | `grep -rn "sv-gap: card-as-element" src` → 0 (all closed); `care-plans-section.tsx:70` `Card as="li"` direct child of `<ul>` | ✅ PASS |
| SV3-18 | Covered glyphs (`✕`,`⚠`,`✓`) → 0 occurrences | `find src -name "*.tsx" \| xargs grep -n "✕\|⚠\|✓"` → 0 | ✅ PASS |
| SV3-19 | Uncovered glyphs (`📷`,`⛔`,`⏳`) unchanged, `sv-gap: icon-set-gaps` marker | `page.tsx:222-223` (📷), `materiais/page.tsx:153-154,160-161` (⛔,⏳) — each preceded by the marker comment; `docs/still-void-gaps.md` `icon-set-gaps` section lists exactly these | ✅ PASS |
| SV3-20 | `@import "@still-void/ui/tailwind.css";`; manual `@source`/`--color-sv-*` gone | `src/app/globals.css:7` import present; `@source`/`--color-sv-*`/`--color-background`/`--color-ring`/`--color-destructive*` absent | ✅ PASS |
| SV3-21 | App semantic bridge (AD-006) unchanged | `src/app/globals.css` — `--color-accent`, `--font-*`, `--radius-*` etc. present and unchanged | ✅ PASS |

**Status**: ✅ 21/21 acceptance criteria matched their spec-defined outcome. 0 gaps. 1 non-blocking discrimination note (SV3-06 FileInput value-reset assertion, see Sensor #4 and Fix Plans).

---

## Discrimination Sensor

All mutations applied to the real working tree via `Edit`/`sed`, tested, then reverted via `git checkout -- <file>` (single-file scope, never a broad reset); final state confirmed identical to session start via `git diff --stat HEAD` (0 unexpected diffs) and a clean `npm test` re-run (1815/1815 passing).

| # | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `src/app/(staff)/pacientes/[id]/care-plans-section.tsx:880-891` | Wrapped `RadioGroupItem` in a `<div>` inside the `intervention-priority` group (the group iteration 1's sensor did NOT test — the previously-tested `diagnosis-type` group's mechanism was reused to close this gap) | ✅ **Killed** — `expect(element).toHaveAttribute("name", "intervention-priority")` failed (`Received: null`). Iteration 1's exact surviving mutant class is now caught. |
| 2 | `src/app/documentos/plano-cuidados/[carePlanId]/page.tsx:92` | Removed `text-black` from the NOC `<Table>` | ✅ **Killed** — `npm run check:sv` exits 1, reports `✗ [override text-black ausente em tabela de documentos] 1 achado(s)` at the exact line. |
| 3 | `src/app/portal/consent-card.tsx:158` | Changed `disabled={sending}` → `disabled={false}` in the `PatientPhotoUpload` `FileInput` | ✅ **Killed** — `expect(input).toBeDisabled()` failed with `Received element is not disabled`. |
| 4 | `src/app/portal/consent-card.tsx:162` | Removed `e.target.value = ""` from the same `FileInput`'s `onChange` | ❌ **Survived** — `tests/pages/portal.test.tsx` stayed green. Root cause (confirmed via an isolated jsdom probe): a `<input type="file">`'s `.value` getter in jsdom returns `""` unconditionally once `files` is set via `fireEvent.change({ target: { files: [...] } })`, regardless of whether application code executes `e.target.value = ""`. `expect(input.value).toBe("")` is true either way — it never discriminates this specific line. The implementation itself is correct (read directly from source); only this one sub-assertion is non-discriminating. This is a jsdom/browser file-input security-model limitation, not a test-writing mistake specific to this fix. |

**Sensor depth**: lightweight (4 targeted mutations — 2 repeats of iteration 1's surviving mutants + 2 new on this iteration's own fix code, default tier for a non-P0 feature)
**Result**: 3/4 killed, 1/4 survived (Minor, non-blocking — see Fix Plans) — both iteration-1 Major gaps now empirically closed.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — all 5 fixes are test-only or gate-script additions; no implementation code changed |
| Surgical changes | ✅ — diff scoped to exactly the 3 gaps + 2 minor items from iteration 1's report |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check | ✅ — 21/21 ACs matched; see table above |
| Per-layer Coverage Expectation | ✅ — all 3 RadioGroup groups now behavior+structure tested; print-table override has a static gate check (appropriate for a print-only page, matches project convention of pairing behavior tests with `check-sv-adoption.sh` static checks) |
| Every test maps to a spec requirement | ✅ — no unclaimed tests found |
| Documented guidelines followed | `docs/still-void-gaps.md`, `scripts/check-sv-adoption.sh` (project convention), AD-006/AD-013/AD-015 in `.specs/STATE.md` |

---

## Edge Cases

- [x] Header collapses `<details>`/`<summary>` below 640px, stays visible above — N/A for this app's actual portal (no nav to collapse; AC4 wording itself imprecise, see judgment above)
- [x] `RadioGroupItem` non-direct-child loses `name` injection and mutual exclusivity — now caught by explicit `name`-attribute assertions on all 3 groups (Gap 1)
- [x] `NativeSelect` controlled/uncontrolled (`value` vs `defaultValue`) — preserved per call site, no new React warnings observed in test output
- [x] `Table` family server-safe in jsdom — no browser-API failures observed across 108 test files
- [x] `FileInput` visual affordance change — confirmed intentional and accepted per spec Assumptions table
- [x] `--spacing` root font-size dependency — app doesn't alter root font-size, N/A
- [x] `npm audit` new HIGH/CRITICAL — 0 found, reproduced locally
- [x] `<select>` inside printable documents — 0 raw `<select>` anywhere in `src/app/documentos/**`

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run build && npm test && npm run test:e2e && npm run check:sv` (+ `npm run test:coverage` run separately to verify the 90% thresholds)
- **Result**: all commands exit 0
  - `typecheck`: 0 errors
  - `build`: succeeds, all routes compiled (static + dynamic)
  - `test`: **108 test files / 1815 tests passed** (iteration 1 baseline: 107 files / 1807 tests — delta of exactly +8 tests, matching the 8 new `it(...)` blocks added across the 5 fix commits: 2 RadioGroup, 4 check-sv fixture, 2 portal-layout; 0 tests deleted, 0 assertions weakened — `bcb2b41` strengthened an assertion, did not weaken one)
  - `test:coverage`: statements 97.4%, branches 93.54%, functions 96.98%, lines 97.5% — all ≥ 90% threshold, exit 0
  - `test:e2e`: **64/64 passed**, clean run, no flakes observed this run
  - `check:sv`: exit 0, **12/12 checks `✓`** (11 from before + new `[13]` override check)
- **npm audit**: 0 high/critical, 4 moderate (pre-existing `esbuild`/`drizzle-kit` dev chain, unrelated to `@still-void/ui`)

---

## Fix Plans (non-blocking — Minor tier, optional hardening)

### Fix 6 (minor, new this iteration): FileInput value-reset assertion doesn't discriminate in jsdom

- **Root cause**: `expect(input.value).toBe("")` in `tests/pages/portal.test.tsx:930` and `tests/pages/staff-paciente-detail.test.tsx` asserts a property that jsdom always reports as `""` for `type="file"` inputs regardless of whether the application code resets it — confirmed empirically (Sensor #4).
- **Fix task** (optional): either (a) accept this as an untestable-in-jsdom implementation detail and add a one-line comment next to the assertion saying so (so a future reader doesn't mistake it for real coverage), or (b) replace it with a spy on the `onChange` handler asserting `e.target.value` was set to `""` inside the handler itself (tests the code path directly rather than relying on jsdom's DOM reflection).
- **Priority**: Minor — implementation is correct; this only affects regression-detection strength for one sub-behavior, and it mirrors a known jsdom/browser limitation, not a project-specific test-writing gap.

---

## Requirement Traceability Update

| Requirement | Iteration 1 Status | Iteration 2 Status |
| --- | --- | --- |
| SV3-01, SV3-04, SV3-05, SV3-07, SV3-09, SV3-10, SV3-11, SV3-12, SV3-13, SV3-14, SV3-16, SV3-17, SV3-18, SV3-19, SV3-20, SV3-21 | ✅ Verified | ✅ Verified (re-derived independently) |
| SV3-02 | ⚠️ Verified with spec-precision gap | ✅ Verified — gap closed (`queryByRole`) |
| SV3-06 | ❌ Needs Fix | ✅ Verified — RadioGroup + FileInput gaps closed (1 non-blocking discrimination note on FileInput value-reset) |
| SV3-15 | ❌ Needs Fix | ✅ Verified — gap closed |
| SV3-03 | ❌ Needs Fix | ✅ Verified — AC4 describes a non-existent pre-migration behavior; test protects real behavior instead |
| SV3-08 | ❌ Needs Fix | ✅ Verified — print-override gap closed via gate check `[13]` |

**Note on spec.md itself**: SV3-03's AC4 wording ("o `<nav>` do `Header` SHALL continuar expondo os mesmos itens de navegação") describes behavior that never existed in `src/app/portal/layout.tsx`, confirmed across its entire git history (pre-still-void `161f074`, first still-void adoption `f14dec5`, and the current state — none pass `items` to `Header`). This is a spec-precision defect inherited from the original spec authoring, not a defect in this migration's implementation or in the fix agent's test. Recorded as lesson L-021.

---

## Summary

**Overall**: ✅ **Ready** — 21/21 acceptance criteria verified against precise spec-defined outcomes, all 3 Major gaps from iteration 1 empirically closed (sensor-confirmed via repeat mutation), full gate green (typecheck/build/test+coverage/e2e/check:sv/audit), 1 new Minor discrimination note found and recorded (non-blocking).

**Spec-anchored check**: 21/21 ACs matched spec outcome precisely; 0 gaps

**Sensor**: 4 mutations injected (2 repeats of iteration-1 survivors + 2 new), 3 killed, 1 survived (Minor, FileInput value-reset assertion — jsdom limitation, implementation itself correct)

**Gate**: 6/6 gate commands passed (typecheck, build, test, test:coverage, test:e2e, check:sv), 0 failed

**What works**: All 21 requirements, including the 3 previously-gapped ones — RadioGroup mutual exclusivity + structural `name`-injection now tested across all 3 groups, print-table neutral override now protected by a static gate check with fixture proof, and the portal Header now has real regression coverage for what actually exists (rather than fabricated coverage for a feature — nav — that was never there).

**Issues found**: None blocking. 1 Minor, non-blocking discrimination note: the FileInput `value`-reset assertion doesn't actually distinguish reset-vs-not in jsdom (Fix 6, optional hardening).

**Next steps**: None required to close this feature. Fix 6 is optional hardening for a future pass, not a gate to re-verification.

---

## Lessons distilled this iteration

- **L-021** (`spec_precision_gap`, scope `specs`): Before accepting a spec AC as describing a migration regression, confirm the described pre-migration behavior actually existed in the code/history — a spec can assert a behavior (e.g. nav items) that never existed in the app, making the AC itself imprecise rather than the implementation regressed. Source: spec.md SV3-03 AC4 vs `src/app/portal/layout.tsx` history.
- **L-022** (`surviving_mutant`, scope `testing`): In jsdom, a file input's `.value` getter reads as empty string regardless of whether code resets it after upload, so `expect(input.value).toBe('')` never discriminates a missing reset — assert the reset via a change-handler spy or accept the behavior as untestable in jsdom and document it. Source: `consent-card.tsx:162` mutation, `tests/pages/portal.test.tsx:930`.

Both recorded via `python3 scripts/lessons.py add` as `candidate` (status: 22 total lessons, 1 confirmed, 21 candidate, 0 quarantined after this run). Neither promotes to `confirmed` yet — each needs corroboration from a second, distinct feature per the promote threshold.
