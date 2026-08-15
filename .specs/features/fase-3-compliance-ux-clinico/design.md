# Fase 3 — Compliance e UX Clínico — Design

**Spec**: `.specs/features/fase-3-compliance-ux-clinico/spec.md`
**Status**: Approved

## Code Reuse Analysis

| Component | Location | How to Use |
|-----------|----------|------------|
| `ConsentRecord.covers(CONSENT_TEXT)` | domain/consent + rota de consentimento | mesma regra de "vigente" no gate |
| `pushScore` / `detScore` getters | `condition-assessment.ts:256,274` | latestScore da fila |
| `assessments.findByConditionIds` | clinical repos | lote para a fila (sem N+1 novo) |
| Migração aditiva nullable | padrão do projeto (ex.: 0009, 0016) | `expires_at` no session_packages via drizzle-kit generate |
| `findUsable(patientId, procedureId)` | package repo (drizzle/in-memory) | ganha corte por validade |

## Components

### Gate de consentimento — `src/app/api/portal/patient/photos/route.ts`
Após validar paciente/condição: buscar `consentRecords.findByPatientId`; sem registro cujo
`covers(CONSENT_TEXT)` → `fail(403, "Consentimento pendente — aceite o termo de consentimento no
portal antes de enviar fotos")`; nada é gravado. Portal UI: aviso na seção de envio quando
`accepted=false` (endpoint de consentimento já expõe o status).

### Validade do pacote — domínio + repo + rota
- `SessionPackageProps.expiresAt?: Date | null`; state idem; getter `expiresAt`;
  `isUsableAt(now)` = ativo, com saldo e (sem validade || expiresAt > now).
- Migração aditiva `expires_at timestamptz` (drizzle-kit generate).
- `findUsable(patientId, procedureId, now = new Date())` exclui expirados (drizzle: where
  `expires_at IS NULL OR expires_at > now`; in-memory: `isUsableAt`).
- Rota POST /api/packages aceita `expiresAt` (z.iso.datetime() opcional); DTO expõe.

### Fila de triagem enriquecida — rota + UI
- Rota: junta `assessments.findByConditionIds`; avaliação mais recente por condição;
  `latestScore = kind === "wound" ? {kind:"push", value: pushScore} : {kind:"det", value: detScore}`
  (null quando getter null); `waitingHours = floor((now − photo.createdAt)/3600000)`.
- UI staff (página da fila): badge de score e idade; destaque visual quando `waitingHours >= 24`.

## Error Handling

| Scenario | Handling |
|----------|----------|
| Sem consentimento | 403, mensagem clara, foto não gravada |
| Pacote expirado na conclusão | ignorado por findUsable → fatura avulsa (sem erro) |

## Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Gate por paciente (não por condição) | paciente | consentimento é do titular |
| Corte de validade no repo (findUsable) | repo + invariante no domínio (`isUsableAt`) | consulta é quem decide elegibilidade; domínio documenta a regra |
| Sem job de expiração | avaliação lazy no momento do uso | YAGNI; não há efeito colateral a materializar |

## Tasks (execução inline, 3 fases)

### T1: Gate de consentimento no envio remoto
**Where**: rota portal photos POST, portal UI (aviso), tests/api (portal)
**Req**: COMP3-01..03 | **Tests**: integration | **Gate**: full
**Commit**: `feat(portal): exigir consentimento vigente no envio remoto de fotos`

### T2: Validade de pacotes
**Where**: domain/billing/package.ts, schema + migração, package repos, rota /api/packages, complete-appointment (now), tests
**Req**: COMP3-07..10 | **Tests**: unit+integration | **Gate**: full
**Commit**: `feat(billing): validade opcional em pacotes de sessões`

### T3: Fila de triagem enriquecida
**Where**: rota photos/triage, página staff da fila, tests
**Req**: COMP3-04..06 | **Tests**: integration + page | **Gate**: build (último)
**Commit**: `feat(clinical): idade e último score na fila de triagem`

Cross-checks: T1/T2/T3 independentes (diagrama = A:T1 → B:T2 → C:T3 sequencial por convenção);
Tests co-located conforme matrix da fase 1 (rotas=integration, domínio=unit, página=jsdom).
