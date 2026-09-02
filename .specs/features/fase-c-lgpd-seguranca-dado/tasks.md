# Fase C — LGPD / Segurança de Dado Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/fase-c-lgpd-seguranca-dado/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase (`vitest.config.ts`, `AGENTS.md`, sampled `tests/**`), guideline: 90% coverage minimum enforced (`AGENTS.md` Commands section, `vitest.config.ts` `coverage.thresholds`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain (`ConsentRecord`) | unit | All branches; 1:1 to spec ACs (CONSENT-*); every edge case | `tests/domain/consent-record.test.ts` | `npx vitest run tests/domain/consent-record.test.ts` |
| Lib puro (`dto.ts`, `audit.ts`, `crypto.ts`) | unit | All branches; 1:1 to spec ACs | `tests/lib/dto.test.ts`, `tests/lib/audit.test.ts`, `tests/lib/auth.test.ts` | `npx vitest run tests/lib/<file>.test.ts` |
| Repositório Drizzle (3 repos cifrados + consent) | integration (via PGlite) | Caminho de escrita+leitura cifrada; caso `AUTH_SECRET` ausente | `tests/api/evolution-note-tenant-isolation.test.ts`, `tests/api/condition-tenant-isolation.test.ts`, `tests/infrastructure/consent-record-tenant-isolation.test.ts` | `npx vitest run <arquivo>` |
| Rota de API (`/api/portal/**`, `/api/auth/**`, `/api/patients`, `/api/settings/**`) | integration (via PGlite) | Toda rota tocada: caminho feliz + edge listado + erro | `tests/api/portal-routes.test.ts`, `tests/api/auth-routes.test.ts`, `tests/api/set-password-route.test.ts`, `tests/api/api-flow.test.ts`, `tests/api/clinic-info-settings.test.ts`, `tests/api/schedule-settings-tenant-isolation.test.ts` | `npx vitest run <arquivo>` |
| Script CLI (`scripts/encrypt-clinical-fields.ts`) | none | Wrapper fino sobre lógica já testada em `crypto.ts` — mesmo padrão de `scripts/import-taxonomy.ts` (sem teste) | — | build gate only (`npm run typecheck`) |
| Migration/schema Drizzle | none | — (build gate only) | `drizzle/*.sql` | build gate only |

## Parallelism Assessment

> Generated from codebase.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| unit (domain/lib) | Yes | Funções puras / mocks de repositório por teste, sem estado global compartilhado | `tests/lib/audit.test.ts` (mock local por `beforeEach`) |
| integration (API/PGlite) | Yes | Cada arquivo de teste sobe sua própria instância PGlite em memória via `beforeAll` (isolada por worker/arquivo) | Comentário em `vitest.config.ts`: "vários arquivos migrando ao mesmo tempo" confirma isolamento por arquivo sob paralelismo de workers |

## Gate Check Commands

> Generated from codebase.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após task com só teste unitário | `npm run typecheck && npx vitest run <arquivo(s) do teste>` |
| Full | Após task com teste de integração (API/PGlite) | `npm run typecheck && npx vitest run <arquivo(s) do teste>` |
| Build | Após fase completa, ou task só de schema/script | `npm run typecheck && npm run lint && npm run test:coverage` |

---

## Execution Plan

### Phase 1: Portal allowlist (#69)

```
T1 ──┬──→ T2
     └──→ T3
```

### Phase 2: Consentimento versionado + revogação (#70)

```
T4 → T5 → T6
          T7 (depende só de T5, não de T6 — arquivo diferente)
```

### Phase 3: Trilha de auditoria (#71)

```
T8 ──┬──→ T9
     ├──→ T10
     └──→ T11

T12, T13, T14 — sem dependência (usam recordAudit já existente)
```

### Phase 4: Cifra em repouso (#72)

```
T15 → T16 → T17 → T18 → T19 → T20
```

(T16–T18 tocam o mesmo arquivo `drizzle-clinical-repositories.ts` — sequencial de propósito, não por dependência funcional real, para evitar conflito de edição.)

