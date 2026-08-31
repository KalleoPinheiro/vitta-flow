# Fundação de Multi-Tenancy Design

**Spec**: `.specs/features/fundacao-multi-tenancy/spec.md`
**Status**: Approved (arquitetura já decidida por [ADR-001](../../../docs/adr/001-multi-tenancy.md) — este documento a opera­cionaliza, não reexplora alternativas)

---

## Architecture Overview

Um único claim (`clinicId`) atravessa toda a pilha: sessão assinada → guarda de rota → container de dependências → repositório → query. `clinicId: null` é o marcador de acesso de sistema (ver spec, Assumptions) e propaga como "sem filtro" até o repositório.

```mermaid
graph TD
    A[Cookie assinado] -->|verifySessionToken| B[Session clinicId: string | null]
    B --> C[requireStaffSession / requirePortalSession]
    C -->|clinicId| D[Route Handler]
    D -->|getRepositories tenant| E[Container]
    E -->|new Drizzle*Repository db, clinicId| F[Repositórios]
    F -->|withTenant clinicId, condition| G[(Postgres)]
    D -.clinicId nulo.-> H[AuditEventRepository.record accessedClinicId]
```

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| `getRepositories()` | `src/infrastructure/container.ts:205` | Ganha parâmetro `tenant: TenantContext`; repassa `clinicId` para cada `new Drizzle*Repository(db, clinicId)`. |
| `getDb()` (pool singleton) | `src/infrastructure/persistence/drizzle/db.ts:68-74` | Não muda — conexão continua global; filtro é só na camada de repositório (convenção já registrada na ADR-001). |
| `Session` type + `createSessionToken`/`verifySessionToken` | `src/lib/auth/session.ts:25-92` | Ganham campo `clinicId: string \| null` no payload assinado. |
| `requireStaffSession`/`requirePortalSession` | `src/lib/auth/require-session.ts:62-104` | Passam a expor `session.clinicId` para o route handler chamar. |
| `AuditEvent` aggregate + `DrizzleAuditEventRepository` | `src/domain/audit/audit-event.ts`, `schema.ts:348-365` | Ganham campo `clinicId` (a empresa a que o evento pertence, ou a empresa acessada em acesso cross-empresa). |
| `LocalPhotoStorage` | `src/infrastructure/storage/local-photo-storage.ts:16,23` | Caminho ganha segmento `clinicId` antes de `condition-photos/<id>`; `ID_PATTERN` de proteção contra path traversal já existente cobre o novo segmento também. |
| Padrão de rota (`requireStaffSession` → `handleRequest` → `getRepositories()` → use-case → DTO) | ~45 arquivos em `src/app/api/**` | Mesmo esqueleto; só o argumento de `getRepositories()` muda, mecanicamente, em cada arquivo. |
| Teste PGlite + migração automática | `tests/infrastructure/drizzle-repositories.test.ts:1-93`, `db.ts:14-24` | Toda suíte já roda a migração nova automaticamente — nenhum teste existente precisa mudar de infraestrutura, só de fixtures (agora com 2 clínicas). |
| `tests/support/session.ts:17-29` | `sessionToken`/`cookieHeaderFor`/`adminCookieHeader` | Ganham parâmetro `clinicId` opcional para assinar sessões de clínicas diferentes nos testes de isolamento. |

### Integration Points

| System | Integration Method |
| --- | --- |
| Drizzle schema (`schema.ts`) | Nova tabela `clinics` + coluna `clinicId` (FK) em todas as tabelas listadas no spec MT-02; índices únicos compostos substituindo os globais. |
| Migração (`./drizzle`, `drizzle-kit`) | Migração única (M1) com transação: adicionar coluna nullable → inserir clínica legada → backfill → `SET NOT NULL` → FKs/índices únicos compostos. Segue o padrão de `0012_foundation.sql` (blocos `CREATE`/`ALTER` com `--> statement-breakpoint`), mas com SQL manual para o backfill (drizzle-kit sozinho não gera `INSERT`/`UPDATE` de dados). |
| `proxy.ts` (edge) | Não decodifica claims de negócio hoje (por recon); segue apenas validando a assinatura/expiração — nenhuma mudança esperada, mas revisitar em Design se ele também precisar ler `clinicId` para alguma decisão de borda (a confirmar durante a implementação da M2; se não precisar, task correspondente é descartada sem alterar o design). |

---

## Components

### `clinics` (schema + repositório)

