# CONTEXT — VittaFlow Domain

**VittaFlow** is a clinical management system for dental therapy (estomaterapia) clinics. It manages patient records, clinical conditions, appointments, inventory, and team operations.

## Glossary

### Entities

**Clinic** (planned: tenant)

- Single deployment = one clinic currently (Phase 0 of [ADR-001](./docs/adr/001-multi-tenancy.md)).
- Future: multi-tenant with data isolation via `clinic_id` column + Postgres Row-Level Security.

**Patient** (paciente)

- Individual receiving treatment. Owns records of clinical conditions, appointments, assessments, and photos.
- Attributes: name, email, phone, birth date, referral source (partner), notes.
- Has an **Anamnesis** (medical history): comorbidities, allergies, medications, surgical history.

**Professional** (profissional)

- Staff member providing care (estomaterapeuta, nurse, therapist).
- May be assigned to appointments and evolution notes.
- Attributes: name, registry (license), commission %.

**Partner** (parceiro)

- Referral source or affiliate (e.g., another clinic, physician).
- Tracked for patient referrals and business relationships.

**Appointment** (consulta, agendamento)

- Scheduled interaction between a patient and clinic.
- Attributes: start/end time, procedure (name), price, status, notes, assigned professional.
- May have an associated evolution note and Google Calendar event.
- Statuses: pending, confirmed, completed, cancelled, no-show.
- Anti-double-booking enforced by `endsAtBuffered` trigger.

**Procedure** (procedimento)

- Catalog entry for services offered: name, price, duration.
- Case-insensitive unique name within the catalog.
- Used for template pricing and duration; individual appointments may deviate (backward-compatible).

**Clinical Condition** (condição clínica)

- Wound, ostomy, or other condition being managed over time.
- Attributes: kind (wound type), title, stoma type, start date, status.
- Status: open, closed, archived.
- Linked to a patient for longitudinal tracking.
- Has many **Condition Assessments** (clinical measurements) and **Condition Photos** (imaging).

**Condition Assessment** (avaliação)

- Point-in-time clinical snapshot of a condition.
- Measurements: length/width/depth (mm), tissue type, exudate, pain scale.
- DET scale (for ostomies): discoloration, erosion, overgrowth areas and severities.
- Complications: free-text or canonical codes.

**Condition Photo** (foto)

- Image of a condition, with metadata.
- Origin: `staff` (taken by therapist) or `patient` (remote monitoring).
- Triage status: for remote monitoring workflows.
- May be linked to an assessment or standalone.

**Evolution Note** (nota de evolução)

- Structured narrative per appointment or date, using SOAP format:
  - **S**ubjective: patient report.
  - **O**bjective: clinical findings, assessments.
  - **A**ssessment: interpretation.
  - **P**lan: next steps.
- Author: assigned professional (nullable for backward compatibility).

**Supply** (material, suprimento)

- Inventory item: name, unit, minimum quantity, price.
- Has **Supply Batches** tracking expiration and quantity consumed.

**Stock Movement** (movimento de estoque)

- Ledger entry for supply usage, restocking, or adjustment.
- Type: consumption, in, out, adjustment.
- Reason: free text (e.g., `appointment #123`, `expired`, `damaged`).
- Unit price frozen at movement time (immune to catalog price changes).

**Follow-up** (retorno)

- Scheduled recall or check-in due date.
- Reason: clinical (e.g., dressing change, wound inspection).
- Status: pending, completed, cancelled.

**Reminder** (lembrete)

- Notification sent to patient (e.g., appointment confirmation, follow-up due).
- Idempotent daily: one per (kind, referenceId, date).

**Consent Record** (consentimento)

- Patient's signed agreement to data use (photos, clinical records).
- Timestamp and IP address recorded.

**Audit Event** (evento de auditoria)

- System activity log: create, read, update, delete of sensitive entities.
- Captures actor, action, entity type, and timestamp.
- Required for compliance and forensics.

