# Fase B — Clínico/legal crítico Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/fase-b-clinico-legal-critico/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase + `AGENTS.md` + `vitest.config.ts` (coverage thresholds 90%, `src/app/documentos/**` explicitly excluded from the threshold — "renderização... coberta por E2E"). Guidelines found: `AGENTS.md` (90% coverage minimum, `npm run test:e2e` for critical flows), `vitest.config.ts` (thresholds + exclude list).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain (`src/domain/clinic/clinic.ts`) | unit | Todos os branches de `isCompleteForDocumentEmission`/`isClinicInfoComplete` (cada campo obrigatório faltando isoladamente + todos presentes) | `tests/domain/clinic.test.ts` | `npx vitest run tests/domain/clinic.test.ts` |
| Repositório (`DrizzleClinicRepository.update`) | integration | Roundtrip de update + isolamento (não vaza entre clínicas) | `tests/infrastructure/drizzle-clinic-repository.test.ts` | `npx vitest run tests/infrastructure/drizzle-clinic-repository.test.ts` |
| Rotas API (`/api/settings/clinic-info`, `/api/clinic-info`, `/api/patients/[id]/evolutions`) | integration | Happy path + 403 por papel + discriminação (autoria forjada ignorada) | `tests/api/*.test.ts` | `npx vitest run tests/api` |
| Componentes/páginas staff (Configurações, prontuário, documentos) | integration (RTL) | Happy path + cada edge case listado no spec (erro, bloqueio, dirty-guard, labels de complicação) | `tests/pages/*.test.tsx` | `npx vitest run tests/pages` |
| Páginas de documento (`src/app/documentos/**`) — fora do limiar de cobertura, mas com lógica de bloqueio nova | integration (RTL) + e2e | Bloqueio fail-closed + bloqueio de status: cobertos por RTL (determinístico) **e** por E2E (fluxo real) | `tests/pages/documentos-fail-closed.test.tsx`, `e2e/documentos.spec.ts` | `npx vitest run tests/pages/documentos-fail-closed.test.tsx`; `npm run test:e2e` |
| E2E (`e2e/**`) | e2e | Fluxo real: atestado bloqueado por status, login dos 3 perfis | `e2e/*.spec.ts` | `npm run test:e2e` |
| Migration/schema (`drizzle/0026_*.sql`, `schema.ts`) | none | — (build gate only) | `drizzle/`, `src/infrastructure/persistence/drizzle/schema.ts` | `npm run typecheck` |

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| Domain unit | Yes | Puro, sem I/O | `tests/domain/clinical.test.ts` (padrão existente) |
| Infra (PGlite) | Yes entre arquivos / No dentro do arquivo | Cada arquivo de teste instancia seu próprio `PGlite` em `beforeAll` (`new PGlite()`), sem estado global compartilhado entre arquivos | `tests/infrastructure/drizzle-clinic-repository.test.ts:17-24` |
| API (rotas) | Yes | Namespaced por `clinicId` fixo (`CLINIC_A_ID`/`CLINIC_B_ID`) ou `unique()`, sem truncar tabelas entre arquivos | `tests/api/schedule-settings-tenant-isolation.test.ts` |
| RTL (páginas/componentes) | Yes | `apiFetch`/`useApiQuery` mockados por teste, sem backend real | `tests/pages/staff-operations.test.tsx` (padrão existente) |
| E2E | Yes | Dados nomeados via `unique()`; a única escrita de estado verdadeiramente compartilhado (dados da clínica) acontece uma vez em `global-setup.ts`, antes de qualquer teste rodar — sem corrida | `e2e/global-setup.ts` (seed atual de profissional/procedimentos, mesmo padrão) |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks com teste unit/integration isolado | `npx vitest run <arquivo(s) de teste da task>` |
| Full | Após tasks que tocam rotas/repositório/componentes já cobertos pelo limiar de 90% | `npm run typecheck && npm run lint && npm run check:sv && npm run test:coverage` |
| Build/E2E | Após a fase de documentos e ao final de toda a feature | `npm run build && npm run test:e2e` |