- **Purpose**: Entidade Clinic real — id, nome, criação.
- **Location**: `src/infrastructure/persistence/drizzle/schema.ts` (tabela nova), `src/infrastructure/persistence/drizzle/drizzle-clinic-repository.ts` (novo), interface de domínio em `src/domain/clinic/` (novo, seguindo o padrão de pasta por domínio já usado por `src/domain/audit/`).
- **Interfaces**:
  - `create(input: { name: string; createdBy: string }): Promise<Clinic>`
  - `findById(id: string): Promise<Clinic | null>`
- **Dependencies**: `AppDb`.
- **Reuses**: mesmo padrão `constructor(private readonly db: AppDb)` de todos os outros repositórios.

### `TenantScope` helper

- **Purpose**: Único ponto que decide "filtra por `clinic_id`" vs. "não filtra" (papel de sistema) — evita repetir `and(eq(...), eq(...))` em ~15 repositórios e dá ao sensor de discriminação do Verifier um ponto único para mutar.
- **Location**: `src/infrastructure/persistence/drizzle/tenant-scope.ts` (novo).
- **Interfaces**:
  - `withTenant<T extends { clinicId: PgColumn }>(table: T, clinicId: string | null, extra?: SQL): SQL` — retorna `extra` sozinho quando `clinicId` é `null` (acesso de sistema), ou `and(eq(table.clinicId, clinicId), extra)` quando não é.
- **Dependencies**: Drizzle `and`/`eq`.
- **Reuses**: nenhum equivalente existe hoje — é a peça nova central desta entrega.

### Container (`getRepositories`)

- **Purpose**: Monta repositórios já escopados pela empresa da requisição atual.
- **Location**: `src/infrastructure/container.ts:205` (assinatura muda, corpo interno reusa a mesma fiação).
- **Interfaces**:
  - `getRepositories(tenant: TenantContext): Promise<Services>` onde `TenantContext = { clinicId: string | null }`.
- **Dependencies**: `getDb()`, todo `Drizzle*Repository`.
- **Reuses**: a própria função já existente — muda assinatura e repassa `tenant.clinicId` para cada `new Drizzle*Repository(db, tenant.clinicId)`.

### Sessão (`Session`, `createSessionToken`, `verifySessionToken`, `requireStaffSession`, `requirePortalSession`)

- **Purpose**: Sessão assinada carrega e expõe `clinicId`.
- **Location**: `src/lib/auth/session.ts:25-92`, `src/lib/auth/require-session.ts:62-104`.
- **Interfaces**: `Session = { expiresAtMs, subject, role, clinicId: string | null }`; guardas retornam esse shape.
- **Dependencies**: `AUTH_SECRET`.
- **Reuses**: mecanismo HMAC + base64url JSON já existente — só o payload cresce um campo.

### `AuditEvent` + `DrizzleAuditEventRepository`

