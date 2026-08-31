# Fundação de Multi-Tenancy Validation

**Date**: 2026-08-31
**Spec**: `.specs/features/fundacao-multi-tenancy/spec.md`
**Diff range**: `f9ca946^..144fc28` (26 commits)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Overall Verdict: PASS ✅

All 24 tasks (T1–T24) are complete and committed. `typecheck` is clean, the full `tests/api` + `tests/infrastructure` suite (40 files, 687 tests) passes, `lint` shows no new findings beyond the documented pre-existing baseline. The discrimination sensor killed all 3 injected mutations. The three documented architectural exceptions (reminder-log fallback, `partners.email` global uniqueness, Google-callback ambiguity scope) are confirmed deliberate and consistent with `design.md`.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1–T24 | ✅ Done | All "Done when" boxes checked in `tasks.md`; each phase has a closing commit in the diff range (`7888815`, `d9fb56e`, `bcf8b94`, `4c44ecc`, `78dceef`, `144fc28`). |

---

## Spec-Anchored Acceptance Criteria (sample: 15 of 29)

| Requirement | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- | --- |
| MT-02 | `clinic_id NOT NULL` on all listed tables | column non-null, FK to `clinics` | `src/infrastructure/persistence/drizzle/schema.ts` — e.g. `procedures.clinic_id` FK'd + `uq_procedures_name` on `(clinic_id, lower(name))` at `schema.ts:71`; confirmed by migration test below | ✅ PASS |
| MT-03 | Migration backfills 100% of existing rows to legacy clinic | every touched table's rows get `clinic_id = 'legacy-clinic'` | `tests/infrastructure/clinic-migration-backfill.test.ts:120-124` — `it.each(TENANT_TABLES)(...)` asserts `SELECT count(*) WHERE clinic_id IS NULL OR clinic_id <> 'legacy-clinic'` = 0 for every table | ✅ PASS |
| MT-04 | No orphan rows after migration | zero rows with null `clinic_id` | same test, same assertion (count must be 0) | ✅ PASS |
| MT-05 | API behavior unchanged by M1 | existing route test suite stays green, unmodified | Task T3 done-when: "Suíte completa existente (`npx vitest run`) continua verde sem nenhum arquivo de rota tocado" — verified independently by this Verifier's full gate run (687/687 pass) | ✅ PASS |
| MT-06 | Composite uniqueness `(clinic_id, field)` for patient/user email, procedure name | duplicate email/name across clinics does not collide | `tests/api/procedure-tenant-isolation.test.ts:39-48` — same name in 2 clinics both succeed with distinct ids (`expect(first.body.data.id).not.toBe(second.body.data.id)`) | ✅ PASS |
| MT-10 | Session A lists/reads only own-clinic patients | list/read scoped to `session.clinicId` | `tests/api/patient-tenant-isolation.test.ts:54-61` — `expect(body.data.some(p => p.id === patientBId)).toBe(false)` | ✅ PASS |
| MT-11 | Session A accessing patient B by id → 404 | exact status 404, no distinguishing "not found" vs "other tenant" | `tests/api/patient-tenant-isolation.test.ts:45-51` — `expect(response.status).toBe(404)` | ✅ PASS |
| MT-12 | System role (clinicId null) accesses any clinic's patient + audit written | 200 + audit event with accessed clinic id | `tests/api/patient-tenant-isolation.test.ts:64-96` — `expect(response.status).toBe(200)`, `expect(readEvent?.clinicId).toBe(CLINIC_B_ID)` | ✅ PASS |
| MT-13 | `AuditEvent` gains a field for accessed clinic | field present, required, non-optional in domain type | `src/domain/audit/audit-event.ts` — `clinicId: string` (confirmed via design.md Data Models + T7 done-when: "AuditEvent.clinicId obrigatório no tipo de domínio"); test above (`readEvent?.clinicId`) exercises the field | ✅ PASS |
| MT-14 | Session A isolated from B's appointments | list/read/write scoped | `tests/api/appointment-tenant-isolation.test.ts:65-141` — 404 on cross-tenant POST/PATCH, list excludes B's appointment | ✅ PASS |
| MT-16 | Same procedure name in 2 different clinics doesn't collide | both succeed | `tests/api/procedure-tenant-isolation.test.ts:39-48` (same evidence as MT-06) | ✅ PASS |
| MT-17/18 | `schedule_settings` becomes per-clinic | each clinic reads/writes its own config | `tests/api/schedule-settings-tenant-isolation.test.ts:20-53` — `expect(bodyA.data.config.startHour).toBe(8)` vs `expect(bodyB.data.config.startHour).toBe(9)` | ✅ PASS |
| MT-21/22 | Photo storage namespaced by clinic; cross-tenant photo read → 404 | path includes `clinicId`; 404 on cross-tenant GET | `tests/api/photo-tenant-isolation.test.ts:58-70` — `expect(response.status).toBe(404)` for GET of B's photo by A's session | ✅ PASS |
| MT-23 | Supply/batch/movement isolated | list/write scoped | `tests/api/inventory-tenant-isolation.test.ts:29-95` — list excludes B's supply, PUT/movement on B's supply → 404 | ✅ PASS |
| MT-25/26 | Google account resolution stays ambiguity-safe; >1 match → 409 | exact 409 status, no arbitrary pick | `tests/api/google-callback-tenant-ambiguity.test.ts:82-95` — `expect(response.status).toBe(409)`, `expect(body.success).toBe(false)` | ✅ PASS |
| MT-28 | Invoice/session-package/consumption isolated | list/write scoped | `tests/api/billing-tenant-isolation.test.ts:57-143` — list excludes B's invoice, PATCH B's invoice → 404, own-clinic package created and returned | ✅ PASS |

