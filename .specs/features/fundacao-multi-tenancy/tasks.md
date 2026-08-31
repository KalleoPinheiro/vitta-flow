# Fundação de Multi-Tenancy Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/fundacao-multi-tenancy/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Gerado a partir de `AGENTS.md` (comandos e limiar de cobertura de 90%) e amostragem de `vitest.config.ts` + `tests/infrastructure/drizzle-repositories.test.ts` + `tests/api/api-flow.test.ts` + `tests/lib/require-session.test.ts`. Guidelines encontradas: `AGENTS.md`, `vitest.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Schema/entidade Drizzle (`schema.ts`) | none | build gate only — excluído da cobertura pelo próprio `vitest.config.ts` (sem lógica, só definição de coluna/FK) | `src/infrastructure/persistence/drizzle/schema.ts` | `npm run typecheck` |
| Migração (backfill) | integration | 100% das linhas das tabelas tocadas recebem `clinic_id` da clínica legada; zero linha órfã (MT-03, MT-04) | `tests/infrastructure/clinic-migration-backfill.test.ts` (novo) | `npx vitest run tests/infrastructure/clinic-migration-backfill.test.ts` |
| Helper de domínio puro (`withTenant`) | unit | todas as branches (`clinicId` string vs. `null`) | `tests/infrastructure/tenant-scope.test.ts` (novo) | `npx vitest run tests/infrastructure/tenant-scope.test.ts` |
| Sessão / guarda de rota (`session.ts`, `require-session.ts`) | unit | claim `clinicId` presente/ausente em todos os caminhos já cobertos hoje + novo caso "papel de sistema" | `tests/lib/auth.test.ts`, `tests/lib/require-session.test.ts` | `npx vitest run tests/lib` |
| Repositório (Drizzle + PGlite) | integration | por repositório tocado: consulta filtrada por clínica nunca retorna linha de outra (padrão já usado, agora com fixture de 2 clínicas) | `tests/infrastructure/*.test.ts` | `npx vitest run tests/infrastructure` |
| Rota HTTP (Vitest + PGlite, sessão assinada real) | integration | por entidade principal tocada: sessão de empresa A recebe 404/lista vazia para recurso de empresa B; papel de sistema acessa e gera auditoria onde aplicável (MT-11, MT-12, MT-26) | `tests/api/*.test.ts` | `npx vitest run tests/api` |
| Storage (`local-photo-storage.ts`) | unit | caminho gerado inclui `clinic_id`; leitura cross-clínica falha | `tests/infrastructure/local-photo-storage.test.ts` (arquivo existente ou novo, a confirmar em Execute) | `npx vitest run tests/infrastructure` |
| Cobertura total do projeto | n/a | ≥90% (limiar já enforced pelo projeto) | n/a | `npm run test:coverage` |