---

## Execution Plan

### Phase 1: Domínio + Persistência (Sequential-ish, mas T1/T2 independentes)

```
T1 [P] ─┐
        ├─→ T3 ─→ T4
T2 [P] ─┘
```

### Phase 2: Rotas API (após Fase 1)

```
T4 ──┬─→ T5
     └─→ T6
```

### Phase 3: UI — prontuário e documentos (após Fase 2, maioria independente)

```
T5,T6 ──┬─→ T7
        ├─→ T8
        ├─→ T9  [P]
        ├─→ T10 [P]
        ├─→ T11 [P]
        ├─→ T12 [P]
        └─→ T14 (depende de T5)

T9,T11 ──→ T13
```

### Phase 4: E2E + validação (após Fase 3)

```
T7,T14 ──→ T15
T15 ──[P]── T16
```

---

## Task Breakdown

### T1: Migration 0026 — colunas cadastrais em `clinics` [P]

**What**: Adiciona `cnpj`, `address`, `city`, `professional_name`, `professional_registry` (todas `text`, nullable) à tabela `clinics`, na migration e no `schema.ts`.
**Where**: `drizzle/0026_clinic-info-fields.sql`, `src/infrastructure/persistence/drizzle/schema.ts`
**Depends on**: None
**Reuses**: Padrão de migration incremental já usado em `drizzle/0024_*.sql`/`0025_*.sql`
**Requirement**: CLIN-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Migration aplica limpo contra PGlite (rodada implicitamente pelos testes de infra)
- [ ] `schema.ts` reflete as 5 colunas novas em `clinics`
- [ ] `npm run typecheck` passa

**Tests**: none
**Gate**: build (`npm run typecheck`)

---

### T2: `Clinic` — campos cadastrais + `updateInfo`/`isCompleteForDocumentEmission` [P]

