# RBAC: Catálogo de 6 Papéis — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec**: `.specs/features/rbac-catalogo-papeis/spec.md`
**Design**: `.specs/features/rbac-catalogo-papeis/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase (`AGENTS.md`: "90% coverage minimum enforced"; sampled `tests/lib/access-policy.test.ts`, `tests/lib/require-session.test.ts`, `tests/api/route-guard-conformance.test.ts`, `tests/api/auth-routes.test.ts`, `tests/support/session.ts`). No test-strategy doc beyond `AGENTS.md`'s coverage line — strong defaults applied on top of it.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain (role enum, `role-hierarchy.ts`, `route-family.ts`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `tests/domain/**`, `tests/lib/**` | `npm run test` |
| Application use-case (`create-account.ts`, `ensure-link` call sites) | unit (in-memory repos) | All branches; hierarchy matrix fully enumerated | `tests/application/**` | `npm run test` |
| Repository (`professional-patient-link-repository.ts`, `user-account` role/clinicId round-trip) | integration (PGlite) | Key query paths (idempotent `ensureLink`, `findLinkedPatientIds`) + error handling | `tests/infrastructure/**`, `tests/api/**` (route-level) | `npm run test` |
| Route handlers (`/api/accounts`, `/api/patients*`, `/api/appointments`, clinical-family routes) | integration (HTTP + PGlite) | Happy path + every listed edge case + error/failure paths per role | `tests/api/**` | `npm run test` |
| Route-conformance sweep (all 6 roles × route families) | integration (HTTP + PGlite) | Every guarded route × 6 roles: allowed or 403/401/404 as spec'd | `tests/api/route-guard-conformance.test.ts` | `npm run test` |
| Schema / migration (`role` column, `professional_patient_links` table) | integration | Migration backfills 100% of rows; no orphaned NULL `role` | `tests/infrastructure/migrations/**` (or equivalent existing pattern) | `npm run test` |
| Entity / config-only changes | none | — build gate only | — | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only (domain/application) | `npm run test` |
| Full | After tasks with route/integration tests (PGlite) | `npm run test:coverage` |
| Build | After phase completion | `npm run typecheck && npm run lint && npm run check:sv && npm run build` |

---

## Execution Plan

Phases run sequentially; tasks within a phase run in order. R1 (Phase 1-2) must land before R2/R3/R4 start (all three blocked by #28 per the issues); R2, R3, R4 are mutually independent but executed in the issues' stated order.

```
Phase 1 (R1 — catálogo + fix do bug)
Phase 2 (R1 — conformidade + rota família)
Phase 3 (R2 — hierarquia de cadastro)
Phase 4 (R3 — restrição do Atendente)
Phase 5 (R4 — escopo dinâmico do Profissional)
```

### Phase 1: Catálogo de 6 papéis + correção do bug (R1, parte 1)

```
T1 → T2 → T3 → T4
T1 → T5
T1 → T6
T4 → T6
```

### Phase 2: Regra grosseira de família de rota + conformidade (R1, parte 2)

```
T1 → T7 → T8
```

### Phase 3: Hierarquia de cadastro de contas (R2)

```
T1 → T9 → T10 → T11 → T12
T3 → T10
```

### Phase 4: Restrição operacional do Atendente (R3)

```
T8 → T13 → T14
```

### Phase 5: Escopo dinâmico do Profissional (R4)

```
T1 → T15
T15 → T16 → T19
T15 → T17 → T19
T15 → T18
T8 → T18 → T19
```

---

## Task Breakdown

### T1: Expandir `UserRole` para os 6 papéis ✅ Complete

**What**: Trocar `USER_ROLES` de `["admin", "partner", "patient"]` para `["super_admin", "company_admin", "atendente", "profissional", "patient", "partner"]`.
**Where**: `src/domain/auth/user-role.ts`
**Depends on**: None
**Reuses**: nada — é o arquivo-fonte já existente.
**Requirement**: RBAC-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `USER_ROLES` tem exatamente os 6 valores do catálogo.
- [ ] Todo import quebrado por causa do array (ex. `session.ts` comentário, testes que assumem 3 papéis) é atualizado nesta mesma task.
- [ ] `npm run typecheck` aponta todos os call sites que assumiam `"admin"` implicitamente (serão corrigidos nas tasks seguintes, mas o compilador deve listar todos).

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): expande catalogo de papeis para os 6 valores do RBAC`

---

### T2: Migração — coluna `role` em `user_accounts` + `clinic_id` nullable ✅ Complete

**What**: Migração Drizzle: adiciona `role text`, backfill `'company_admin'` para linhas existentes, `NOT NULL`; altera `clinic_id` para nullable. Promove explicitamente a conta de bootstrap (se existir alguma usada como super-usuário em seed/fixture) a `super_admin` na mesma migração.
**Where**: `drizzle/<novo>_add_role_to_user_accounts.sql` (ou equivalente gerado por `drizzle-kit`), `src/infrastructure/persistence/drizzle/schema.ts`
**Depends on**: T1
**Reuses**: padrão de migração única + backfill de M1 (issue #22, `.specs/features/fundacao-multi-tenancy/`).
**Requirement**: RBAC-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `role` existe, `NOT NULL`, tipo compatível com `UserRole`.
- [ ] `clinic_id` aceita `NULL`.
- [ ] Teste de migração comprova 100% das linhas com `role` preenchido após rodar.
- [ ] `npm run db:migrate` roda limpo localmente.

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): adiciona coluna role e permite clinic_id nulo em user_accounts`

---

### T3: `UserAccount` (domínio) ganha `role` ✅ Complete

**What**: Entidade `UserAccount` passa a carregar `role: UserRole`; `UserAccountRepository` round-tripa a coluna nova.
**Where**: `src/domain/auth/user-account.ts`, `src/infrastructure/persistence/drizzle/user-account-repository.ts` (ou nome equivalente)
**Depends on**: T2
**Reuses**: entidade e repositório já existentes.
**Requirement**: RBAC-01, RBAC-02

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `UserAccount.role` presente e tipado.
- [ ] `save`/`findByEmail`/`findAll` preservam `role` corretamente.
- [ ] Testes existentes de repositório atualizados para o novo campo (sem remover cobertura).

**Tests**: integration
**Gate**: full

**Commit**: `feat(auth): entidade e repositorio de UserAccount passam a carregar role`

---

### T4: Corrigir o bug — login por senha usa o papel da própria conta ✅ Complete

**What**: `POST /api/auth/login` deixa de hardcodar `"admin"`/`LEGACY_CLINIC_ID` — lê `role` e `clinicId` do `UserAccount` autenticado (`authenticateAccount`) e grava esses valores no token de sessão. `authenticateMaster` (senha mestre) continua mapeando para `super_admin` (única exceção documentada, até a #21 remover a senha mestre).
**Where**: `src/app/api/auth/login/route.ts`
**Depends on**: T3
**Reuses**: `createSessionToken` já existente.
**Requirement**: RBAC-02, RBAC-04

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Autenticar com uma conta de papel `profissional` produz sessão com `role: "profissional"`.
- [ ] Autenticar com a senha mestre continua produzindo `role: "super_admin"`.
- [ ] Teste de rota comprova a AC RBAC-04 (sessão nunca vira `super_admin` para conta cujo `role` gravado não é `super_admin`).

**Tests**: integration
**Gate**: full

**Commit**: `fix(auth): login por senha usa o papel gravado na propria conta`

---

### T5: Google OAuth mapeia `admin` → `super_admin` (mapeamento transitório) ✅ Complete

**What**: `ResolveUserRole` passa a retornar `"super_admin"` no ramo antes retornava `"admin"`, sem alterar prioridade nem os ramos `partner`/`patient`.
**Where**: `src/application/auth/resolve-user-role.ts`, `src/app/api/auth/google/callback/route.ts`
**Depends on**: T1
**Reuses**: use-case e allowlist já existentes (`GOOGLE_ALLOWED_EMAILS`).
**Requirement**: RBAC-03

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] E-mail na allowlist resolve para `super_admin`.
- [ ] `partner`/`patient` via Google inalterados.
- [ ] Testes existentes desse use-case atualizados (valor esperado muda de `"admin"` para `"super_admin"`).

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): login google mapeia admin para super_admin (transitorio ate #21)`

---

### T6: Atualizar `tests/support/session.ts` e fixtures para os 6 papéis ✅ Complete

**What**: Helpers de teste (`sessionToken`, `cookieHeaderFor`) continuam genéricos por `UserRole`; garantir que nenhum teste existente ainda referencia `"admin"` como papel — migrar para `"super_admin"` ou `"company_admin"` conforme o cenário original pretendia (equipe com acesso total → `company_admin` na maioria dos casos de negócio; cross-clinic → `super_admin`).
**Where**: `tests/support/session.ts`, todo teste existente que usa `role: "admin"` (grep-wide)
**Depends on**: T1, T4
**Reuses**: helpers já existentes.
**Requirement**: RBAC-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Nenhuma ocorrência de `"admin"` como valor de `UserRole` na suíte de testes.
- [ ] Suíte completa (`npm run test:coverage`) roda sem falha nova introduzida pela renomeação.

**Tests**: unit (suíte existente migrada e reexecutada — nenhum teste novo, mas cobertura pré-existente confirma a migração)
**Gate**: full

**Commit**: `test(auth): migra fixtures de teste de admin para os 6 papeis`

---

### T7: `route-family.ts` — classificação de rota + matriz papel×família ✅ Complete

**What**: Novo módulo `classifyRoute(pathname)` e `isFamilyAllowedForRole(family, role)`, implementando a tabela de famílias do design (`clinical`/`operational`/`administrative`/`shared`).
**Where**: `src/lib/auth/route-family.ts` (novo)
**Depends on**: T1
**Reuses**: padrão de módulo puro de `access-policy.ts`.
**Requirement**: RBAC-05

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Toda rota listada na tabela do design é classificada corretamente (teste parametrizado, 1 caso por prefixo).
- [ ] `isFamilyAllowedForRole` cobre as 6×4 combinações papel×família da matriz.

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): adiciona classificacao de rota por familia e matriz papel-familia`

---

### T8: `access-policy.ts` + `require-session.ts` consomem `route-family`; estender conformidade ✅ Complete

**What**: `isAllowedForRole` passa a delegar para `isFamilyAllowedForRole(classifyRoute(pathname), role)` em vez do binário atual; `requireStaffSession` vira wrapper de uma nova `requireRole(request, STAFF_ROLES)`; `tests/api/route-guard-conformance.test.ts` ganha os 6 papéis parametrizados por família (tabela `role → { allowedFamilies, sampleRoutes }`, conforme design).
**Where**: `src/lib/auth/access-policy.ts`, `src/lib/auth/require-session.ts`, `tests/api/route-guard-conformance.test.ts`
**Depends on**: T7
**Reuses**: `Guard<S>` já existente; `route-guard-conformance.test.ts` já existente (estendido, não reescrito).
**Requirement**: RBAC-05, RBAC-06

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `proxy.ts` e `require-session.ts` continuam lendo da MESMA política (nenhuma allowlist duplicada).
- [ ] Conformidade cobre os 6 papéis × famílias, caminho permitido e negado por papel.
- [ ] Nenhuma rota hoje protegida perde proteção (regressão zero — suíte completa roda).

**Tests**: integration
**Gate**: full

**Commit**: `feat(auth): politica de acesso passa a decidir por familia de rota e cobre 6 papeis`

---

### T9: `RoleHierarchy` — regra pura de provisionamento ✅ Complete

**What**: `PROVISIONING_MATRIX` + `canProvision(actorRole, targetRole)` implementando a matriz da spec (RBAC-07..RBAC-09).
**Where**: `src/domain/auth/role-hierarchy.ts` (novo)
**Depends on**: T1
**Reuses**: padrão de política pura já usado no domínio.
**Requirement**: RBAC-07, RBAC-08, RBAC-09, RBAC-10

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Toda combinação da matriz (36 pares papel-ator × papel-alvo) tem um caso de teste explícito.
- [ ] `patient`/`partner` nunca aparecem como ator permitido (RBAC-10 coberto).

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): adiciona regra pura de hierarquia de provisionamento de contas`

---

### T10: Use-case `CreateAccount` com validação de hierarquia + empresa ✅ Complete

**What**: Novo use-case que valida `canProvision` e `input.clinicId === actor.clinicId` (exceto `super_admin`) antes de criar a conta; lança erro tipado em caso de negação.
**Where**: `src/application/auth/create-account.ts` (novo)
**Depends on**: T9, T3
**Reuses**: `UserAccountRepository`, `hashPassword` já existentes.
**Requirement**: RBAC-11, RBAC-12

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Teste com repositório em memória cobre a hierarquia completa (permitido/negado) e o cross-empresa negado.
- [ ] `super_admin` criando em qualquer empresa é aceito.

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): use-case de criacao de conta aplica hierarquia e escopo de empresa`

---

### T11: `POST /api/accounts` usa `CreateAccount`; payload exige `role` ✅ Complete

**What**: Route handler troca a criação direta por chamada ao use-case; schema de validação (`createSchema`) exige `role`; mapeia erro de hierarquia para 403 com mensagem clara.
**Where**: `src/app/api/accounts/route.ts`
**Depends on**: T10
**Reuses**: `requireStaffSession`/`requireRole` (T8), `fail()`/`ok()` de `api-response`.
**Requirement**: RBAC-11, RBAC-12, RBAC-13, RBAC-14

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Teste de rota (HTTP + PGlite) cobre pelo menos um caminho permitido e um negado por papel (matriz completa via tabela, não 1 caso solto).
- [ ] Nenhuma rota de auto-cadastro existe (busca `grep` por rotas de criação sem `requireRole`/`requirePortalSession`).
- [ ] Mais de um `company_admin` por empresa aceito no teste.

**Tests**: integration
**Gate**: full

**Commit**: `feat(accounts): POST /api/accounts exige role e aplica hierarquia de provisionamento`

---

### T12: Auditoria/varredura de auto-cadastro ✅ Complete

**What**: Confirmar (com teste, não só leitura manual) que nenhuma rota de criação de conta é acessível sem sessão — inclui checar rotas de patient/partner-portal que hoje podem criar registros relacionados.
**Where**: `tests/api/route-guard-conformance.test.ts` (extensão), ou novo `tests/api/no-self-registration.test.ts`
**Depends on**: T11
**Reuses**: `collectRouteFiles` já existente.
**Requirement**: RBAC-14

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Toda rota `POST` que cria uma conta de login é coberta pelo teste e falha (não 201) sem sessão.

**Tests**: integration
**Gate**: full

**Commit**: `test(auth): confirma ausencia de rota de auto-cadastro para os 6 papeis`

---

### T13: Restringir Atendente a rotas operacionais ✅ Complete

**What**: Confirmar/ajustar que `atendente` está marcado como permitido só na família `operational` (e `shared`) na matriz de T7/T8 — se T7/T8 já cobrirem isso corretamente, esta task vira apenas o teste de rota dedicado às ACs de negócio de R3 (não só conformidade genérica).
**Where**: `tests/api/atendente-operational-scope.test.ts` (novo, foco de negócio, distinto do sweep genérico de conformidade)
**Depends on**: T8
**Reuses**: matriz papel×família já implementada.
**Requirement**: RBAC-15, RBAC-16

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Atendente lê/escreve agendamento e paciente/parceiro com sucesso.
- [ ] Atendente recebe 403 em evolução, avaliação de condição e foto.

**Tests**: integration
**Gate**: full

**Commit**: `test(auth): confirma escopo operacional do atendente (agenda e cadastro, sem clinico)`

---

### T14: Ajustar mensagens de erro específicas para Atendente (se necessário) ✅ Complete

**What**: Se T13 revelar mensagem genérica insuficiente (`STAFF_ONLY_MESSAGE` não distingue "sem permissão clínica" de "não autenticado"), adicionar mensagem específica de família negada.
**Where**: `src/lib/auth/require-session.ts` (ou `access-policy.ts`, conforme onde a mensagem é montada)
**Depends on**: T13
**Reuses**: `roleMessage` já existente (é estendida, não recriada).
**Requirement**: RBAC-16

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] 403 de família negada tem mensagem distinta de 403 de papel de portal errado.
- [ ] Teste de T13 (ou novo teste unitário de `roleMessage`) confirma o texto.

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): mensagem de 403 distingue familia de rota negada`

---

### T15: Tabela `professional_patient_links` + repositório ✅ Complete

**What**: Migração + tabela Drizzle (`clinicId`, `professionalId`, `patientId`, `createdAt`, unique composto) + `ProfessionalPatientLinkRepository` (`ensureLink`, `hasLink`, `findLinkedPatientIds`), usando `withTenant`.
**Where**: `drizzle/<novo>_professional_patient_links.sql`, `src/infrastructure/persistence/drizzle/schema.ts`, `src/infrastructure/persistence/drizzle/professional-patient-link-repository.ts` (novo), `src/domain/clinical/professional-patient-link.ts` (novo)
**Depends on**: T1
**Reuses**: `withTenant` (AD-017), padrão de repositório já usado em outras entidades por-empresa.
**Requirement**: RBAC-17, RBAC-21

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `ensureLink` é idempotente (chamada 2x não duplica, não lança).
- [ ] `findLinkedPatientIds` retorna só pacientes vinculados àquele profissional, escopado por clínica.
- [ ] Teste de repositório (PGlite) cobre os 3 métodos.

**Tests**: integration
**Gate**: full

**Commit**: `feat(clinical): adiciona tabela e repositorio de vinculo profissional-paciente`

---

### T16: `ensureLink` chamado no cadastro de paciente por Profissional ✅ Complete

**What**: `POST /api/patients` chama `ensureLink` quando `session.role === "profissional"`, após criar o paciente.
**Where**: `src/app/api/patients/route.ts`
**Depends on**: T15
**Reuses**: `ProfessionalPatientLinkRepository` (T15).
**Requirement**: RBAC-17, RBAC-18

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Teste de rota: Profissional cadastra paciente → paciente aparece imediatamente para aquele profissional, mesmo sem agendamento.
- [ ] Agenda desse paciente retorna vazia (não erro) para o mesmo profissional.

**Tests**: integration
**Gate**: full

**Commit**: `feat(patients): profissional que cadastra paciente ganha vinculo imediato`

---

### T17: `ensureLink` chamado na criação de agendamento e nota de evolução

**What**: `POST /api/appointments` e `POST /api/patients/[id]/evolutions` chamam `ensureLink` quando o registro criado tem `professionalId`.
**Where**: `src/app/api/appointments/route.ts`, `src/app/api/patients/[id]/evolutions/route.ts`
**Depends on**: T15
**Reuses**: `ProfessionalPatientLinkRepository` (T15).
**Requirement**: RBAC-19, RBAC-20, RBAC-21

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Teste: Dr. A tem appointment com paciente P → link gravado.
- [ ] Teste: Dr. B ganha agendamento com o mesmo paciente P → Dr. B também vinculado, Dr. A **mantém** o vínculo (cenário de transferência de caso completo, RBAC-20).

**Tests**: integration
**Gate**: full

**Commit**: `feat(clinical): agendamento e evolucao com profissional criam vinculo com paciente`

---

### T18: Checagem de vínculo no handler — Profissional só acessa paciente vinculado

**What**: Rotas de paciente individual (`/api/patients/[id]/*` e leitura de `/api/patients/[id]`) ganham checagem extra: se `session.role === "profissional"`, exigir `hasLink(session.professionalId, patientId)`; sem vínculo → 404 (nunca vazar existência).
**Where**: `src/app/api/patients/[id]/route.ts`, `src/app/api/patients/[id]/evolutions/route.ts`, `src/app/api/patients/[id]/conditions/route.ts`, `src/app/api/patients/[id]/anamnesis/route.ts`, `src/app/api/patients/[id]/care-plans/route.ts` (todas as sub-rotas clínicas de paciente)
**Depends on**: T15, T8
**Reuses**: `hasLink` (T15); `requireRole` (T8) para a checagem de família; padrão 404-não-403 já estabelecido em M2 (issue #23).
**Requirement**: RBAC-17, RBAC-19

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Profissional sem nenhum vínculo → 404 em toda sub-rota clínica listada.
- [ ] Profissional com vínculo (via T16 ou T17) → acesso normal.
- [ ] `Session` ganha claim `professionalId` (mapeado do `UserAccount.professionalId` no momento do login, T4) para a checagem funcionar sem consulta extra de conta.

**Tests**: integration
**Gate**: full

**Commit**: `feat(patients): profissional so acessa paciente com vinculo registrado (404 sem vazar existencia)`

---

### T19: Teste de cenário completo de transferência de caso (Dr. A → Dr. B)

**What**: Teste de rota HTTP + PGlite, ponta a ponta, cobrindo exatamente o cenário da spec (RBAC-20): Dr. A atende paciente, depois Dr. B ganha agendamento com o mesmo paciente, ambos continuam acessando o histórico do próprio período.
**Where**: `tests/api/professional-patient-scope.test.ts` (novo)
**Depends on**: T16, T17, T18
**Reuses**: fixtures de clínica (`tests/support/clinics.ts`), sessão de teste (T6).
**Requirement**: RBAC-17, RBAC-18, RBAC-19, RBAC-20, RBAC-21

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Cenário completo passa: cadastro sem agendamento, ausência de vínculo (404), transferência de caso com acesso mantido para ambos os profissionais.
- [ ] `npm run test:coverage` verde, ≥90%, sem regressão na suíte completa (1928 + novos testes).

**Tests**: integration
**Gate**: build

**Commit**: `test(clinical): cobre cenario completo de transferencia de caso entre profissionais`

---

## Phase Execution Map

```
Phase 1 (R1a): T1 → T2 → T3 → T4 → T6
                T1 → T5
                T4 → T6
Phase 2 (R1b): T1 → T7 → T8
Phase 3 (R2):  T1 → T9 → T10 → T11 → T12
                T3 → T10
Phase 4 (R3):  T8 → T13 → T14
Phase 5 (R4):  T1 → T15 → T16 → T19
                T15 → T17 → T19
                T8 → T18 → T19
                T15 → T18
```

Execution is strictly sequential within each phase. Phases run in the order above (R1 fully done before R2/R3/R4 start; R2→R3→R4 follow issue order even though they don't depend on each other).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 file (enum) | ✅ Granular |
| T2 | 1 migration | ✅ Granular |
| T3 | entity + repo, same concept (role field) | ✅ Granular (cohesive) |
| T4 | 1 route handler | ✅ Granular |
| T5 | 1 use-case + 1 route (same value change) | ✅ Granular (cohesive) |
| T6 | test fixtures, single concern | ✅ Granular |
| T7 | 1 new module | ✅ Granular |
| T8 | policy wiring + 1 test file extension, single concern (route-family adoption) | ✅ Granular (cohesive) |
| T9 | 1 new module | ✅ Granular |
| T10 | 1 use-case | ✅ Granular |
| T11 | 1 route handler | ✅ Granular |
| T12 | 1 test file | ✅ Granular |
| T13 | 1 test file | ✅ Granular |
| T14 | 1 message/util change | ✅ Granular |
| T15 | migration + table + repo + entity, single concept (the link) | ✅ Granular (cohesive) |
| T16 | 1 route handler | ✅ Granular |
| T17 | 2 route handlers, same concern (ensureLink call site) | ✅ Granular (cohesive) |
| T18 | 5 route handlers, single concern (link-gated 404 guard) | ✅ Granular (cohesive) |
| T19 | 1 test file | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T2 | T2→T3 | ✅ Match |
| T4 | T3 | T3→T4 | ✅ Match |
| T5 | T1 | (Phase 1 chain includes T5 sequentially after T4; T5 only truly needs T1) | ✅ Match — sequential within phase, dependency subset satisfied |
| T6 | T1, T4 | after T4 in chain | ✅ Match |
| T7 | T1 | Phase 2 start | ✅ Match |
| T8 | T7 | T7→T8 | ✅ Match |
| T9 | T1 | Phase 3 start | ✅ Match |
| T10 | T9, T3 | T9→T10 (T3 already done in Phase 1) | ✅ Match |
| T11 | T10 | T10→T11 | ✅ Match |
| T12 | T11 | T11→T12 | ✅ Match |
| T13 | T8 | Phase 4 start (T8 done in Phase 2) | ✅ Match |
| T14 | T13 | T13→T14 | ✅ Match |
| T15 | T1 | Phase 5 start | ✅ Match |
| T16 | T15 | T15→T16 | ✅ Match |
| T17 | T15 | T15→T17 (sequential after T16 in chain, dependency subset satisfied) | ✅ Match |
| T18 | T15, T8 | after T17 in chain (both deps done earlier) | ✅ Match |
| T19 | T16, T17, T18 | T18→T19 | ✅ Match |

No task depends on a later-phase task. All dependencies point backward or within-phase.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Domain (enum) | unit | unit | ✅ OK |
| T2 | Schema/migration | integration | integration | ✅ OK |
| T3 | Domain + repository | integration | integration | ✅ OK |
| T4 | Route handler | integration | integration | ✅ OK |
| T5 | Application use-case | unit | unit | ✅ OK |
| T6 | Test fixtures only | unit (existing suite floor) | unit | ✅ OK |
| T7 | Domain/lib module | unit | unit | ✅ OK |
| T8 | Policy wiring + route conformance | integration | integration | ✅ OK |
| T9 | Domain module | unit | unit | ✅ OK |
| T10 | Application use-case | unit | unit | ✅ OK |
| T11 | Route handler | integration | integration | ✅ OK |
| T12 | Route conformance test | integration | integration | ✅ OK |
| T13 | Route test (business scenario) | integration | integration | ✅ OK |
| T14 | Lib util | unit | unit | ✅ OK |
| T15 | Schema + repository | integration | integration | ✅ OK |
| T16 | Route handler | integration | integration | ✅ OK |
| T17 | Route handlers | integration | integration | ✅ OK |
| T18 | Route handlers | integration | integration | ✅ OK |
| T19 | Route test (e2e scenario) | integration | integration | ✅ OK |

No violations.