- **Purpose**: Todo evento de auditoria carrega a empresa a que pertence; acesso cross-empresa do papel de sistema carrega a empresa acessada no mesmo campo.
- **Location**: `src/domain/audit/audit-event.ts`, `schema.ts:348-365`.
- **Interfaces**: `AuditEvent` ganha `clinicId: string` (não opcional — todo evento pertence a alguma empresa, mesmo os de acesso cross-empresa, que carregam a empresa acessada).
- **Dependencies**: nenhuma nova.
- **Reuses**: mecanismo de auditoria já existente (issue #19 pede explicitamente reaproveitar, não criar um novo).

### `LocalPhotoStorage`

- **Purpose**: Namespace de foto de condição por empresa.
- **Location**: `src/infrastructure/storage/local-photo-storage.ts:16,23`.
- **Interfaces**: caminho passa de `<UPLOADS_DIR>/condition-photos/<id>` para `<UPLOADS_DIR>/<clinicId>/condition-photos/<id>`.
- **Dependencies**: `ID_PATTERN` (reusado, agora validando também o segmento `clinicId`, que tem o mesmo formato de id que os demais).
- **Reuses**: sanitização EXIF (AD-002) e proteção contra path traversal já existentes, intocadas.

### Rotas HTTP (~45 arquivos)

- **Purpose**: Cada rota passa a chamar `getRepositories({ clinicId: session.clinicId })` em vez de `getRepositories()`.
- **Location**: `src/app/api/**/route.ts` (uma milestone por grupo de entidades — M3: agenda/procedimento/horário; M4: prontuário; M5: estoque; M6: contas/conformidade/cobrança).
- **Interfaces**: nenhuma nova — mesmo esqueleto (`requireStaffSession` → `handleRequest` → `getRepositories` → use-case → DTO), só o argumento muda.
- **Dependencies**: `requireStaffSession`/`requirePortalSession` retornando `clinicId`.
- **Reuses**: 100% do esqueleto de rota existente.

---

## Data Models

### `clinics`

```typescript
interface Clinic {
  id: string // uuid
  name: string
  createdAt: Date
  createdBy: string // subject da sessão que criou (Super Admin, ou "migration" para a legada)
}
```

**Relationships**: referenciada por `clinicId` em toda tabela listada no spec (MT-02).

### `Session` (alteração)

```typescript
interface Session {
  expiresAtMs: number
  subject: string
  role: UserRole // inalterado nesta entrega: "admin" | "partner" | "patient"
  clinicId: string | null // null = acesso de sistema (ver spec, Assumptions)
}
```

### `AuditEvent` (alteração)

```typescript
interface AuditEvent {
  // campos existentes inalterados: actorRole, actorId, action, resourceType, resourceId, patientId?, detail?, occurredAt
  clinicId: string // empresa a que o evento pertence, ou empresa acessada em acesso cross-empresa — sempre concreto, nunca null
}
```

**Relationships**: `clinicId` sempre aponta para uma `clinics.id` real. **Correção pós-tentativa da Batch A, revisada**: o único ponto de construção de `AuditEvent` é `src/lib/audit.ts` — `recordAudit`/`recordAuditNow` já recebem `session: Session | null` em todos os ~21 call sites hoje (confirmado lendo o arquivo). Isso permite resolver `clinicId` sem tocar nenhum dos 21 call sites: `AuditInput` ganha um campo `clinicId?: string | null` **opcional**, e `persistAuditEvent` resolve `input.clinicId ?? session?.clinicId ?? LEGACY_CLINIC_ID` internamente.
- Ação normal dentro da própria empresa: `session.clinicId` já é a empresa certa — nenhum call site precisa passar nada nesse campo.
- Acesso cross-empresa do papel de sistema (`session.clinicId === null`): o único call site que precisa disso (a rota de Paciente na T7, e replicações pontuais se M3–M6 vierem a expor outro caminho de acesso do papel de sistema) passa explicitamente `clinicId: <empresa do recurso acessado>` em `AuditInput`.
- Sem sessão nenhuma (modo aberto de dev, ator "anonymous"): cai no fallback `LEGACY_CLINIC_ID` — seguro porque modo aberto só existe em dev, e neste momento da entrega só existe a clínica legada mesmo (não há rota de criação de clínica, ver Out of Scope do spec).

`LEGACY_CLINIC_ID` é uma constante exportada (novo componente, ver abaixo), não uma consulta ao banco — evita I/O extra em todo evento de auditoria e não é "estado global por clínica" no sentido que a ADR-001 proíbe (é um identificador fixo, não uma configuração de negócio ou cache por tenant).

Isso torna a T23 muito mais leve do que a versão anterior deste documento previa: não é mais "editar 21 call sites", é "confirmar que nenhum caminho de acesso cross-empresa além do da Patient precisa do override explícito, e testar o fallback".

### `LEGACY_CLINIC_ID` (constante)

- **Purpose**: identificador fixo e conhecido da clínica legada criada pelo backfill da M1, reusado pela migração (T3), pelo fallback de auditoria (T7) e por qualquer outro ponto que precise de um `clinic_id` default antes de existir uma segunda clínica real.
- **Location**: `src/domain/clinic/clinic.ts` (exportado ao lado do tipo `Clinic`).
- **Interfaces**: `export const LEGACY_CLINIC_ID = "legacy-clinic"` (valor literal fixo, não gerado por `newId()` — precisa ser o mesmo valor no código-fonte e na migração SQL).
- **Dependencies**: nenhuma.
- **Reuses**: nenhum equivalente hoje.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Sessão de empresa A acessa recurso por id de empresa B | Repositório filtra por `clinic_id`, query não encontra linha | Rota responde 404 (não distingue "não existe" de "existe em outra empresa" — spec MT-11) |
| Migração falha no meio | Toda a migração roda em uma única transação | Nenhuma linha fica parcialmente migrada; migração inteira reverte (spec, Edge Cases) |
| Login Google com e-mail ambíguo entre clínicas | Repositório de contas faz lookup cross-tenant por e-mail; se >1 resultado, rota responde 409 e loga o conflito | Usuário vê erro de login em vez de acessar a conta errada (spec MT-26) |
| Sessão chega a uma rota sem `clinicId` e sem ser papel de sistema (estado inconsistente) | Guarda de rota rejeita antes do container ser montado | 401/403 em vez de vazar dado sem filtro (spec, Edge Cases) |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| --- | --- | --- | --- |
| Adicionar coluna `NOT NULL` a ~25 tabelas com dados existentes exige sequenciamento correto (nullable → backfill → `SET NOT NULL` → FK/unique) numa única transação | Migração nova em `./drizzle` | Migração mal sequenciada quebra em produção ou deixa linha órfã | Migração escrita como SQL manual (não só `drizzle-kit generate` automático), testada contra fixtures de todas as tabelas via PGlite antes do primeiro commit da M1 |
| `google_accounts` (PK=email) perde a garantia de unicidade global de `user_accounts.email` | `schema.ts:139` | Login Google pode resolver para a conta errada se duas clínicas tiverem o mesmo e-mail | 409 fail-closed quando o lookup encontra mais de uma conta (spec MT-26); risco só se materializa quando existir rota de criação de clínica, hoje fora de escopo |
| ~45 arquivos de rota recebem a mesma edição mecânica (M3–M6) | `src/app/api/**/route.ts` | Uma rota esquecida vaza dado entre empresas | Tasks enumera todo arquivo tocado por milestone; sensor de discriminação do Verifier injeta "filtro esquecido" e confirma que os testes de isolamento matam a mutação |
| Nenhum teste hoje usa 2 clínicas na mesma fixture | `tests/infrastructure/*.test.ts`, `tests/api/*.test.ts` | Testes de isolamento poderiam duplicar setup de fixture 6 vezes | Um helper único de fixture (`tests/support/clinics.ts`, novo) cria as 2 clínicas de teste e é reusado por M2–M6 |
| `proxy.ts` (edge) não foi lido em profundidade pelo recon | `src/proxy.ts` | Pode precisar decodificar `clinicId` para alguma decisão de borda que hoje não existe | Verificado no início da implementação da M2, antes de qualquer commit — se não precisar, nenhuma mudança lá; documentado aqui para não ser esquecido |

---

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Onde adicionar `audit_events.clinic_id` | Na migração da M1 (não na M6, como o texto literal das issues sugeriria) | Evita alterar a mesma tabela duas vezes — a M2 já precisa do campo para o teste de auditoria cross-empresa; a M6 só passa a preenchê-lo em todo evento, não a criá-lo. Refletido no spec (MT-02). |
| Como aplicar o filtro de tenant nos repositórios | Helper centralizado `withTenant()` (novo), não `and(eq(...))` repetido em cada método | Um único ponto de mutação para o sensor de discriminação testar por repositório, reduz risco de um método esquecer o filtro |
| Assinatura do container | `getRepositories(tenant: { clinicId: string \| null })`, não parâmetro opcional posicional | Torna "acesso cross-empresa" um shape explícito e fácil de grepar, em vez de um `undefined` implícito |
| `schedule_settings` | Mantém a coluna `id` existente; adiciona `clinic_id UNIQUE NOT NULL`; repositório passa a buscar por `clinic_id` em vez do literal `id="default"` | Menor risco de migração que trocar a chave primária da tabela; nenhuma rota de criação de clínica nesta entrega, então uma única linha (a legada) é suficiente por ora |
| Composição `TenantContext` como `{ clinicId: string \| null }` em vez de união discriminada (`{ kind: "clinic", clinicId } \| { kind: "system" }`) | Shape simples escolhido | `clinicId: null` já é suficiente e sem ambiguidade como marcador — uma união discriminada adicionaria uma camada de tradução sem ganho, já que a Assumption do spec fixou `role: "admin"` + `clinicId: null` como o único caminho de acesso de sistema nesta entrega |

> Decisão de convenção que vale para features futuras (`withTenant()` como padrão único de filtro de tenant) será registrada como `AD-017` em `.specs/STATE.md` ao final do Design.

---

## Milestone → Requirement Map

(Confirma que a decomposição em 6 milestones do GitHub bate 1:1 com o spec — usado para nomear as fases da Tasks phase.)

| Milestone | Issue | Requisitos |
| --- | --- | --- |
| M1 | #22 | MT-01 a MT-06 |
| M2 | #23 | MT-07 a MT-13 |
| M3 | #24 | MT-14 a MT-18 |
| M4 | #25 | MT-19 a MT-22 |
| M5 | #26 | MT-23 |
| M6 | #27 | MT-24 a MT-29 |