**What**: Estende `ClinicProps`/`ClinicState` com os 5 campos opcionais (default `null`), adiciona getters, `updateInfo(fields): Clinic` (imutável) e a função pura exportada `isClinicInfoComplete(info)` + método de instância `isCompleteForDocumentEmission()` que a consome.
**Where**: `src/domain/clinic/clinic.ts`
**Depends on**: None
**Reuses**: Esqueleto atual da classe `Clinic` (constructor privado + `restore`)
**Requirement**: CLIN-01, CLIN-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `Clinic.create`/`restore` aceitam e preservam os 5 campos (default `null` em `create`)
- [ ] `updateInfo` retorna nova instância sem mutar a original
- [ ] `isClinicInfoComplete`/`isCompleteForDocumentEmission` cobrem: todos presentes → `true`; qualquer um dos 3 obrigatórios (`cnpj`, `professionalName`, `professionalRegistry`) ausente → `false`; `address`/`city` ausentes não afetam o resultado
- [ ] Gate check passa: `npx vitest run tests/domain/clinic.test.ts`
- [ ] Test count: cobre todos os branches listados acima (mínimo 5 casos)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(clinic): adiciona campos cadastrais e checagem de completude ao domínio Clinic`

---

### T3: `ClinicRepository.update` + `DrizzleClinicRepository`

**What**: Adiciona `update(clinic: Clinic): Promise<void>` à interface e à implementação Drizzle; `findById`/mapeamento (`toClinic`) passam a incluir as 5 colunas novas.
**Where**: `src/domain/clinic/clinic-repository.ts`, `src/infrastructure/persistence/drizzle/drizzle-clinic-repository.ts`
**Depends on**: T1, T2
**Reuses**: `eq(clinics.id, ...)` já usado em `findById`
**Requirement**: CLIN-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `update` grava as 5 colunas e não mexe em `name`/`createdBy`/`createdAt`
- [ ] `findById` retorna os campos novos corretamente após `update` (roundtrip)
- [ ] Teste de isolamento: `update` em uma clínica não vaza pra outra (`CLINIC_A_ID`/`CLINIC_B_ID`, mesmo padrão de `schedule-settings-tenant-isolation.test.ts`)
- [ ] Gate check passa: `npx vitest run tests/infrastructure/drizzle-clinic-repository.test.ts`
- [ ] Test count: suíte existente do arquivo + no mínimo 3 novos casos (roundtrip completo, roundtrip parcial, isolamento)

**Tests**: integration
**Gate**: quick

**Commit**: `feat(clinic): adiciona update de dados cadastrais ao repositório`

---

### T4: `ClinicInfoDto` em `dto.ts` + ajuste de `document-frame.tsx`

**What**: Move a interface `ClinicInfoDto` de `src/components/document-frame.tsx` para `src/lib/dto.ts` (convenção do projeto) e adiciona `toClinicInfoDto(clinic: Clinic): ClinicInfoDto`; `document-frame.tsx` passa a importar o tipo de `dto.ts`.
**Where**: `src/lib/dto.ts`, `src/components/document-frame.tsx`
**Depends on**: T2
**Reuses**: Padrão de `toEvolutionNoteDto` já existente em `dto.ts`
**Requirement**: CLIN-01, CLIN-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `ClinicInfoDto` só é declarada em `dto.ts`; `document-frame.tsx` importa o tipo, sem duplicar
- [ ] `toClinicInfoDto` mapeia todos os 6 campos (`name` + 5 novos)
- [ ] Nenhum import quebrado nas 4 páginas de documento que já usam `ClinicInfoDto`
- [ ] `npm run typecheck` passa

**Tests**: none (tipo + função trivial de mapeamento, exercitada indiretamente pelas tasks seguintes)
**Gate**: build

**Commit**: `refactor(dto): centraliza ClinicInfoDto em dto.ts`

---

### T5: `/api/settings/clinic-info` (GET + PUT)

**What**: Nova rota — GET retorna os dados atuais da clínica da sessão; PUT salva (`company_admin`/`super_admin` apenas, 403 para os demais papéis).
**Where**: `src/app/api/settings/clinic-info/route.ts`
**Depends on**: T3, T4
**Reuses**: Estrutura de `src/app/api/settings/schedule/route.ts` (guard + `getRepositories` + zod)
**Requirement**: CLIN-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] GET retorna `{ info: ClinicInfoDto }` da clínica da sessão
- [ ] PUT valida body (zod: strings opcionais, trim), chama `clinic.updateInfo` + `clinics.update`
- [ ] PUT por papel fora de `company_admin`/`super_admin` retorna 403
- [ ] Sem sessão retorna 401 (via `requireStaffSession`)
- [ ] Gate check passa: `npx vitest run tests/api/clinic-info-settings.test.ts`
- [ ] Test count: mínimo 5 (GET vazio, PUT+GET roundtrip, 403 atendente, 403 profissional, 401 sem sessão)

**Tests**: integration
**Gate**: quick

**Commit**: `feat(settings): adiciona rota de dados cadastrais da clínica (#61)`

---

### T6: `/api/clinic-info` — lê do banco em vez de env; remove `src/lib/clinic-info.ts`

**What**: GET passa a usar `getRepositories({clinicId}).clinics.findById(clinicId)` + `toClinicInfoDto`, com fallback de nome default quando `null`. Remove `src/lib/clinic-info.ts` (env-based, agora morto) e seus imports.
**Where**: `src/app/api/clinic-info/route.ts`, remove `src/lib/clinic-info.ts`
**Depends on**: T3, T4
**Reuses**: `toClinicInfoDto`
**Requirement**: CLIN-01, CLIN-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] GET reflete dados salvos via `/api/settings/clinic-info`
- [ ] Sem dados cadastrados, retorna nome default e demais campos `null` (não quebra as páginas de documento existentes)
- [ ] `src/lib/clinic-info.ts` removido, nenhum import quebrado (`grep -rn "lib/clinic-info"` vazio)
- [ ] Gate check passa: `npx vitest run tests/api` (roda toda a pasta — `clinic-info` pode não ter arquivo dedicado; se não houver teste existente da rota, cria um mínimo)
- [ ] Test count: mínimo 2 (com dados salvos, sem dados salvos)