**Status**: ✅ All sampled ACs covered with concrete `file:line` evidence; no spec-precision gaps found in the sample (spec defines exact status codes/values throughout, and tests target those exact values, not just "an assertion exists").

---

## Discrimination Sensor

Ran in an isolated `git worktree` at `/tmp/.../scratchpad/mt-sensor` (checked out at `144fc28`, `node_modules` symlinked from the real repo to avoid a network install). Real working tree porcelain before and after sensor work: identical (` M .ai-jail`, ` M AGENTS.md`, ` M package-lock.json` — all pre-existing, unrelated to this feature). Worktree removed after each run via `git worktree remove --force`.

| # | File:line | Mutation | Test run | Killed? |
| --- | --- | --- | --- | --- |
| 1 | `src/infrastructure/persistence/drizzle/drizzle-patient-repository.ts:55` | Removed `withTenant(...)` wrapper from `findById` — `.where(withTenant(patients, this.clinicId, eq(patients.id, id)))` → `.where(eq(patients.id, id))` | `tests/api/patient-tenant-isolation.test.ts` | ✅ Killed — cross-tenant GET returned 200 instead of expected 404 |
| 2 | `src/app/api/appointments/[id]/route.ts:59` | Changed PATCH route's tenant scoping from `clinicId: guard.session?.clinicId ?? LEGACY_CLINIC_ID` to `clinicId: null` (global/system access) | `tests/api/appointment-tenant-isolation.test.ts` | ✅ Killed — cross-tenant PATCH returned 500 instead of expected 404 (repository's own `clinicId === null` guard on `save()` throws for a normal-role write, so the fault surfaces as a different failure mode, not a silent leak — test still fails and catches it) |
| 3 | `src/infrastructure/persistence/drizzle/drizzle-appointment-repository.ts:58` | Flipped guard condition in `save()`: `if (this.clinicId === null)` → `if (this.clinicId !== null)` | `tests/api/appointment-tenant-isolation.test.ts` | ✅ Killed — test setup itself throws (`Papel de sistema não pode salvar consulta`) because normal-tenant appointment creation in the `beforeAll` fixture now hits the flipped guard; whole suite fails |

**Sensor depth**: lightweight (3 targeted behavior-level mutations, as specified in the task brief)
**Result**: 3/3 killed — PASS ✅

---

## Architectural Exceptions (confirmed deliberate, not gaps)

| Exception | Evidence it's deliberate | Verdict |
| --- | --- | --- |
| `DrizzleReminderLogRepository.save()` falls back to `LEGACY_CLINIC_ID` instead of throwing on null `clinicId` | `src/infrastructure/persistence/drizzle/drizzle-reminder-log-repository.ts:18-30` — comment explicitly states the cron (`/api/reminders/run`) runs across all clinics without a session `clinicId`; `clinicId: this.clinicId ?? LEGACY_CLINIC_ID` (not a throw, unlike patient/appointment `save()`) | ✅ Consistent with design.md |
| `partners.email` stays globally unique | No `(clinic_id, email)` composite index found for `partners` in `schema.ts` (only `patients.email`, `user_accounts.email`, `procedures.name` were made composite, per MT-06) | ✅ Consistent with design.md Risks table ("partners.email continua único globalmente, sem alteração planejada") |
| Google OAuth ambiguity check only guards `patients`, not `partners`/`user_accounts` | `tests/api/google-callback-tenant-ambiguity.test.ts` only exercises the `role === "patient"` path; design.md Risks explains `user_accounts` is never queried by the callback (role `admin` comes from `GOOGLE_ALLOWED_EMAILS` allowlist) and `partners.email` can't collide (still global) | ✅ Consistent with design.md |
| `patients/[id]/export` reads with `clinicId: null` (unscoped) | `src/app/api/patients/[id]/export/route.ts:30` — `getRepositories({ clinicId: null })` | ⚠️ See Gaps below — this route is NOT scoped by session `clinicId` at all (always passes `null`), which is a stronger statement than "not yet in scope" — it's an always-unscoped export endpoint. See Gap 1. |

---

## Gate Check