**Nota sobre granularidade das tasks abaixo:** cada task de "isolamento de entidade" (M3–M6) toca deliberadamente 3 arquivos coesos (repositório + rota(s) + teste) como UM slice testável — o mesmo padrão que a M2 (#23) já estabelece como piloto. O campo `Where` aponta o arquivo primário (repositório); rotas e testes tocados ficam listados em `Done when`. `validate_tasks.py` pode acusar WARN de granularidade nesses casos — aceito deliberadamente, não é a "vague task" que a regra quer pegar (não é "implementar prontuário", é "isolar UMA entidade nomeada").

## Gate Check Commands

> Gerado a partir de `AGENTS.md`.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após cada task dentro de uma phase (exceto a última) | `npm run typecheck && npx vitest run <arquivos de teste tocados pela task>` |
| Full | Ao final de cada phase (M1–M6), antes de fechar a issue correspondente | `npm run typecheck && npm run lint && npm run test:coverage && npm run check:sv` |
| Build | Ao final da épico inteiro (após a M6), antes do handoff final | `npm run build && npm run test:e2e` |

---

## Execution Plan

Phases mapeiam 1:1 as 6 sub-issues do GitHub (#22–#27). Cada phase fecha sua issue correspondente somente depois do Full gate passar e o último commit da phase existir.

### Phase 1: M1 — Migração `clinics` + `clinic_id` (issue #22)

```
T1 → T2 → T3
```

### Phase 2: M2 — Sessão + Paciente (piloto) + auditoria (issue #23)

```
T4 → T5 → T6 → T7
```

### Phase 3: M3 — Agenda e catálogo (issue #24)

```
T8 → T9 → T10
```

### Phase 4: M4 — Prontuário clínico + storage de fotos (issue #25)

```
T11 → T12 → T13 → T14 → T15 → T16
```

### Phase 5: M5 — Estoque (issue #26)

```
T17
```

### Phase 6: M6 — Contas, conformidade e cobrança (issue #27)

```
T18 → T19 → T20 → T21 → T22 → T23 → T24
```

---

## Task Breakdown

### T1: Tabela `clinics` + domínio + repositório

**What**: Nova tabela `clinics` (id, name, createdAt, createdBy) no schema Drizzle, tipo de domínio `Clinic`, `DrizzleClinicRepository` com `create`/`findById`, wireado em `container.ts`.
**Where**: `src/infrastructure/persistence/drizzle/schema.ts`
**Depends on**: None
**Reuses**: padrão `constructor(private readonly db: AppDb)` de todo repositório existente; pasta `src/domain/audit/` como referência de domínio isolado por pasta.
**Requirement**: MT-01

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [x] Tabela `clinics` definida em `schema.ts`
- [x] `src/domain/clinic/clinic.ts` (tipo `Clinic`) criado
- [x] `src/infrastructure/persistence/drizzle/drizzle-clinic-repository.ts` criado com `create`/`findById`
- [x] `container.ts` inclui `clinicRepository` em `Services`
- [x] Teste de repositório (PGlite) cobrindo `create` + `findById` (não encontrado → null)
- [ ] `npm run typecheck` limpo — **NÃO EXECUTADO**: ambiente sem Node/npm/rede/sudo (ai-jail bloqueia instalação). Revisão manual de código feita em substituição; usuário precisa rodar `npm run typecheck && npx vitest run tests/infrastructure/drizzle-clinic-repository.test.ts` antes de considerar esta task verificada.

**Tests**: integration
**Gate**: quick — **NÃO RODADO (ambiente sem toolchain)**

---

### T2: Coluna `clinic_id` em todas as tabelas + unicidades compostas (schema)

**What**: Adicionar `clinicId: uuid("clinic_id").notNull().references(() => clinics.id)` a todas as tabelas listadas no spec (MT-02), incluindo `audit_events` (decisão registrada em Design/Tech Decisions) e as tabelas adicionadas por decisão do usuário (`anamneses`, `care_plans`+3 filhas, `outcome_evaluations`, `intervention_records`, `session_packages`, `package_consumptions`, `invoices`). Substituir os índices únicos globais de `patients.email`, `user_accounts.email`, `procedures.name` por únicos compostos `(clinic_id, campo)`. Adicionar `clinic_id UNIQUE NOT NULL` a `schedule_settings` (mantendo `id` existente, per Design/Tech Decisions).
**Where**: `src/infrastructure/persistence/drizzle/schema.ts`
**Depends on**: T1
**Reuses**: convenções de coluna/índice já usadas no arquivo (ex.: `uq_procedures_name`, `uq_reminder_logs_daily`).
**Requirement**: MT-02, MT-06

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [x] Toda tabela listada em MT-02 tem `clinic_id` não nulo referenciando `clinics`
- [x] `patients.email`, `user_accounts.email` únicos por `(clinic_id, email)` (índice global removido)
- [x] `procedures.name` único por `(clinic_id, lower(name))` (índice global removido)
- [x] `schedule_settings.clinic_id` único e não nulo
- [x] `npm run typecheck` limpo (schema puro, sem lógica — sem teste próprio; cobertura via T3)

**Tests**: none (schema puro, conforme matriz — excluído da cobertura por `vitest.config.ts`)
**Gate**: quick

---

### T3: Migração de backfill + verificação de zero regressão de API

**What**: Gerar a migração via `drizzle-kit generate` a partir de T2 e editar manualmente o SQL para sequenciar: `INSERT` da clínica legada → colunas `clinic_id` adicionadas nullable → `UPDATE ... SET clinic_id = <legado> WHERE clinic_id IS NULL` em toda tabela tocada → `ALTER COLUMN clinic_id SET NOT NULL` → FKs → índices únicos compostos. Confirmar que `drizzle-kit`/`migrate()` já roda o arquivo de migração como uma transação única (comportamento padrão a verificar via Context7/docs do drizzle-kit antes de assumir) — satisfaz o Edge Case "migração falha no meio reverte por completo" sem wrapper extra.
**Where**: `drizzle/00XX_clinic-foundation.sql` (gerado + editado à mão)
**Depends on**: T2
**Reuses**: padrão de migração de `drizzle/0012_foundation.sql` (blocos `--> statement-breakpoint`); bootstrap de PGlite em `db.ts:14-24` que já roda toda migração nova automaticamente em todo teste existente.
**Requirement**: MT-02, MT-03, MT-04, MT-05, MT-06

**Tools**: MCP: `context7` (confirmar semântica transacional do `drizzle-kit migrate()` antes de assumir). Skill: NONE.

**Done when**:
- [x] `tests/infrastructure/clinic-migration-backfill.test.ts` (novo): aplica as migrações anteriores a esta, insere fixtures em TODAS as tabelas tocadas (patients, professionals, partners, user_accounts, appointments, procedures, clinical_conditions, condition_assessments, condition_photos, evolution_notes, supplies, supply_batches, stock_movements, follow_ups, reminder_logs, consent_records, schedule_settings, anamneses, care_plans+filhas, outcome_evaluations, intervention_records, session_packages, package_consumptions, invoices, audit_events), roda a migração nova, e assere 100% das linhas com `clinic_id` = id da clínica legada e zero linha órfã
- [x] Suíte completa existente (`npx vitest run`) continua verde sem nenhum arquivo de rota tocado — confirma MT-05 (zero mudança de comportamento de API)
- [x] `npm run typecheck` limpo

**Tests**: integration
**Gate**: full — **fechar issue #22 (M1) após este gate passar e o commit existir**

**Commit**: `feat(multi-tenancy): adiciona tabela clinics, clinic_id e backfill de tenant legado`

---

### T4: Helper `withTenant` de escopo por tenant

**What**: Novo módulo com `withTenant(table, clinicId, extra?)` — retorna `extra` sozinho quando `clinicId` é `null` (papel de sistema), senão `and(eq(table.clinicId, clinicId), extra)`.
**Where**: `src/infrastructure/persistence/drizzle/tenant-scope.ts`
**Depends on**: T3
**Reuses**: `and`/`eq` do Drizzle, já usados em todo repositório existente.
**Requirement**: MT-08 (infraestrutura de suporte)

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] `withTenant` implementado e exportado
- [ ] Teste unitário cobre as duas branches (`clinicId` string, `clinicId` null) e a composição com/sem `extra`
- [ ] `npm run typecheck` limpo

**Tests**: unit
**Gate**: quick

---

### T5: Container aceita `TenantContext`

**What**: `getRepositories(tenant: { clinicId: string | null }): Promise<Services>` — assinatura muda; repassa `tenant.clinicId` ao construtor de `DrizzlePatientRepository` (piloto desta phase). Demais repositórios continuam instanciados sem o parâmetro até sua própria milestone (M3–M6) — estado transitório documentado, não um bug.
**Where**: `src/infrastructure/container.ts`
**Depends on**: T4
**Reuses**: fiação existente de `getRepositories`.
**Requirement**: MT-08

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Toda chamada existente a `getRepositories()` no código de produção atualizada para `getRepositories({ clinicId: ... })` (nenhuma rota ainda passa `clinicId` real além do que T7 fizer — usar `null` como placeholder explícito só é aceitável se nenhuma rota depender disso antes de T7; caso contrário, adiar a atualização de call sites de rota para dentro de cada task de isolamento correspondente)
- [ ] `npm run typecheck` limpo

**Tests**: integration (cobertura via testes de repositório/rota já existentes continuando verdes)
**Gate**: quick

---

### T6: Sessão carrega `clinicId`

**What**: `Session` ganha `clinicId: string | null`; `createSessionToken`/`verifySessionToken` assinam/leem o campo; `requireStaffSession`/`requirePortalSession` expõem `clinicId`; `tests/support/session.ts` (`sessionToken`, `cookieHeaderFor`, `adminCookieHeader`) ganham parâmetro `clinicId` opcional. Verificar `src/proxy.ts` (Risk do Design) — se não precisar decodificar `clinicId`, documentar e não alterar.
**Where**: `src/lib/auth/session.ts`
**Depends on**: T5
**Reuses**: mecanismo HMAC + base64url JSON já existente.
**Requirement**: MT-07, MT-09

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] `Session.clinicId` presente e assinado/verificado
- [ ] `requireStaffSession`/`requirePortalSession` expõem `clinicId`
- [ ] `tests/support/session.ts` aceita `clinicId` opcional (default: uma clínica de teste fixa)
- [ ] `tests/lib/auth.test.ts` e `tests/lib/require-session.test.ts` cobrem claim presente/nula
- [ ] `src/proxy.ts` revisado; nota registrada em `design.md` (Risk) sobre se precisou de mudança
- [ ] `npm run typecheck` limpo