**Tests**: integration
**Gate**: quick

**Commit**: `fix(clinic): lê dados cadastrais do banco em vez de variável de ambiente (#61)`

---

### T7: Atestado — bloqueio fail-closed + bloqueio de status

**What**: `src/app/documentos/atestado/[appointmentId]/page.tsx` passa a: (a) bloquear com `ErrorAlert` quando `!isClinicInfoComplete(clinic)`; (b) bloquear com `ErrorAlert` quando `appointment.status !== "completed"`. Ordem: erro de rede > loading > bloqueio de dados da clínica > bloqueio de status > documento.
**Where**: `src/app/documentos/atestado/[appointmentId]/page.tsx`
**Depends on**: T5, T6
**Reuses**: `ErrorAlert`, `isClinicInfoComplete`
**Requirement**: CLIN-02, CLIN-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Clínica sem CNPJ/responsável técnico → bloqueio, sem renderizar a declaração
- [ ] Consulta com status diferente de `completed` → bloqueio, mensagem explícita do status atual
- [ ] Clínica completa + consulta `completed` → declaração renderiza normalmente (regressão do comportamento atual)
- [ ] Gate check passa: `npx vitest run tests/pages/documentos-fail-closed.test.tsx`
- [ ] Test count: mínimo 4 (dados incompletos, status inválido, ambos ok, loading)

**Tests**: integration (RTL)
**Gate**: quick

**Commit**: `fix(documentos): bloqueia atestado sem responsável técnico ou com consulta não realizada (#62, #63)`

---

### T8: Relatório + Plano de Cuidados — bloqueio fail-closed [P]

**What**: Mesmo bloqueio de `isClinicInfoComplete` aplicado a `src/app/documentos/relatorio/[conditionId]/page.tsx` e `src/app/documentos/plano-cuidados/[carePlanId]/page.tsx`. Consentimento (`consentimento/[patientId]/page.tsx`) **não muda**.
**Where**: `src/app/documentos/relatorio/[conditionId]/page.tsx`, `src/app/documentos/plano-cuidados/[carePlanId]/page.tsx`
**Depends on**: T5, T6
**Reuses**: `ErrorAlert`, `isClinicInfoComplete`
**Requirement**: CLIN-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Ambas páginas bloqueiam quando dados incompletos
- [ ] Ambas renderizam normalmente quando completo
- [ ] Consentimento continua renderizando sem checagem (confirmado por teste — regressão negativa)
- [ ] Gate check passa: `npx vitest run tests/pages/documentos-fail-closed.test.tsx`
- [ ] Test count: mínimo 3 (relatório bloqueado/ok, plano de cuidados bloqueado/ok, consentimento sem bloqueio) — pode reaproveitar o mesmo arquivo de T7

**Tests**: integration (RTL)
**Gate**: quick

**Commit**: `fix(documentos): bloqueia relatório e plano de cuidados sem dados cadastrais da clínica (#62)`

---

### T9: `EvolutionsSection` — remove seletor de profissional [P]