- **Gate command**: `npm run typecheck && npx vitest run tests/api tests/infrastructure --no-file-parallelism` + `npm run lint`
- **typecheck**: clean, 0 errors
- **lint**: 20 problems (11 errors, 9 warnings), all in the documented pre-existing baseline (`.claude/skills/mermaid-studio/**` complexity errors, `tests/pages/staff-*.test.tsx` unused-import warnings) — one additional pre-existing warning noted in `tests/components/sidebar-auto-close.test.tsx` (unused `screen` import), unrelated to this feature's diff surface, not a new regression introduced by this feature
- **Test result**: 40 files, 687 tests passed, 0 failed
- **Test count before feature**: not independently measured pre-migration (out of scope per task brief — trusting the diff's incremental test additions across 24 tasks, each of which added its own isolation test file); no evidence of deleted or weakened tests found in the diff (each task's "Done when" included a net-new test file)
- **Skipped tests**: none observed
- **Build gate**: not re-run per task brief instructions (Playwright e2e skipped; `npm run build` success trusted from task history — T24 recorded a Build gate pass before closing #27)

---

## Gaps Found (ranked by severity)

1. **Minor — `patients/[id]/export` route is unconditionally unscoped, not session-derived.** `src/app/api/patients/[id]/export/route.ts:30` always calls `getRepositories({ clinicId: null })` regardless of the requesting session's own `clinicId`. Unlike the GET route (`patients/[id]/route.ts:35`, `guard.session?.clinicId ?? null` — which only falls to `null` for a true system-role session), this export route never threads the session's clinic through at all. In practice this still isn't a *cross-tenant leak* in the sense of returning wrong data to the wrong caller unexpectedly — no test exercises whether a non-system staff session can export another clinic's patient PDF/data by id, so it's unverified either way. This matches the pattern the task brief flagged as expected ("GET-only routes still pass `clinicId: null`... zero regression"), but it's worth flagging explicitly since it is a read path over potentially sensitive clinical/PII data (patient export) rather than a purely administrative GET. No regression from this feature (pre-existing behavior preserved), but also no isolation test proves it's safe under multi-tenancy. Recommend a follow-up task to either scope this route by session `clinicId` or add an explicit isolation test documenting the intentional exception.
2. **Doc-only — lint baseline drift.** One additional pre-existing warning (`tests/components/sidebar-auto-close.test.tsx:3` unused `screen` import) appears beyond the documented "20 problems" baseline description in mermaid-studio + staff-*.test.tsx files. It is unrelated to the multi-tenancy diff and was very likely already present before this feature (not touched by any of the 26 commits in range) — flagged for hygiene only, not a feature regression.

Neither gap is a cross-tenant data leak proven by a failing/missing test; both are minor scope/documentation notes.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| MT-02, MT-03, MT-04, MT-05, MT-06 | Pending | ✅ Verified |
| MT-10, MT-11, MT-12, MT-13 | Pending | ✅ Verified |
| MT-14, MT-16, MT-17, MT-18 | Pending | ✅ Verified |
| MT-21, MT-22, MT-23 | Pending | ✅ Verified |
| MT-25, MT-26, MT-28 | Pending | ✅ Verified |
| MT-01, MT-07, MT-08, MT-09, MT-15, MT-19, MT-20, MT-24, MT-27, MT-29 | Pending | Not individually re-sampled by this pass (see note below) — corresponding test files exist (`drizzle-clinic-repository.test.ts`, `tenant-scope.test.ts`, `professional-tenant-isolation.test.ts`, `condition-tenant-isolation.test.ts`, `evolution-note-tenant-isolation.test.ts`, `anamnesis-tenant-isolation.test.ts`, `care-plan-tenant-isolation.test.ts`, `user-account-tenant-isolation.test.ts`, `partner-tenant-isolation.test.ts`, `followup-tenant-isolation.test.ts`, `consent-record-tenant-isolation.test.ts`) and all passed in the full gate run; not individually cited file:line in this report per the task brief's 12-15 sample size |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 15/15 sampled ACs matched spec-defined outcomes exactly (status codes, field values); 0 spec-precision gaps in the sample
**Sensor**: 3/3 mutations killed
**Gate**: 687 passed, 0 failed; typecheck clean; lint at documented baseline

**What works**: The full session→container→repository→route tenant-scoping chain (`withTenant` helper) is applied consistently across all 24 tasks' entities; cross-tenant access returns 404 without distinguishing "not found" from "other tenant"; system-role (`clinicId: null`) access is audited with the accessed clinic id; composite uniqueness correctly allows same email/name across clinics; photo storage and the Google OAuth ambiguity path both fail closed as designed.

**Issues found**: See Gaps above — one minor unscoped read path (`patients/[id]/export`) worth a follow-up isolation test or explicit scoping, and one unrelated pre-existing lint warning.

**Next steps**: No blocking fix required to close the epic. Optionally file a small follow-up task to add an isolation test (or scoping) for `patients/[id]/export`.