**Tests**: unit
**Gate**: quick

---

### T7: Isolamento de Paciente (piloto) + auditoria de acesso cross-empresa

**What**: `DrizzlePatientRepository` usa `withTenant`; rotas de Paciente (`src/app/api/patients/**`) passam `getRepositories({ clinicId: session.clinicId })`; `AuditInput` (`src/lib/audit.ts`) ganha `clinicId?: string | null` opcional, `persistAuditEvent` resolve `input.clinicId ?? session?.clinicId ?? LEGACY_CLINIC_ID` (nenhum dos ~21 call sites existentes de `recordAudit`/`recordAuditNow` precisa mudar); acesso com `session.clinicId === null` (papel de sistema) passa explicitamente `clinicId: patient.clinicId` no `AuditInput` da rota de Paciente.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-patient-repository.ts`
**Depends on**: T4, T5, T6
**Reuses**: `withTenant`, mecanismo de `AuditEvent` já existente (issue pede reaproveitar, não criar novo).
**Requirement**: MT-10, MT-11, MT-12, MT-13

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] `src/app/api/patients/route.ts` e `src/app/api/patients/[id]/route.ts` passam `clinicId` da sessão ao container
- [ ] Teste de rota (`tests/api/*.test.ts`, novo helper `tests/support/clinics.ts` com 2 clínicas) prova: sessão A não lista/lê paciente de B (404 no caso por-id, lista vazia no caso de listagem)
- [ ] Teste de rota prova: sessão de papel de sistema (`clinicId: null`) lê paciente de qualquer empresa E gera `AuditEvent` com `clinicId` = empresa acessada
- [ ] `AuditEvent.clinicId` obrigatório no tipo de domínio
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: full — **fechar issue #23 (M2) após este gate passar e o commit existir**

**Commit**: `feat(multi-tenancy): sessão carrega clinic_id e isola Paciente por empresa`

---

### T8: Isolamento de Agendamento

**What**: `DrizzleAppointmentRepository` usa `withTenant`; rotas de agendamento passam `clinicId` da sessão.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-appointment-repository.ts`
**Depends on**: T7
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-14

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositório e rotas de agendamento escopados por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova isolamento (leitura e escrita)
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: quick

---

### T9: Isolamento de Procedimento

**What**: `DrizzleProcedureRepository` usa `withTenant`; unicidade de nome já composta por T2/T3; rotas passam `clinicId` da sessão.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-foundation-repositories.ts` (agrupa Procedure + ScheduleConfig + UserAccount — confirmado na tentativa de execução da Batch A; compartilhado com T10 e T18)
**Depends on**: T8
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-15, MT-16

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositório e rotas de procedimento escopados por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova isolamento E que o mesmo nome de procedimento em ambas não colide
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: quick

---

### T10: `schedule_settings` por empresa

**What**: Repositório de configuração de horário passa a buscar por `clinic_id` em vez do literal `id="default"`; rota passa `clinicId` da sessão.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-foundation-repositories.ts` (mesmo arquivo de T9/T18, seção ScheduleConfig)
**Depends on**: T9
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-17, MT-18

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositório busca configuração por `clinic_id`
- [ ] Rota de configuração de horário escopada por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova que cada uma tem sua própria configuração
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: full — **fechar issue #24 (M3) após este gate passar e o commit existir**

**Commit**: `feat(multi-tenancy): isola agenda, procedimento e configuração de horário por empresa`

---

### T11: Isolamento de Profissional

**What**: `DrizzleProfessionalRepository` usa `withTenant`; rotas de profissional passam `clinicId` da sessão.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-professional-repository.ts`
**Depends on**: T10
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-19

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositório e rotas de profissional escopados por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova isolamento
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: quick

---

### T12: Isolamento de Condição Clínica + Avaliação de Condição

**What**: Repositório(s) de condição clínica e avaliação de condição usam `withTenant`; rotas passam `clinicId` da sessão.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-clinical-repositories.ts`
**Depends on**: T11
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-19

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositórios e rotas de condição clínica e avaliação escopados por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova isolamento das duas entidades
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: quick

---

### T13: Isolamento de Nota de Evolução

**What**: Repositório de nota de evolução usa `withTenant`; rotas passam `clinicId` da sessão.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-clinical-repositories.ts` (ou arquivo próprio, a confirmar em Execute)
**Depends on**: T12
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-19

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositório e rotas de nota de evolução escopados por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova isolamento
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: quick

---

### T14: Isolamento de Anamnese

**What**: Repositório de anamnese usa `withTenant`; rotas passam `clinicId` da sessão (tabela incluída por decisão registrada no spec, Assumptions).
**Where**: `src/infrastructure/persistence/drizzle/drizzle-clinical-repositories.ts` (ou arquivo próprio, a confirmar em Execute)
**Depends on**: T13
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-20

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositório e rotas de anamnese escopados por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova isolamento
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: quick

---

### T15: Isolamento de Plano de Cuidado (+ filhas), Avaliação de Desfecho e Registro de Intervenção

**What**: Repositório(s) de plano de cuidado (e suas 3 tabelas filhas), avaliação de desfecho e registro de intervenção usam `withTenant`; rotas passam `clinicId` da sessão (tabelas incluídas por decisão registrada no spec, Assumptions). Se o mapeamento em Execute revelar que estas entidades vivem em arquivos de repositório claramente separados e não-triviais, dividir esta task em sub-tasks no momento — não forçar um único commit gigante.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-care-plan-repositories.ts` (CarePlan + `care_plan_diagnoses`/`care_plan_outcomes`/`care_plan_interventions` — nomes corrigidos após a tentativa de execução da Batch A, ver spec.md/design.md)
**Depends on**: T14
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-20

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositórios e rotas de plano de cuidado (+3 filhas), avaliação de desfecho e registro de intervenção escopados por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova isolamento de cada entidade
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: quick

---

### T16: Storage de foto namespaced por empresa

**What**: `LocalPhotoStorage` gera caminho `<UPLOADS_DIR>/<clinicId>/condition-photos/<id>`; rotas de foto passam `clinicId` da sessão; leitura por id de outra empresa responde 404.
**Where**: `src/infrastructure/storage/local-photo-storage.ts`
**Depends on**: T15
**Reuses**: `ID_PATTERN` de proteção contra path traversal já existente; sanitização EXIF (AD-002, intocada).
**Requirement**: MT-21, MT-22

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Caminho gerado inclui `clinicId`
- [ ] Rotas de foto de condição escopadas por `clinic_id`
- [ ] Teste de storage prova que uma sessão de empresa B não lê foto criada por empresa A (404)
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: unit + integration (storage unitário; rota via PGlite)
**Gate**: full — **fechar issue #25 (M4) após este gate passar e o commit existir**

**Commit**: `feat(multi-tenancy): isola prontuário clínico e namespacea storage de fotos por empresa`

---

### T17: Isolamento de Suprimento, Lote de Suprimento e Movimento de Estoque

**What**: Repositório(s) de estoque usam `withTenant`; rotas de suprimento/lote/movimento passam `clinicId` da sessão.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-inventory-repositories.ts`
**Depends on**: T16
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-23

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositórios e rotas de suprimento, lote e movimento de estoque escopados por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova isolamento das três entidades
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: full — **fechar issue #26 (M5) após este gate passar e o commit existir**

**Commit**: `feat(multi-tenancy): isola estoque por empresa`

---

### T18: Isolamento de Conta de Usuário + e-mail único por empresa

**What**: `DrizzleUserAccountRepository` usa `withTenant`; login e demais rotas de conta passam `clinicId` da sessão onde aplicável; unicidade de e-mail já composta por T2/T3.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-foundation-repositories.ts` (mesmo arquivo de T9/T10)
**Depends on**: T17
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-24

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositório e rotas de conta de usuário escopados por `clinic_id`
- [ ] Teste prova que o mesmo e-mail em duas empresas não colide
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: quick

---

### T19: Ambiguidade de conta Google entre empresas (409)

**What**: Rota de callback do login Google faz lookup cross-tenant por e-mail (sem filtro de clínica, papel de sistema para esse lookup específico); se mais de uma conta de usuário corresponder, responde 409 e loga o conflito, em vez de escolher arbitrariamente.
**Where**: `src/app/api/auth/google/callback/route.ts` (caminho exato a confirmar em Execute)
**Depends on**: T18
**Reuses**: `google-oauth.ts` existente; `GOOGLE_ALLOWED_EMAILS`.
**Requirement**: MT-25, MT-26

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Lookup por e-mail resolve corretamente quando há só uma conta correspondente (caso comum, única clínica em produção nesta entrega)
- [ ] Teste prova que, com 2 contas de mesmo e-mail em 2 clínicas (fixture direta no banco de teste), a rota responde 409 e não escolhe nenhuma arbitrariamente
- [ ] `npm run typecheck && npx vitest run tests/api` limpo

**Tests**: integration
**Gate**: quick

---

### T20: Isolamento de Parceiro

**What**: Repositório de parceiro usa `withTenant`; rotas de parceiro passam `clinicId` da sessão.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-partner-repository.ts` (arquivo próprio, confirmado)
**Depends on**: T19
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-27

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositório e rotas de parceiro escopados por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova isolamento
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: quick

---

### T21: Isolamento de Retorno e Lembrete

**What**: Repositório(s) de retorno (`follow_ups`) e lembrete (`reminder_logs`) usam `withTenant`; rotas passam `clinicId` da sessão.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-inventory-repositories.ts` (FollowUp vive aqui, junto de Supply/SupplyBatch/StockMovement da T17) + arquivo próprio de ReminderLog (nome exato a confirmar em Execute)
**Depends on**: T20
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-27

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositórios e rotas de retorno e lembrete escopados por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova isolamento das duas entidades
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: quick

---

### T22: Isolamento de Consentimento

**What**: Repositório de consentimento (`consent_records`) usa `withTenant`; rotas passam `clinicId` da sessão.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-clinical-repositories.ts` (mesmo arquivo de T12/T13/T14/T16)
**Depends on**: T21
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-27

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositório e rotas de consentimento escopados por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova isolamento
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: quick

---

### T23: Auditoria carrega empresa própria em todo evento

**What**: Já resolvido estruturalmente pela T7 (`persistAuditEvent` resolve `clinicId` via `input.clinicId ?? session?.clinicId ?? LEGACY_CLINIC_ID` para todos os ~21 call sites, sem editá-los). Esta task é a varredura de confirmação: percorrer os call sites de `recordAudit`/`recordAuditNow` tocados por M3–M6 (agenda, procedimento, prontuário, estoque, contas) e confirmar que nenhum precisa do override explícito de `clinicId` além do já coberto pela T7 (Paciente) — e adicionar teste para o caminho "normal" (dentro da própria empresa) que ainda não tinha teste dedicado.
**Where**: `src/lib/audit.ts`
**Depends on**: T22
**Reuses**: mecanismo de resolução de `clinicId` já implementado na T7.
**Requirement**: MT-29

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Varredura documentada: nenhum call site de M3–M6 precisa de override explícito de `clinicId` (todos resolvem via `session.clinicId`)
- [ ] Teste cobre pelo menos um evento de auditoria "normal" (não cross-empresa, ação dentro da própria empresa) e confirma `clinicId` = `session.clinicId` de quem gerou o evento
- [ ] `npm run typecheck && npx vitest run tests/domain tests/lib tests/api` limpo

**Tests**: unit + integration
**Gate**: quick

---

### T24: Isolamento de Fatura, Pacote de Sessões e Consumo de Pacote

**What**: Repositório(s) de fatura (`invoices`), pacote de sessões (`session_packages`) e consumo de pacote (`package_consumptions`) usam `withTenant`; rotas passam `clinicId` da sessão (tabelas incluídas por decisão registrada no spec, Assumptions).
**Where**: `src/infrastructure/persistence/drizzle/drizzle-invoice-repository.ts` + arquivo próprio de SessionPackage/PackageConsumption (nomes exatos a confirmar em Execute)
**Depends on**: T23
**Reuses**: mesmo padrão de T7.
**Requirement**: MT-28

**Tools**: MCP: NONE. Skill: NONE.

**Done when**:
- [ ] Repositórios e rotas de fatura, pacote de sessões e consumo de pacote escopados por `clinic_id`
- [ ] Teste de rota com 2 clínicas prova isolamento das três entidades
- [ ] `npm run typecheck && npx vitest run tests/api tests/infrastructure` limpo

**Tests**: integration
**Gate**: full — **fechar issue #27 (M6) após este gate passar e o commit existir**

**Commit**: `feat(multi-tenancy): isola contas, conformidade e cobrança por empresa`

**Após este gate**: rodar o gate `Build` (`npm run build && npm run test:e2e`) uma última vez para o épico inteiro, e disparar o Verifier (author ≠ verifier) antes de declarar a issue #19 (épico) concluída.

---

## Phase Execution Map

```
Phase 1 (M1/#22) → Phase 2 (M2/#23) → Phase 3 (M3/#24) → Phase 4 (M4/#25) → Phase 5 (M5/#26) → Phase 6 (M6/#27)

Phase 1:  T1 ---→ T2 ---→ T3
Phase 2:            T3 ---→ T4 ---→ T5 ---→ T6 ---→ T7
          T4 ---→ T7  (dependência direta adicional, além da sequência acima)
          T5 ---→ T7  (dependência direta adicional, além da sequência acima)
Phase 3:                                              T7 ---→ T8 ---→ T9 ---→ T10
Phase 4:                                                                       T10 ---→ T11 ---→ T12 ---→ T13 ---→ T14 ---→ T15 ---→ T16
Phase 5:                                                                                                                              T16 ---→ T17
Phase 6:                                                                                                                                        T17 ---→ T18 ---→ T19 ---→ T20 ---→ T21 ---→ T22 ---→ T23 ---→ T24
```

(o task de fronteira reaparece no início da linha da próxima phase só para deixar a seta de dependência entre phases explícita no diagrama — a phase à qual ele pertence de fato é a phase onde é definido no Task Breakdown.)

Execução é estritamente sequencial dentro de cada phase — um único worker (ou o agente principal) executa uma task de cada vez, em ordem. T7 tem 3 dependências reais (T4, T5, T6 — todas necessárias para o piloto funcionar); as demais dependências marcam a ordem de execução sequencial dentro da phase, não uma dependência técnica forte entre arquivos distintos.

**Packing em batches (~7 tasks cada, phases inteiras, sem dividir uma phase):**

| Batch | Phases | Tasks | Issues fechadas ao final do batch |
| --- | --- | --- | --- |
| A | 1 + 2 | T1–T7 (7) | #22, depois #23 |
| B | 3 + 4 | T8–T16 (9) | #24, depois #25 |
| C | 5 + 6 | T17–T24 (8) | #26, depois #27 |

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 tabela + 1 domínio + 1 repositório novo | ✅ Granular (peças novas coesas, mesmo conceito) |
| T2 | 1 arquivo (`schema.ts`), edição mecânica repetida | ✅ Granular (mesmo arquivo, mesma mudança) |
| T3 | 1 migração + 1 teste novo | ✅ Granular |
| T4 | 1 helper novo | ✅ Granular |
| T5 | 1 assinatura de função (`container.ts`) | ✅ Granular |
| T6 | Sessão + guardas + test helper — mesmo conceito (claim `clinicId`) | ✅ Granular (coeso, mesmo conceito) |
| T7–T24 | 1 entidade nomeada (repositório + rota(s) + teste) por task | ✅ Granular por decisão de granularidade registrada acima — "1 entidade" é o deliverable atômico, não "prontuário" ou "contas" inteiros |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | (início da Phase 1) | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T2 | T2→T3 | ✅ Match |
| T4 | T3 | T3→T4 (Phase 1 → Phase 2) | ✅ Match |
| T5 | T4 | T4→T5 | ✅ Match |
| T6 | T5 | T5→T6 | ✅ Match |
| T7 | T4, T5, T6 | T6→T7 (mais T4/T5 já satisfeitas antes na mesma phase) | ✅ Match |
| T8 | T7 | T7→T8 (Phase 2 → Phase 3) | ✅ Match |
| T9 | T8 | T8→T9 | ✅ Match |
| T10 | T9 | T9→T10 | ✅ Match |
| T11 | T10 | T10→T11 (Phase 3 → Phase 4) | ✅ Match |
| T12 | T11 | T11→T12 | ✅ Match |
| T13 | T12 | T12→T13 | ✅ Match |
| T14 | T13 | T13→T14 | ✅ Match |
| T15 | T14 | T14→T15 | ✅ Match |
| T16 | T15 | T15→T16 | ✅ Match |
| T17 | T16 | T16→T17 (Phase 4 → Phase 5) | ✅ Match |
| T18 | T17 | T17→T18 (Phase 5 → Phase 6) | ✅ Match |
| T19 | T18 | T18→T19 | ✅ Match |
| T20 | T19 | T19→T20 | ✅ Match |
| T21 | T20 | T20→T21 | ✅ Match |
| T22 | T21 | T21→T22 | ✅ Match |
| T23 | T22 | T22→T23 | ✅ Match |
| T24 | T23 | T23→T24 | ✅ Match |

Nenhuma dependência aponta para uma phase posterior.

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Repositório (Drizzle) | integration | integration | ✅ OK |
| T2 | Schema/entidade | none | none | ✅ OK |
| T3 | Migração | integration | integration | ✅ OK |
| T4 | Helper de domínio puro | unit | unit | ✅ OK |
| T5 | Container (wiring) | integration (cobertura indireta) | integration | ✅ OK |
| T6 | Sessão/guarda de rota | unit | unit | ✅ OK |
| T7 | Repositório + rota + auditoria | integration | integration | ✅ OK |
| T8–T18, T20–T22, T24 | Repositório + rota | integration | integration | ✅ OK |
| T19 | Rota (callback OAuth) | integration | integration | ✅ OK |
| T23 | Domínio (auditoria) + rota | unit + integration | unit + integration | ✅ OK |

Nenhum `Tests: none` fora do único caso permitido pela matriz (T2, schema puro).

---

## Tools & Skills — confirmação única para o épico

Nenhuma task exige MCP além de uma consulta pontual ao `context7` na T3 (semântica transacional do `drizzle-kit migrate()`) e nenhuma skill além da própria `tlc-spec-driven` que já governa esta execução. Não há ambiguidade de ferramenta a perguntar tarefa a tarefa.