**What**: Remove o `NativeSelect` de profissional e o estado `professionalId`; o POST deixa de enviar `professionalId` no corpo.
**Where**: `src/app/(staff)/pacientes/[id]/evolutions-section.tsx`
**Depends on**: T5, T6 (ordem de fase — sem dependência funcional real, mas mantido após a Fase 2 por planejamento de fase)
**Reuses**: Estrutura atual do componente (só remove um bloco)
**Requirement**: CLIN-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Formulário de nova evolução não exibe seletor de profissional
- [ ] POST não envia campo `professionalId` (ou envia sempre `null`/omitido)
- [ ] Listagem de evoluções continua mostrando o nome do profissional quando `note.professionalId` existe (comportamento de leitura preservado)
- [ ] Gate check passa: `npx vitest run tests/pages/staff-paciente-detail.test.tsx`
- [ ] Test count: suíte existente + ajuste dos casos que assumiam o seletor (nenhuma regressão de contagem líquida negativa)

**Tests**: integration (RTL)
**Gate**: quick

**Commit**: `fix(prontuario): remove seletor de profissional do formulário de evolução (#64)`

---

### T10: `resolveProfessionalId` — autoria sempre da sessão, para todo papel [P]

**What**: Remove o branch `if (bodyProfessionalId) return bodyProfessionalId;` de `resolveProfessionalId`; para todo papel (não só `profissional`), a autoria vem exclusivamente de `session.professionalId` (quando `profissional`) ou da conta vinculada via `session.subject` (demais papéis) — nunca do corpo da requisição.
**Where**: `src/app/api/patients/[id]/evolutions/route.ts`
**Depends on**: T5, T6 (fase)
**Reuses**: Fluxo de resolução por conta (`userAccounts.findByEmail`) já existente
**Requirement**: CLIN-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `bodyProfessionalId` forjado por `atendente`/`company_admin` é ignorado — autoria vem só da conta da sessão
- [ ] Papel `profissional` continua funcionando como hoje (autoria = `session.professionalId`, corpo divergente rejeitado com erro)
- [ ] Conta sem `professionalId` vinculado → evolução salva com autor `null` (comportamento preservado)
- [ ] Gate check passa: `npx vitest run tests/api/clinical-routes.test.ts`
- [ ] Test count: suíte existente + no mínimo 2 novos (discriminação: `professionalId` forjado por atendente é ignorado; por company_admin é ignorado)

**Tests**: integration
**Gate**: quick

**Commit**: `fix(evolucoes): trava autoria de evolução na sessão autenticada para todo papel (#64)`

---

### T11: `AnamnesisSection` + `PatientRecordPage` — erro distinto de "sem histórico" [P]

**What**: `PatientRecordPage` extrai `error`/`isLoading` da query de anamnese e repassa; `AnamnesisSection` ganha essas props e renderiza `ErrorAlert`/`LoadingIndicator` antes do formulário, no mesmo padrão de `ConditionsSection`.
**Where**: `src/app/(staff)/pacientes/[id]/page.tsx`, `src/app/(staff)/pacientes/[id]/anamnesis-section.tsx`
**Depends on**: T5, T6 (fase)
**Reuses**: Padrão de `ConditionsSection`/`EvolutionsSection` (`error`, `isLoading`, `ErrorAlert`, `LoadingIndicator`)
**Requirement**: CLIN-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Erro 5xx/rede na query de anamnese → `AnamnesisSection` mostra `ErrorAlert` com retry, não o formulário vazio
- [ ] Sucesso sem anamnese cadastrada → formulário vazio normal (regressão preservada)
- [ ] Loading → `LoadingIndicator`
- [ ] Gate check passa: `npx vitest run tests/pages/staff-paciente-detail.test.tsx`
- [ ] Test count: mínimo 2 novos (erro, loading) além dos existentes

**Tests**: integration (RTL)
**Gate**: quick

**Commit**: `fix(prontuario): distingue erro de carregamento de anamnese de "sem histórico" (#65)`

---

### T12: `conditions-section` — exibe `complicationCodes` na tabela de avaliações [P]