### Access Control

**Session** (sessão)

- User authenticated via password (scrypt hash) or Google OAuth.
- Session claims: user email, role, assigned professional (if staff).

**Role** (papel)

- **Admin** (equipe): staff account, can read/write all clinic data.
- **Patient** (paciente): patient account, can read own records and submit photos.

**Authorization** (autorização)

- Two-layer defense ([ADR-002](./docs/adr/002-autorizacao-em-duas-camadas.md)):
  1. **Proxy layer** (`src/proxy.ts`): edge-level checks, rate limiting, early rejects.
  2. **Handler layer** (`src/lib/auth/require-session.ts`): per-route authorization, fail-closed.
- Policy source: `src/lib/auth/access-policy.ts`.
- Audit: all changes record the authenticated actor (no anonymous actions).

### Business Rules

**Appointment conflicts**

- No two appointments may overlap for a patient.
- Enforced by `endsAtBuffered` and trigger-level exclusion constraint.
- Minimum gap between appointments: defined in `schedule_settings`.

**Schedule settings** (configuração de horário)

- Weekday/hour ranges when clinic accepts appointments.
- Single row (id = `"default"`).
- Business hours respected for appointment creation and reminders.

**Pricing**

- Appointment price set at creation (may differ from current procedure price).
- Stock movement price frozen at time of ledger entry.
- Supplies have cost; procedures have revenue.

**Taxonomy** (`import-taxonomy` script)

- Canonical lists of condition kinds, stoma types, tissue types, complications.
- Imported once at setup; used for dropdowns and data validation.
- Future: per-clinic customization in Phase 3 (currently global).

**Multi-tenancy roadmap** (see [ADR-001](./docs/adr/001-multi-tenancy.md))

- **Phase 0 (now)**: conventions set; no code changes yet.
- **Phase 1**: add `clinic_id` column + default to legacy tenant; backfill.
- **Phase 2**: session claims include clinic_id; RLS via `SET LOCAL`.
- **Phase 3**: self-service onboarding, billing, custom domains.
- **Phase 4**: anonymized benchmarking across clinics.

Until Phase 1, the product is single-tenant (one deploy per clinic). After Phase 1, the same database serves multiple clinics with cryptographic isolation.

### Critical constraints

**Auth fail-closed**

- Without `AUTH_PASSWORD`/`AUTH_SECRET` or Google OAuth configured, all routes return 503.
- `VITTA_ALLOW_OPEN_MODE=true` bypasses in dev; has no effect in production.

**Photo storage**

- Currently at root; planned to migrate to `uploads/<clinic_id>/condition-photos/…` in Phase 1.

**No global state per clinic** (in preparation for Phase 2)

- Config goes in tables, not env vars.
- Cache keys must include tenant (prepared but not enforced yet).

**Calendar sync**

- Google Calendar integration requires OAuth tokens (encrypted in `google_accounts`).
- Bidirectional: appointments ↔ Google events.

**Consent enforcement**

- Patient photos and records require active consent record.
- Consent text versioned by hash.

---

## Architecture layers

See `src/` structure:

- **`app/`** — Next.js pages and API routes (App Router).
- **`application/`** — use-case orchestration (dependencies resolved per-request).
- **`domain/`** — value objects, entities, business rules.
- **`infrastructure/`** — database (Drizzle + Postgres), external APIs (Google Calendar), file storage.
- **`lib/`** — utilities: audit, DTO, date formatting, API responses, auth.
- **`components/`** — React components (using `@still-void/ui` design system).
- **`proxy.ts`** — edge-layer authorization and rate limiting.

---

## Related decisions

- [ADR-001: Multi-tenancy strategy](./docs/adr/001-multi-tenancy.md) — `clinic_id` + RLS, incremental phases.
- [ADR-002: Two-layer authorization](./docs/adr/002-autorizacao-em-duas-camadas.md) — proxy + handler guards, fail-closed.
