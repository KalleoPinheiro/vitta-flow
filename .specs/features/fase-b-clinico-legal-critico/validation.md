# Fase B — Clínico/legal crítico Validation

**Date**: 2026-09-02
**Spec**: `.specs/features/fase-b-clinico-legal-critico/spec.md`
**Diff range**: `56f301b..HEAD` (17 commits, branch `fix/fase-b-clinico-legal-critico`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 (migration+schema) | ✅ Done | `drizzle/0026_clinic-info-fields.sql`, `schema.ts` — 5 nullable columns confirmed |
| T2 (`Clinic` domain) | ✅ Done | `updateInfo`/`isCompleteForDocumentEmission`/`isClinicInfoComplete` present, immutable |
| T3 (repository `update`) | ✅ Done | roundtrip + isolation tests present |
| T4 (`ClinicInfoDto` → `dto.ts`) | ✅ Done | type only declared in `dto.ts`, `document-frame.tsx` imports it |
| T5 (`/api/settings/clinic-info`) | ✅ Done | GET/PUT, 403/401 covered |
| T6 (`/api/clinic-info` from DB) | ✅ Done | `src/lib/clinic-info.ts` removed, `grep -rn "lib/clinic-info"` empty |
| T7 (atestado bloqueio) | ⚠️ Partial | Blocking works; loading-state edge case for `appointment` is mishandled (see Edge Cases) |
| T8 (relatório/plano bloqueio) | ✅ Done | Both block, consentimento unaffected |
| T9 (remove seletor profissional) | ✅ Done | No `NativeSelect`/select of professional in `evolutions-section.tsx` |
| T10 (`resolveProfessionalId`) | ✅ Done | Body branch removed, confirmed by discrimination sensor |
| T11 (anamnese erro) | ✅ Done | error/loading propagated and rendered distinctly |
| T12 (complicações na leitura) | ✅ Done | labels rendered via `COMPLICATION_OPTIONS` |
| T13 (dirty tab guard) | ✅ Done | intercepts before unmount (structural + test evidence), confirmed by discrimination sensor |
| T14 (`ClinicInfoSection`) | ✅ Done | empty/save/error states covered |
| T15 (E2E documentos) | ✅ Done | seed + status-block test present, e2e green |
| T16 (E2E login 3 perfis) | ⚠️ Partial | Deviates from task spec: patient/partner use a forged session cookie, not the real `/login` credential form as `tasks.md` T16 explicitly required |

---

## Spec-Anchored Acceptance Criteria

### CLIN-01: Cadastro de dados da clínica

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: seção com 6 campos em Configurações | Campos: razão social, CNPJ, endereço, cidade, responsável técnico, registro profissional visíveis | `tests/pages/staff-operations.test.tsx:213` — `screen.findByText("Dados da clínica")`; `src/app/(staff)/configuracoes/page.tsx:84-` (`ClinicInfoSection`) declares all 6 fields | ✅ PASS |
| AC2: salvar persiste por `clinic_id` da sessão | GET subsequente reflete os valores salvos | `tests/api/clinic-info-settings.test.ts:39-65` — `expect(body.data?.info.cnpj).toBe("12.345.678/0001-90")` etc. | ✅ PASS |
| AC3: papel não-admin → 403 | status 403 | `tests/api/clinic-info-settings.test.ts:87-117` — `expect(response.status).toBe(403)` for `atendente` and `profissional` | ✅ PASS |
| AC4: sem dados → campos vazios, não erro | status 200, campos `null`/vazios | `tests/api/clinic-info-settings.test.ts:25-37` — `expect(body.data?.info.cnpj).toBeNull()`; `tests/pages/staff-operations.test.tsx:214-215` — `expect(...).toHaveValue("")` | ✅ PASS |

### CLIN-02: Bloqueio fail-closed de documentos

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: dados incompletos → bloqueio nas 3 páginas | mensagem de bloqueio, não o documento | `tests/pages/documentos-fail-closed.test.tsx:114-126` (atestado), `:164-179` (relatório), `:195-206` (plano) | ✅ PASS |
| AC2: dados completos → documento com CNPJ/responsável no cabeçalho/rodapé | documento renderiza **incluindo** CNPJ e responsável técnico | `tests/pages/documentos-fail-closed.test.tsx:128-139` etc. — asserts only `getByRole("heading", ...)`; the CNPJ/`professionalName` values from the `CLINIC_COMPLETE` fixture (lines 53-60) are never asserted as visible text in any RTL or E2E test | ⚠️ Spec-precision gap — "renders normally" is covered, "includes CNPJ/responsável in header/footer" is not |
| AC3: Consentimento não bloqueia (fora de escopo) | renderiza normalmente mesmo com dados incompletos | `tests/pages/documentos-fail-closed.test.tsx:224-237`; `e2e/documentos.spec.ts:56-65` | ✅ PASS |

### CLIN-03: Atestado só para consulta realizada

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: status ≠ `completed` → bloqueio explícito | mensagem de bloqueio, não a declaração | `tests/pages/documentos-fail-closed.test.tsx:141-162` (cancelled, no_show); `e2e/documentos.spec.ts:36-54` (cancelled) | ✅ PASS |
| AC2: status `completed` → declaração normal | declaração renderiza | `tests/pages/documentos-fail-closed.test.tsx:128-139`; `e2e/documentos.spec.ts:15-34` | ✅ PASS |
| Edge case (spec.md:178): agendamento ainda não carregado → indicador de carregamento, não bloqueio nem documento | `LoadingIndicator`, not an error/blocking message | `src/app/documentos/atestado/[appointmentId]/page.tsx:21-23` — order is `if (error) → ErrorAlert`; `if (!clinic) → LoadingIndicator`; `if (!appointment) → ErrorAlert("Consulta não encontrada")`. If `clinic` has already resolved while `appointment` is still in flight, the page shows **"Consulta não encontrada"** (an error message), not a loading indicator — no test exercises this ordering (`relatorio`/`plano-cuidados` pages correctly combine both loading flags in one `if`, this page does not) | ❌ GAP — implementation contradicts the spec-defined edge case, zero test coverage |

### CLIN-04: Autoria de evolução travada na sessão

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: qualquer papel, corpo com `professionalId` forjado é ignorado | autoria vem só da sessão | `tests/api/clinical-routes.test.ts:507-529` (`company_admin`) — `expect(body.data.professionalId).not.toBe("prof-outro-forjado-2")`; `:531-565` (`profissional`) — `expect(body.data.professionalId).toBe(professionalId)` (session-bound, not body's forged id) | ✅ PASS for `company_admin`/`profissional`. `atendente` has no direct forgery test, but is structurally barred from the whole `clinical` route family (`src/lib/auth/route-family.ts:80` — `FAMILY_ALLOWED_ROLES.clinical` excludes `atendente`), confirmed 403 by `tests/api/atendente-operational-scope.test.ts:90-98` — forging is unreachable for this role, so the AC is satisfied by construction, not by a dedicated forgery test |
| AC2: sem `professionalId` vinculado → autor nulo | `professionalId: null` preserved | `src/app/api/patients/[id]/evolutions/route.ts:40-43` (unchanged path); pre-existing coverage in `tests/api/clinical-routes.test.ts` (POST with default admin session, no professional link) | ✅ PASS (behavior preserved, not newly broken — confirmed via discrimination sensor below) |
| AC3: UI sem seletor de profissional | no professional selector element | `src/app/(staff)/pacientes/[id]/evolutions-section.tsx` — no `NativeSelect`/select for professional (removed); `npm run check:sv` green (no raw `<select>`) | ✅ PASS |

### CLIN-05: Erro de API distinto de "sem histórico"

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: 5xx/erro de rede → erro explícito com retry | `ErrorAlert` distinct from empty form | `tests/pages/staff-paciente-detail.test.tsx:429-437` — `expect(screen.findByText("Erro ao carregar anamnese"))`, `expect(screen.queryByLabelText("Comorbidades")).not.toBeInTheDocument()` | ✅ PASS |
| AC2: sucesso sem anamnese → formulário vazio | empty form renders | `tests/pages/staff-paciente-detail.test.tsx:369-378` (data present) + pre-existing baseline behavior preserved | ✅ PASS |
| Loading state | `LoadingIndicator`, not empty form | `tests/pages/staff-paciente-detail.test.tsx:439-454` | ✅ PASS |
| `apiFetch` `SPEC_DEVIATION` (dropped `data === null` from throw condition) | — | `src/lib/client.ts:20-27` — documented rationale (`data: null` is a legitimate success payload) | ✅ Reviewed — see Code Quality note below; no regression found in other `apiFetch<T>` callers with non-nullable `T` for this diff's surface (evolutions POST, clinic-info GET/PUT all return non-null objects on success) |

### CLIN-06: Confirmação antes de descartar SOAP/anamnese

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: SOAP com campo preenchido + trocar de aba → diálogo | dialog appears before switch | `tests/pages/staff-paciente-detail.test.tsx:458-477` | ✅ PASS |
| AC2: anamnese alterada + trocar de aba → mesmo diálogo | dialog appears | `tests/pages/staff-paciente-detail.test.tsx:502-515` | ✅ PASS |
| AC3: confirmar → troca e descarta | tab switches, draft cleared | `tests/pages/staff-paciente-detail.test.tsx:479-500` | ✅ PASS |
| AC4: cancelar → permanece, formulário intacto | tab stays, draft intact | `tests/pages/staff-paciente-detail.test.tsx:458-477` (text still present after Cancelar) | ✅ PASS |
| AC5: sem alterações → troca direta | no dialog | `tests/pages/staff-paciente-detail.test.tsx:517-527` | ✅ PASS |
| Interception happens before previous tab unmounts | `setTab` never called while dirty (guard intercepts, doesn't just show a dialog after switching) | `src/app/(staff)/pacientes/[id]/page.tsx:138-145` (`requestTabChange` only calls `setTab` when not dirty or already resolved) — confirmed structurally; discrimination sensor below | ✅ PASS |

### CLIN-07: Complicações de estomia visíveis na leitura

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: `complicationCodes` preenchido → labels pt-BR | labels shown via `COMPLICATION_OPTIONS` | `tests/pages/staff-paciente-detail.test.tsx:927-943` — `expect(screen.findByText(/Dermatite/))`, `expect(screen.getByText(/Sangramento/))` | ✅ PASS |
| AC2: sem `complicationCodes` → "—" | dash shown | `tests/pages/staff-paciente-detail.test.tsx:945-961` | ✅ PASS |

### CLIN-08: Validação do login para os 3 perfis

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: nenhum perfil vê copy de acesso exclusivo de equipe | no "restrito à equipe"/"Acesso restrito" text | `e2e/auth.spec.ts:73-78` (login page copy, generic — covers what staff/patient/partner all see); `:80-98` (patient/partner root redirect, no denial copy) | ✅ PASS for the copy check |
| AC2: paciente/parceiro logam com sucesso → `/portal` | successful **login** redirects to `/portal` | `e2e/auth.spec.ts:80-98` — uses `context.addCookies([sessionCookie(...)])` (a forged, directly-signed session token via `e2e/support/session-token.ts`), **not** a real `/login` form submission with email+senha | ❌ GAP vs. `tasks.md` T16, which explicitly specifies: "logando via `/login` real (formulário, não cookie forjado)" and lists as Done-when: "Paciente loga via `/login` (email+senha reais) e chega em `/portal`" / "Parceiro loga via `/login` (email+senha reais) e chega em `/portal`". The implementation tests session-cookie validity + route redirect, not the actual credential-based login path for these two roles — no `// SPEC_DEVIATION` comment documents this deviation |

**Status**: ❌ Gaps present — 2 grounded gaps (CLIN-03 edge case, CLIN-08 AC2), 1 spec-precision gap (CLIN-02 AC2)

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `src/domain/clinic/clinic.ts:30` | `isClinicInfoComplete`: flipped `&&` → `\|\|` (any one of 3 required fields now suffices) | ✅ Killed — `tests/domain/clinic.test.ts` 3 failures (cnpj/professionalName/professionalRegistry-absent cases) |
| 2 | `src/app/api/patients/[id]/evolutions/route.ts` | Re-introduced `if (bodyProfessionalId) return bodyProfessionalId;` branch (schema extended to accept `professionalId` from body, passed through to `resolveProfessionalId`) | ✅ Killed — `tests/api/clinical-routes.test.ts` 2 failures (both #64 discrimination tests, expected 200 got 500 due to forged FK) |
| 3 | `src/app/(staff)/pacientes/[id]/page.tsx:140` | `useDirtyTabGuard.requestTabChange`: flipped `if (isCurrentTabDirty)` → `if (!isCurrentTabDirty)` (guard fires on the wrong condition) | ✅ Killed — `tests/pages/staff-paciente-detail.test.tsx` 54+ failures (dirty-guard tests plus cascading failures from broken normal tab switching) |

**Sensor depth**: lightweight (default tier, 3 mutations)
**Result**: 3/3 killed — PASS ✅

All mutations were applied via direct edit, verified against the real test suite, then reverted with `git checkout --`; `git status --short` confirmed a clean tree after each revert.

---

## Interactive UAT Results

Not performed — this is a backend/RBAC/domain-logic-heavy feature; automated checks (gate + discrimination sensor) are the primary verification per `validate.md` §3 ("For backend-only or infrastructure work, automated checks are sufficient"). The 2 document-page/E2E gaps found above are exactly the kind of thing UAT would have caught, but per skill process, automated verification is what runs before Interactive UAT is even considered — flagging as fix-task material instead.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — each task's diff is scoped to its stated files |
| Surgical changes | ✅ |
| No scope creep | ✅ — `route-family.ts` change (commit `400ddce`) is a legitimate, documented fix for a regression this feature's own new route introduced, not scope creep |
| Matches existing patterns | ✅ — `ClinicInfoSection` mirrors `ScheduleSection`; `AlertDialog` reuse per design's documented Tech Decision |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ — 2 gaps + 1 spec-precision gap found above |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ — domain/repo/route layers are 1:1; document-page layer misses the "loading" edge case for `atestado` specifically |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed: `AGENTS.md` (90% coverage), `vitest.config.ts` (thresholds) | ✅ |

**`SPEC_DEVIATION` review** (CLIN-05, `src/lib/client.ts:20-27`): dropping `envelope.data === null` from the throw condition is coherent with the stated rationale — `data: null` is a legitimate success payload for optional resources (anamnesis-not-yet-registered is the paradigm case). Checked all callers of `apiFetch<T>` touched or newly added in this diff's surface (`/api/settings/clinic-info` PUT/GET, `/api/patients/[id]/evolutions` POST, anamnesis PUT) — none of these return `data: null` on success, so no silent-null regression was introduced for this feature's new call sites. Pre-existing callers with non-nullable `T` (e.g., patient/condition fetches) were not touched by this diff and are out of this Verifier's scope, but the change is a `client.ts`-wide behavior change; a full audit of every existing `apiFetch<T>` call site for `T` types that could legitimately never be `null` was **not** performed (out of scope per the diff-surface rule) — flagged for awareness, not counted as a gap against this feature.

---

## Edge Cases

- [x] Clínica com CNPJ mas sem responsável técnico (cadastro parcial) → bloqueio mesmo assim — covered by `Clinic.isCompleteForDocumentEmission` domain tests (`tests/domain/clinic.test.ts:64-74`, `it.each` over the 3 required fields)
- [x] Troca de aba dupla rápida com formulário sujo → diálogo reaparece a cada tentativa — implied by `pendingTab` state machine (single pending target, resets on cancel/confirm); not independently tested but low-risk given the structural guarantee
- [x] Evolução antiga com `professionalId` divergente → sem correção retroativa — no migration/backfill touches existing rows, confirmed by scope of `drizzle/0026_*.sql` (adds columns to `clinics`, not `evolution_notes`)
- [ ] Agendamento do atestado ainda não carregado (loading) → indicador de carregamento — **NOT handled correctly**, see CLIN-03 gap above

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run check:sv && npm run test:coverage`
- **Result**: typecheck ✅ (exit 0) · lint ✅ (no issues) · check:sv ✅ (adoção completa) · test:coverage ✅ (exit 0)
- **Test count**: 166 test files, 2559 tests passed, 0 failed, 0 skipped
- **Coverage**: statements 96.8%, branches 91.31%, functions 96.74%, lines 96.92% — all above the 90% threshold in `vitest.config.ts`
- **Build**: `npm run build` — exit 0, all routes compiled including new `/api/settings/clinic-info`
- **E2E (targeted)**: `npx playwright test e2e/documentos.spec.ts e2e/auth.spec.ts --reporter=line` — 16 passed, 0 failed
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

### Fix 1: Atestado page treats "appointment still loading" as "appointment not found"

- **Root cause**: `src/app/documentos/atestado/[appointmentId]/page.tsx:21-23` checks `!clinic` for loading but then falls through to `!appointment` → `ErrorAlert("Consulta não encontrada")` without distinguishing "still fetching" (`data === null`, `error === null`) from "genuinely not found". `relatorio`/`plano-cuidados` pages avoid this by combining both loading flags in a single `if`.
- **Fix task**: Combine the loading check the same way the sibling pages do, e.g. `if (!clinic || !appointment) { if (error) return <ErrorAlert .../>; return <LoadingIndicator />; }` then a separate `if (appointment === null) return <ErrorAlert message="Consulta não encontrada" />` only once `useApiQuery` signals settlement (would need an `isLoading` flag from `useApiQuery`, mirroring how `relatorio` uses `condition === undefined` as its "still loading" sentinel vs `condition === null` as "not found" — the atestado page's `AppointmentDto | null` type doesn't currently distinguish those two states the way `ConditionDto | null` down there does; needs either an `isLoading` destructure or an `undefined`-vs-`null` convention change).
- **Verify**: add an RTL test where `/api/appointments/:id` never resolves (pending promise) while `/api/clinic-info` resolves — assert `LoadingIndicator` shows, not "Consulta não encontrada".
- **Priority**: Minor (self-correcting UI flash once the appointment fetch settles; not a data-integrity or security issue, but explicitly named as an edge case in spec.md).

### Fix 2: CLIN-08 E2E does not exercise the real `/login` credential path for patient/partner

- **Root cause**: `e2e/auth.spec.ts:80-98` uses `context.addCookies([sessionCookie(...)])` to mint a session directly, bypassing the actual login form — deviates from `tasks.md` T16's explicit instruction to log in "via `/login` real (formulário, não cookie forjado)" using the invite/set-password flow already used by `global-setup.ts`.
- **Fix task**: Provision a `patient` and `partner` account via the real invite flow (`consumeInvite`, mirroring `global-setup.ts`'s existing pattern for the admin), then drive `/login` through the actual form (`page.getByLabel("Email")`/`page.getByLabel("Senha")`) as the existing `signIn` helper in the same file already does for staff, and assert redirect to `/portal`.
- **Verify**: re-run `npm run test:e2e` (or targeted `npx playwright test e2e/auth.spec.ts`) after the fix; confirm the new tests fail if `/login` is broken for these roles (e.g., temporarily mutate the login handler's role branch to prove the test is discriminating).
- **Priority**: Major (task's own acceptance criteria explicitly asked for this and it wasn't done — reduces confidence that patient/partner credential login genuinely works end-to-end, which is the actual point of issue #68).

### Fix 3 (minor, spec-precision): CLIN-02 AC2 — document content (CNPJ/responsável técnico) never asserted as rendered

- **Root cause**: All "clínica completa" tests in `tests/pages/documentos-fail-closed.test.tsx` only assert the document heading is present, never that the CNPJ/professional name text from the fixture is actually visible on the page.
- **Fix task**: Add `expect(screen.getByText("12.345.678/0001-90")).toBeInTheDocument()` (and similarly for `professionalName`) to at least one of the three "complete → renders" tests.
- **Verify**: run the updated test; it should fail if `DocumentFrame` stops rendering `clinic.cnpj`/`clinic.professionalName`.
- **Priority**: Minor (the underlying code — `src/components/document-frame.tsx:40,54-56` — does render these fields; this is purely a missing assertion, not a functional gap).

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| CLIN-01 | Implementing | ✅ Verified |
| CLIN-02 | Implementing | ⚠️ Verified with spec-precision gap (AC2 rendering not asserted) |
| CLIN-03 | Implementing | ❌ Needs Fix (loading-state edge case) |
| CLIN-04 | Implementing | ✅ Verified |
| CLIN-05 | Implementing | ✅ Verified |
| CLIN-06 | Implementing | ✅ Verified |
| CLIN-07 | Implementing | ✅ Verified |
| CLIN-08 | Implementing | ❌ Needs Fix (E2E doesn't exercise real login for patient/partner) |

---

## Summary

**Overall**: ⚠️ Issues — core legal/clinical-safety mechanisms (fail-closed document blocking, forged-authorship rejection, dirty-tab guard) are solid and empirically verified by a live discrimination sensor (3/3 mutants killed). Gate is fully green (typecheck/lint/check:sv/coverage/build/targeted-e2e all pass). Two grounded, spec-anchored gaps and one precision gap were found, none of them in the security/compliance-critical mechanisms themselves — they're in document-page loading-state ordering and in how thoroughly the login E2E validates the credential path.

**Spec-anchored check**: 19/22 criteria matched spec outcome exactly, 2 gaps (CLIN-03 edge case, CLIN-08 AC2), 1 spec-precision gap (CLIN-02 AC2)
**Sensor**: 3/3 mutations killed
**Gate**: typecheck ✅ · lint ✅ · check:sv ✅ · test:coverage ✅ (2559/2559, ≥90% all metrics) · build ✅ · targeted e2e ✅ (16/16)

**What works**: clinic registration CRUD + tenant isolation; fail-closed blocking on all 3 document pages when clinic data incomplete; atestado status-gate; evolution authorship locked to session for every reachable role (empirically proven via mutation testing); anamnesis error/loading/empty 3-state contract; dirty-tab guard intercepts before unmount (empirically proven); estoma complication labels now visible on read.

**Issues found**:
1. Atestado page shows "Consulta não encontrada" during the appointment's loading window instead of a loading indicator (Fix 1, Minor).
2. CLIN-08's E2E for patient/partner login uses a forged session cookie instead of the real `/login` form flow the task explicitly required (Fix 2, Major).
3. CLIN-02 AC2's "document includes CNPJ/responsável técnico in header/footer" is implemented but never asserted by a test (Fix 3, Minor).

**Next steps**: Route Fix 2 back to an implementer first (highest-value gap — restores real confidence in the #68 fix), then Fix 1, then Fix 3 opportunistically. All three are additive (new assertions/tests + one small page-ordering fix) — no existing passing test needs to change.