---

## Task Breakdown

### T1: DTOs allowlist do portal em `dto.ts`

**What**: Criar `PortalConditionDto`/`PortalAssessmentDto` (tipos sem `notes`) e `toPortalConditionDto`/`toPortalAssessmentDto` (funções puras, cada campo exposto citado explicitamente).
**Where**: `src/lib/dto.ts`
**Depends on**: None
**Reuses**: Padrão de `toConditionDto`/`toAssessmentDto` já existentes (mantidas intactas para staff)
**Requirement**: PORTAL-01, PORTAL-03

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `PortalConditionDto`/`PortalAssessmentDto` não têm propriedade `notes` no tipo
- [ ] `toPortalConditionDto`/`toPortalAssessmentDto` exportadas, cada campo do allowlist listado explicitamente (sem spread do objeto original)
- [ ] `toConditionDto`/`toAssessmentDto` inalteradas (staff continua recebendo `notes`)
- [ ] Teste unitário confirma que o objeto retornado não tem a chave `notes` mesmo quando `condition.notes`/`assessment.notes` têm valor
- [ ] Gate: `npm run typecheck && npx vitest run tests/lib/dto.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(portal): adiciona DTO allowlist sem nota clínica interna`

---

### T2: Portal do paciente usa DTO allowlist [P]

**What**: Trocar `toConditionDto`/`toAssessmentDto` por `toPortalConditionDto`/`toPortalAssessmentDto` em `GET /api/portal/patient`.
**Where**: `src/app/api/portal/patient/route.ts`
**Depends on**: T1
**Reuses**: `GetPatientPortalData` (sem mudança de assinatura)
**Requirement**: PORTAL-01, PORTAL-04

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Rota usa as novas funções de `dto.ts`
- [ ] Teste de integração: paciente com condição/avaliação cujo `notes` = string conhecida → resposta JSON de `GET /api/portal/patient` não contém a string em nenhum lugar
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/portal-routes.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `fix(portal): remove nota clínica interna da resposta do paciente (#69)`

---

### T3: Portal do parceiro usa DTO allowlist [P]

**What**: Trocar `toConditionDto`/`toAssessmentDto` por `toPortalConditionDto`/`toPortalAssessmentDto` em `GET /api/portal/partner`.
**Where**: `src/app/api/portal/partner/route.ts`
**Depends on**: T1
**Reuses**: `GetPartnerPortalData` (sem mudança de assinatura)
**Requirement**: PORTAL-02, PORTAL-04

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Rota usa as novas funções de `dto.ts`
- [ ] Teste de integração: parceiro com paciente indicado cuja condição tem `notes` preenchido → resposta JSON de `GET /api/portal/partner` não contém a string
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/portal-routes.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `fix(portal): remove nota clínica interna da resposta do parceiro (#69)`

---

### T4: `ConsentRecord` ganha versão, revogação e resolução de status

**What**: Adicionar `kind: "accept" | "revoke"` e `textVersion: string | null` ao estado; `ConsentRecord.create` passa a exigir `textVersion`; novo `ConsentRecord.revoke(input)`; novo helper estático `ConsentRecord.resolveStatus(records, consentText): { accepted: boolean; current: ConsentRecord | null }` que olha o registro de `acceptedAt` mais recente (qualquer `kind`) e só considera aceito se ele for `kind: "accept"` e `covers(consentText)`.
**Where**: `src/domain/consent/consent-record.ts`
**Depends on**: None
**Reuses**: `hashConsentText`, padrão de imutabilidade já existente
**Requirement**: CONSENT-01, CONSENT-03, CONSENT-05

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `restore()` aceita linhas legadas sem `kind`/`textVersion` (default `kind: "accept"`, `textVersion: null`)
- [ ] `revoke()` cria registro `kind: "revoke"`, sem `textHash` de um texto novo (reusa hash do texto vigente ou `null` — decisão registrada no teste)
- [ ] `resolveStatus`: revogação mais recente → `accepted: false`; aceite mais recente cobrindo o texto vigente → `accepted: true`; aceite mais recente de versão antiga → `accepted: false`
- [ ] Aceitar de novo após revogar é permitido (sem estado terminal)
- [ ] Gate: `npm run typecheck && npx vitest run tests/domain/consent-record.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(consent): adiciona versão, revogação e resolução de status ao aceite LGPD (#70)`