**What**: A célula "Complicações" da tabela de avaliações passa a incluir os labels de `a.complicationCodes` (via `COMPLICATION_OPTIONS`), além do texto livre já exibido.
**Where**: `src/app/(staff)/pacientes/[id]/conditions-section.tsx`
**Depends on**: T5, T6 (fase)
**Reuses**: `COMPLICATION_OPTIONS` (já existe no mesmo arquivo)
**Requirement**: CLIN-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Avaliação com `complicationCodes` preenchido mostra os labels em pt-BR na tabela
- [ ] Avaliação sem `complicationCodes` mostra "—" (preservado)
- [ ] Texto livre de `complications` continua visível junto (nenhuma perda de informação já exibida)
- [ ] Gate check passa: `npx vitest run tests/pages/staff-paciente-detail.test.tsx`
- [ ] Test count: mínimo 1 novo (roundtrip: registra com complicações marcadas, reabre e vê os labels)

**Tests**: integration (RTL)
**Gate**: quick

**Commit**: `fix(prontuario): exibe complicações de estomia registradas na leitura (#67)`

---

### T13: Guarda de troca de aba (dirty SOAP/anamnese)

**What**: `EvolutionsSection` e `AnamnesisSection` reportam estado "sujo" via `onDirtyChange(isDirty: boolean)`; `PatientRecordPage` guarda `isDirty` e intercepta `TabButton.onClick` — se sujo e o alvo é outra aba, abre um `AlertDialog` controlado ("Descartar alterações?"); confirmar troca e descarta, cancelar mantém.
**Where**: `src/app/(staff)/pacientes/[id]/page.tsx`, `src/app/(staff)/pacientes/[id]/evolutions-section.tsx`, `src/app/(staff)/pacientes/[id]/anamnesis-section.tsx`
**Depends on**: T9, T11
**Reuses**: `AlertDialog` do Still Void (mesma família de `ConfirmAction`, ver Tech Decisions do design)
**Requirement**: CLIN-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] SOAP com algum campo preenchido + clique em outra aba → diálogo de confirmação aparece
- [ ] Anamnese com valores diferentes do último salvo + clique em outra aba → mesmo diálogo
- [ ] Confirmar → troca de aba, formulário descartado (volta ao estado vazio/original)
- [ ] Cancelar → permanece na aba atual, formulário intacto
- [ ] Sem alterações → troca de aba direta, sem diálogo (regressão preservada)
- [ ] Gate check passa: `npx vitest run tests/pages/staff-paciente-detail.test.tsx`
- [ ] Test count: mínimo 4 novos (SOAP dirty+cancela, SOAP dirty+confirma, anamnese dirty+cancela, sem dirty)

**Tests**: integration (RTL)
**Gate**: quick

**Commit**: `feat(prontuario): confirma antes de descartar SOAP/anamnese não salvos ao trocar de aba (#66)`

---

### T14: `ClinicInfoSection` em Configurações

**What**: Nova seção em `src/app/(staff)/configuracoes/page.tsx`, espelhando `ScheduleSection` — formulário com razão social (`name`, somente leitura ou editável — mantém o `name` já existente), CNPJ, endereço, cidade, responsável técnico, registro profissional; salva via `PUT /api/settings/clinic-info`.
**Where**: `src/app/(staff)/configuracoes/page.tsx`
**Depends on**: T5
**Reuses**: `ScheduleSection` (estrutura idêntica: draft local + `useApiQuery` + `apiFetch` PUT + `useToast`)
**Requirement**: CLIN-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Seção "Dados da clínica" aparece em Configurações com os 5 campos + nome
- [ ] Salvar com sucesso mostra toast e reflete os valores persistidos após reload (via `useApiQuery`)
- [ ] Sem dados cadastrados ainda, campos aparecem vazios (não erro)
- [ ] Gate check passa: `npx vitest run tests/pages/staff-operations.test.tsx`
- [ ] Test count: mínimo 3 novos (render vazio, salvar com sucesso, erro de salvamento)