---

### T5: Persistência de versão/revogação de consentimento

**What**: Migration Drizzle adicionando `kind` (default `'accept'`) e `text_version` (nullable) a `consent_records`; `DrizzleConsentRecordRepository.save` grava os campos novos; novo método `findLatestByPatientId(patientId): Promise<ConsentRecord | null>`.
**Where**: `src/infrastructure/persistence/drizzle/schema.ts`, `src/infrastructure/persistence/drizzle/drizzle-clinical-repositories.ts`, novo arquivo `drizzle/00NN_consent-versioning.sql` (próximo número livre em `drizzle/`)
**Depends on**: T4
**Reuses**: `withTenant`, padrão de `onConflictDoUpdate`/insert já usado nos outros repositórios da mesma tabela
**Requirement**: CONSENT-01, CONSENT-03

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Migration gerada/numerada seguindo a sequência existente em `drizzle/`
- [ ] `ConsentRecordRepository` (interface de domínio) ganha `findLatestByPatientId`
- [ ] Teste de integração cobre: salvar aceite com versão, salvar revogação, `findLatestByPatientId` retorna o mais recente por `acceptedAt`
- [ ] Gate: `npm run typecheck && npx vitest run tests/infrastructure/consent-record-tenant-isolation.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(consent): persiste versão e revogação do aceite LGPD (#70)`

---

### T6: Rotas de status e revogação de consentimento no portal

**What**: `GET /api/portal/patient/consent` passa a usar `ConsentRecord.resolveStatus` (via `findByPatientId` ou `findLatestByPatientId`) em vez de `.find(covers)`, retornando também `revoked`/`textVersion`; `POST` de aceite usa `resolveStatus` pra decidir idempotência; novo endpoint `POST /api/portal/patient/consent/revoke` grava revogação e chama `recordAudit` (`action: "update"`, `resourceType: "consent"`).
**Where**: `src/app/api/portal/patient/consent/route.ts`, novo `src/app/api/portal/patient/consent/revoke/route.ts`
**Depends on**: T5
**Reuses**: `requirePortalSession`, `recordAudit`, `clientIp`
**Requirement**: CONSENT-02, CONSENT-03, CONSENT-04 (parcial — ver T7), CONSENT-05, CONSENT-06

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `GET` retorna `accepted`, `revoked`, `acceptedAt`, `textVersion` do status resolvido
- [ ] `POST /revoke` grava revogação e evento de auditoria antes de responder
- [ ] Paciente sem nenhum aceite → GET retorna "sem consentimento registrado" (distinto de revogado) — ver Edge Cases da spec
- [ ] Aceitar → revogar → aceitar de novo → GET reflete `accepted: true` outra vez
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/portal-routes.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(portal): revogação self-service de consentimento LGPD (#70)`

---

### T7: Gate de consentimento do upload de foto usa status resolvido [P]

**What**: `POST /api/portal/patient/photos` troca `.some(record => record.covers(CONSENT_TEXT))` por `ConsentRecord.resolveStatus(...).accepted`, para que uma revogação bloqueie o upload mesmo com um aceite antigo de hash igual ainda na lista.
**Where**: `src/app/api/portal/patient/photos/route.ts`
**Depends on**: T5
**Reuses**: `ConsentRecord.resolveStatus` (T4)
**Requirement**: CONSENT-04

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Paciente com aceite revogado não consegue subir foto (`ConsentRequiredError`), mesmo com aceite antigo do mesmo texto no histórico
- [ ] Paciente com aceite vigente continua subindo normalmente (sem regressão)
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/portal-routes.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `fix(portal): upload de foto respeita revogação de consentimento (#70)`

---

### T8: `recordAudit`/`recordAuditNow` aceitam ator explícito pré-sessão

**What**: `AuditInput` ganha campo opcional `actorOverride?: { role: string; id: string; clinicId: string | null }`; `persistAuditEvent` usa `actorOverride` quando presente, em vez de `session?.role`/`.subject`/`.clinicId`.
**Where**: `src/lib/audit.ts`
**Depends on**: None
**Reuses**: `AuditEvent.create`, `LEGACY_CLINIC_ID`
**Requirement**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-07 (mecanismo base)

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `actorOverride` presente → evento usa seus valores, ignora `session`
- [ ] `actorOverride` ausente → comportamento atual inalterado (regressão zero, sessão continua funcionando como hoje)
- [ ] Gate: `npm run typecheck && npx vitest run tests/lib/audit.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(audit): permite ator explícito pra eventos pré-sessão (#71)`

---

### T9: Auditoria de login (sucesso e falha) [P]

**What**: `POST /api/auth/login` chama `recordAuditNow` com `actorOverride` — sucesso: `resourceType: "session"`, `action: "read"`, ator = conta autenticada; falha: `detail: "invalid_credentials"`, ator = `{ role: "anonymous", id: <email tentado>, clinicId: null }` (nunca revela se a conta existe além do que a resposta HTTP já revela — AC-02). Sem auditoria quando bloqueado por rate limit (Edge Case da spec).
**Where**: `src/app/api/auth/login/route.ts`
**Depends on**: T8
**Reuses**: `recordAuditNow`, `LEGACY_CLINIC_ID`
**Requirement**: AUDIT-01, AUDIT-02

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Login válido gera 1 evento com ator/empresa corretos
- [ ] Login inválido (senha errada) gera 1 evento de falha
- [ ] Login inválido (conta inexistente) gera 1 evento de falha, sem detalhe que distinga do caso "senha errada"
- [ ] Bloqueio por rate limit (429) NÃO gera evento adicional
- [ ] Falha ao persistir o evento propaga erro (write-ahead, `recordAuditNow`)
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/auth-routes.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(auth): audita tentativa de login, sucesso e falha (#71)`

---

### T10: Auditoria de logout [P]

**What**: `POST /api/auth/logout` passa a ler a sessão (cookie) ANTES de limpar, e chama `recordAuditNow` com o ator da sessão (se houver sessão válida; sem sessão, não há o que auditar — segue limpando o cookie normalmente).
**Where**: `src/app/api/auth/logout/route.ts`
**Depends on**: T8
**Reuses**: `getRequestSession` (mesmo helper de `require-session.ts`), `recordAuditNow`
**Requirement**: AUDIT-03

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Logout com sessão válida gera 1 evento antes da resposta
- [ ] Logout sem sessão (cookie ausente/expirado) não lança erro, apenas não audita
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/auth-routes.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(auth): audita logout (#71)`

---

### T11: Auditoria de definição/reset de senha [P]

**What**: `POST /api/auth/set-password` chama `recordAuditNow` após `ConsumeAuthToken.execute` ter sucesso, com `actorOverride` = conta que teve a senha alterada (`resourceType: "account-password"`, `action: "update"`, `detail` = propósito do token — `"invite"` ou `"reset"`).
**Where**: `src/app/api/auth/set-password/route.ts` (e possivelmente `src/application/auth/auth-token-flow.ts` se o resultado de `ConsumeAuthToken` precisar expor a conta/propósito pro chamador)
**Depends on**: T8
**Reuses**: `recordAuditNow`
**Requirement**: AUDIT-07

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Consumo de token de convite gera evento com `detail` indicando convite
- [ ] Consumo de token de reset gera evento com `detail` indicando reset
- [ ] Token inválido/expirado (fluxo já existente de erro) não gera evento
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/set-password-route.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(auth): audita definição/reset de senha (#71)`

---

### T12: Auditoria de criação de paciente [P]

**What**: `POST /api/patients` chama `recordAudit` (já com `Session` disponível) após `CreatePatient.execute`, `action: "create"`, `resourceType: "patient"`.
**Where**: `src/app/api/patients/route.ts`
**Depends on**: None
**Reuses**: `recordAudit` já existente (sem mudança de assinatura necessária)
**Requirement**: AUDIT-04

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Criar paciente com sucesso gera 1 evento com `resourceId`/`patientId` = id do paciente criado
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/api-flow.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(patients): audita criação de paciente (#71)`

---

### T13: Auditoria de alteração de dados da clínica [P]

**What**: `PUT /api/settings/clinic-info` chama `recordAudit` após `clinics.update`, `action: "update"`, `resourceType: "clinic-info"`.
**Where**: `src/app/api/settings/clinic-info/route.ts`
**Depends on**: None
**Reuses**: `recordAudit` já existente
**Requirement**: AUDIT-05

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `PUT` bem-sucedido gera 1 evento
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/clinic-info-settings.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(settings): audita alteração de dados da clínica (#71)`

---

### T14: Auditoria de alteração de configuração de agenda [P]

**What**: `PUT /api/settings/schedule` chama `recordAudit` após `scheduleConfig.save`, `action: "update"`, `resourceType: "clinic-schedule"`.
**Where**: `src/app/api/settings/schedule/route.ts`
**Depends on**: None
**Reuses**: `recordAudit` já existente
**Requirement**: AUDIT-06

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `PUT` bem-sucedido gera 1 evento
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/schedule-settings-tenant-isolation.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(settings): audita alteração de configuração de agenda (#71)`

---

### T15: Helpers null-safe de cifra + detector de payload já cifrado

**What**: Em `src/lib/auth/crypto.ts`, adicionar `encryptField(value: string | null, secret: string): string | null` e `decryptField(value: string | null, secret: string): string | null` (passam `null` direto, chamam `encryptSecret`/`decryptSecret` pro resto); adicionar `isEncryptedPayload(value: string): boolean` (tenta decifrar com o secret — sucesso = já cifrado; usado pelo script de migração de dado pra idempotência).
**Where**: `src/lib/auth/crypto.ts`
**Depends on**: None
**Reuses**: `encryptSecret`/`decryptSecret` existentes, sem alterá-los
**Requirement**: CRYPTO-04

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `encryptField(null, secret)` → `null`; `encryptField("x", secret)` → cifrado
- [ ] `decryptField(null, secret)` → `null`; round-trip decifra igual ao valor original
- [ ] `isEncryptedPayload` retorna `true` pra payload cifrado válido, `false` pra texto plano (formato não bate com `iv.tag.ciphertext`)
- [ ] Gate: `npm run typecheck && npx vitest run tests/lib/auth.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(crypto): helpers null-safe e detecção de payload cifrado (#72)`

---

### T16: `DrizzleEvolutionNoteRepository` cifra os 4 campos SOAP

**What**: Construtor ganha `secret: string`; `save` cifra `subjective`/`objective`/`assessment`/`plan` com `encryptField`; `findByPatientId` decifra os 4 antes de `EvolutionNote.restore`.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-clinical-repositories.ts` (classe `DrizzleEvolutionNoteRepository`)
**Depends on**: T15
**Reuses**: `encryptField`/`decryptField`
**Requirement**: CRYPTO-01, CRYPTO-02, CRYPTO-04

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Evolução salva → consulta SQL direta na tabela (bypass do repositório, no teste) não retorna o texto plano
- [ ] `findByPatientId` retorna texto plano de volta (round-trip)
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/evolution-note-tenant-isolation.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(clinical): cifra nota de evolução em repouso (#72)`

---

### T17: `DrizzleClinicalConditionRepository` cifra `notes`

**What**: Construtor ganha `secret: string`; `save` cifra `condition.notes`; `toEntity`/leituras decifram antes de `ClinicalCondition.restore`.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-clinical-repositories.ts` (classe `DrizzleClinicalConditionRepository`)
**Depends on**: T16 (mesmo arquivo — sequencial por segurança de edição, ver nota da Execution Plan)
**Reuses**: `encryptField`/`decryptField`
**Requirement**: CRYPTO-03, CRYPTO-04

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Condição salva com `notes` → consulta SQL direta não retorna texto plano
- [ ] Leitura (`findById`, `findByPatientId`, `findByIds`, `findByPatientIds`) retorna texto plano de volta
- [ ] `notes: null` persiste/lê como `null` (sem tentar cifrar string vazia)
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/condition-tenant-isolation.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(clinical): cifra nota de condição clínica em repouso (#72)`

---

### T18: `DrizzleConditionAssessmentRepository` cifra `notes`

**What**: Construtor ganha `secret: string`; `save` cifra `assessment.notes`; leitura decifra antes de `ConditionAssessment.restore`.
**Where**: `src/infrastructure/persistence/drizzle/drizzle-clinical-repositories.ts` (classe `DrizzleConditionAssessmentRepository`)
**Depends on**: T17 (mesmo arquivo)
**Reuses**: `encryptField`/`decryptField`
**Requirement**: CRYPTO-03, CRYPTO-04

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Avaliação salva com `notes` → consulta SQL direta não retorna texto plano
- [ ] Leitura (`findByConditionId`, `findByConditionIds`) retorna texto plano de volta
- [ ] `notes: null` persiste/lê como `null`
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/clinical-routes.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(clinical): cifra nota de avaliação clínica em repouso (#72)`

---

### T19: `container.ts` passa o secret e falha fechado sem `AUTH_SECRET`

**What**: `getRepositories()` chama `getAuthConfig()`; se `null`, os 3 repositórios cifrados NÃO são construídos com secret válido — lançar erro explícito ao tentar construí-los (nunca gravar em claro). Com `auth` presente, passa `auth.secret` aos 3 construtores atualizados em T16–T18.
**Where**: `src/infrastructure/container.ts`
**Depends on**: T16, T17, T18
**Reuses**: `getAuthConfig` (já importado no arquivo pro fluxo do Google Calendar)
**Requirement**: CRYPTO-06

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Com `AUTH_SECRET` configurado, os 3 repositórios funcionam normalmente (regressão zero nos testes de T16–T18)
- [ ] Sem `AUTH_SECRET`, uma tentativa de usar qualquer um dos 3 repositórios lança erro explícito (não string vazia/plaintext)
- [ ] Gate: `npm run typecheck && npx vitest run tests/api/evolution-note-tenant-isolation.test.ts`

**Tests**: integration
**Gate**: full

**Commit**: `feat(infra): fail-closed de cifra clínica sem AUTH_SECRET (#72)`

---

### T20: Script de migração de dado existente

**What**: `scripts/encrypt-clinical-fields.ts` — lê `AUTH_SECRET` do ambiente (falha se ausente), itera `evolution_notes`, `clinical_conditions`, `condition_assessments` em lote; pra cada campo sensível não nulo, usa `isEncryptedPayload` (T15) pra pular linhas já cifradas (idempotência) e `encryptField` pras demais; faz `UPDATE` em lote.
**Where**: `scripts/encrypt-clinical-fields.ts` (novo)
**Depends on**: T19
**Reuses**: `getDb()`, `isEncryptedPayload`/`encryptField` (T15), mesmo padrão de CLI de `scripts/import-taxonomy.ts`
**Requirement**: CRYPTO-05

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Rodar o script 2x seguidas não altera o resultado da 2ª vez (idempotente)
- [ ] Linhas com campo `null` não são tocadas
- [ ] `npm run typecheck` passa (script tipado, sem teste dedicado — mesmo padrão de `import-taxonomy.ts`)
- [ ] Gate: `npm run typecheck && npm run lint && npm run test:coverage`

**Tests**: none
**Gate**: build

**Commit**: `chore(scripts): migra dado clínico existente pra cifra em repouso (#72)`

---

## Parallel Execution Map

```
Phase 1:
  T1 ──→ [T2, T3] (paralelo)

Phase 2:
  T4 ──→ T5 ──→ [T6, T7] (paralelo — arquivos diferentes)

Phase 3:
  T8 ──→ [T9, T10, T11] (paralelo — arquivos diferentes)
  [T12, T13, T14] (paralelo, sem dependência)

Phase 4:
  T15 ──→ T16 ──→ T17 ──→ T18 ──→ T19 ──→ T20
  (sequencial — mesmo arquivo em T16-T18, container.ts compartilhado em T19)
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 arquivo, 2 funções + 2 tipos | ✅ Granular |
| T2, T3 | 1 arquivo cada, 1 troca de import/chamada | ✅ Granular |
| T4 | 1 arquivo, 1 classe (3 métodos novos/alterados) | ✅ Granular |
| T5 | 1 migration + 1 arquivo (1 classe, 1 método novo) | ✅ Granular |
| T6 | 2 arquivos (1 modificado, 1 novo), mesmo domínio (rota de consentimento) | ⚠️ OK — coeso (mesmo fluxo) |
| T7 | 1 arquivo, 1 troca de condição | ✅ Granular |
| T8 | 1 arquivo, 1 parâmetro novo | ✅ Granular |
| T9, T10, T11 | 1 arquivo cada | ✅ Granular |
| T12, T13, T14 | 1 arquivo cada, 1 chamada nova | ✅ Granular |
| T15 | 1 arquivo, 3 funções | ✅ Granular |
| T16, T17, T18 | 1 classe cada (mesmo arquivo) | ✅ Granular |
| T19 | 1 arquivo, wiring de 3 construtores | ✅ Granular |
| T20 | 1 arquivo novo, 1 script | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Origem do diagrama de Phase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | None | Origem do diagrama de Phase 2 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T5 | T5 → T7 | ✅ Match |
| T8 | None | Origem do diagrama de Phase 3 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T8 | T8 → T10 | ✅ Match |
| T11 | T8 | T8 → T11 | ✅ Match |
| T12 | None | Sem seta de entrada | ✅ Match |
| T13 | None | Sem seta de entrada | ✅ Match |
| T14 | None | Sem seta de entrada | ✅ Match |
| T15 | None | Origem do diagrama de Phase 4 | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | T16, T17, T18 | T18 → T19 (sequência acumulada) | ✅ Match |
| T20 | T19 | T19 → T20 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Lib puro (`dto.ts`) | unit | unit | ✅ OK |
| T2 | Rota de API | integration | integration | ✅ OK |
| T3 | Rota de API | integration | integration | ✅ OK |
| T4 | Domínio (`ConsentRecord`) | unit | unit | ✅ OK |
| T5 | Repositório Drizzle + schema | integration | integration | ✅ OK |
| T6 | Rota de API | integration | integration | ✅ OK |
| T7 | Rota de API | integration | integration | ✅ OK |
| T8 | Lib puro (`audit.ts`) | unit | unit | ✅ OK |
| T9 | Rota de API | integration | integration | ✅ OK |
| T10 | Rota de API | integration | integration | ✅ OK |
| T11 | Rota de API | integration | integration | ✅ OK |
| T12 | Rota de API | integration | integration | ✅ OK |
| T13 | Rota de API | integration | integration | ✅ OK |
| T14 | Rota de API | integration | integration | ✅ OK |
| T15 | Lib puro (`crypto.ts`) | unit | unit | ✅ OK |
| T16 | Repositório Drizzle | integration | integration | ✅ OK |
| T17 | Repositório Drizzle | integration | integration | ✅ OK |
| T18 | Repositório Drizzle | integration | integration | ✅ OK |
| T19 | Composition root (`container.ts`) | none (excluído da cobertura, `vitest.config.ts`) | integration (via T16 regressão) | ✅ OK — teste é regressão do repositório que ele fia, não do arquivo de wiring em si |
| T20 | Script CLI | none | none | ✅ OK |

**Coverage:** 25 requisitos, 25 mapeados às tasks acima, 0 sem mapeamento.