**Tests**: integration (RTL)
**Gate**: full (`npm run typecheck && npm run lint && npm run check:sv && npm run test:coverage`) — fecha a Fase 3, roda o gate completo antes de ir pra E2E

**Commit**: `feat(configuracoes): adiciona edição de dados cadastrais da clínica (#61)`

---

### T15: E2E — seed de dados da clínica + bloqueio de status no atestado

**What**: `e2e/global-setup.ts` passa a chamar `PUT /api/settings/clinic-info` com dados completos (CNPJ, responsável técnico, registro) logo após o login do admin, pro resto da suíte não quebrar com o novo fail-closed. `e2e/documentos.spec.ts`: o teste existente de atestado passa a marcar a consulta como `completed` (`completeAppointment`) antes de visitar a página; novo teste cobre atestado bloqueado para consulta cancelada.
**Where**: `e2e/global-setup.ts`, `e2e/documentos.spec.ts`
**Depends on**: T7, T14
**Reuses**: `completeAppointment`/`changeAppointmentStatus` (`e2e/support/api.ts`, já existem)
**Requirement**: CLIN-02, CLIN-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Suíte E2E completa passa com o seed de clínica no lugar (nenhuma regressão nos specs de documentos existentes)
- [ ] Novo teste: consulta cancelada → atestado mostra bloqueio, não a declaração
- [ ] Gate check passa: `npm run build && npm run test:e2e`

**Tests**: e2e
**Gate**: build/e2e

**Commit**: `test(e2e): seeda dados da clínica e cobre bloqueio de atestado por status (#62, #63)`

---

### T16: E2E — login dos 3 perfis sem copy exclusiva de equipe [P]

**What**: Novo teste em `e2e/auth.spec.ts` provisionando uma conta `patient` e uma `partner` (convite + set-password, mesmo fluxo de `consumeInvite` do `global-setup.ts`), logando via `/login` real (formulário, não cookie forjado) e confirmando: nenhuma copy de "restrito à equipe"/exclusivo de staff visível, redirecionamento pra `/portal`.
**Where**: `e2e/auth.spec.ts`
**Depends on**: T15 (fase — sem dependência funcional real, roda em paralelo)
**Reuses**: `consumeInvite`/fluxo de convite do `global-setup.ts`; conta de accounts (`POST /api/accounts`, já usado por `AccountsSection`)
**Requirement**: CLIN-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Paciente loga via `/login` (email+senha reais) e chega em `/portal`
- [ ] Parceiro loga via `/login` (email+senha reais) e chega em `/portal`
- [ ] Nenhuma das duas telas de login mostra texto que presuma acesso exclusivo de equipe
- [ ] Gate check passa: `npm run test:e2e`

**Tests**: e2e
**Gate**: build/e2e

**Commit**: `test(e2e): valida login dos 3 perfis sem copy exclusiva de equipe (#68)`

---

## Parallel Execution Map

```
Phase 1:
  T1 [P] ┐
         ├─→ T3 ──→ T4
  T2 [P] ┘

Phase 2:
  T4 complete, then:
    ├── T5
    └── T6

Phase 3 (após T5,T6):
    ├── T7
    ├── T8  [P]
    ├── T9  [P]
    ├── T10 [P]
    ├── T11 [P]
    ├── T12 [P]
    └── T14 (depende também de T5)
  T9, T11 complete, then:
    └── T13

Phase 4 (após T7,T13,T14):
    ├── T15
    └── T16 [P]
```

**Fases > 3** — oferta de sub-agente por fase será feita ao usuário antes de iniciar Execute, conforme a regra de delegação do skill.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Migration + schema | 2 arquivos, 1 conceito (colunas novas) | ✅ Granular |
| T2: Domínio `Clinic` | 1 arquivo, 1 conceito (campos + gate de completude) | ✅ Granular |
| T3: Repositório | 2 arquivos (interface + impl), 1 conceito (`update`) | ✅ Granular |
| T4: DTO | 2 arquivos, 1 conceito (mover + mapear) | ✅ Granular |
| T5: Rota nova | 1 arquivo | ✅ Granular |
| T6: Rota existente + remoção | 2 arquivos, 1 conceito (trocar fonte de dados) | ✅ Granular |
| T7: Atestado | 1 arquivo, 2 gates relacionados (mesmo documento) | ⚠️ OK — coeso, mesmo arquivo/página |
| T8: Relatório + Plano de Cuidados | 2 arquivos, 1 conceito idêntico repetido | ⚠️ OK — mesma mudança, 2 arquivos irmãos |
| T9: EvolutionsSection UI | 1 arquivo | ✅ Granular |
| T10: resolveProfessionalId | 1 arquivo | ✅ Granular |
| T11: Anamnese erro | 2 arquivos, 1 conceito (propagar error) | ✅ Granular |
| T12: Complicações na leitura | 1 arquivo | ✅ Granular |
| T13: Dirty guard | 3 arquivos, 1 conceito (confirmação de descarte) | ⚠️ OK — coeso, um único fluxo de interação |
| T14: ClinicInfoSection | 1 arquivo | ✅ Granular |
| T15: E2E documentos | 2 arquivos | ✅ Granular |
| T16: E2E login | 1 arquivo | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None | ✅ Match |
| T2 | None | None | ✅ Match |
| T3 | T1, T2 | T1, T2 → T3 | ✅ Match |
| T4 | T2 | T3 → T4 (T2 já convergiu em T3; T4 depende diretamente de T2, fluxo passa por T3 no diagrama de fase) | ✅ Match (T4 lido como pós-T3, que já inclui T2) |
| T5 | T3, T4 | T4 → T5 | ✅ Match |
| T6 | T3, T4 | T4 → T6 | ✅ Match |
| T7 | T5, T6 | T5,T6 → T7 | ✅ Match |
| T8 | T5, T6 | T5,T6 → T8 | ✅ Match |
| T9 | T5, T6 (fase) | T5,T6 → T9 | ✅ Match |
| T10 | T5, T6 (fase) | T5,T6 → T10 | ✅ Match |
| T11 | T5, T6 (fase) | T5,T6 → T11 | ✅ Match |
| T12 | T5, T6 (fase) | T5,T6 → T12 | ✅ Match |
| T13 | T9, T11 | T9,T11 → T13 | ✅ Match |
| T14 | T5 | T5,T6 → T14 | ✅ Match |
| T15 | T7, T14 | T7,T14 → T15 | ✅ Match |
| T16 | T15 (fase) | T15 ─[P]─ T16 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Migration/schema | none | none | ✅ OK |
| T2 | Domain | unit | unit | ✅ OK |
| T3 | Repository | integration | integration | ✅ OK |
| T4 | DTO (mapeamento trivial) | none (não é layer com requirement próprio; consumido por T5-T8 que têm teste) | none | ✅ OK |
| T5 | Rota API | integration | integration | ✅ OK |
| T6 | Rota API | integration | integration | ✅ OK |
| T7 | Página/documento | integration (RTL) | integration | ✅ OK |
| T8 | Página/documento | integration (RTL) | integration | ✅ OK |
| T9 | Componente staff | integration (RTL) | integration | ✅ OK |
| T10 | Rota API | integration | integration | ✅ OK |
| T11 | Componente staff | integration (RTL) | integration | ✅ OK |
| T12 | Componente staff | integration (RTL) | integration | ✅ OK |
| T13 | Componente staff | integration (RTL) | integration | ✅ OK |
| T14 | Componente staff | integration (RTL) | integration | ✅ OK |
| T15 | E2E | e2e | e2e | ✅ OK |
| T16 | E2E | e2e | e2e | ✅ OK |

Nenhuma violação — nenhuma task com `Tests: none` fora da camada de migration/schema/DTO-trivial.
