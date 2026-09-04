---
based on: spec.md
---

# Design

## Componentes

1. **`vitest.config.mts` → `test.projects`**
   - `unit`: tudo que não é `tests/api/**` nem `tests/infrastructure/**`. `isolate` default (true) — sem mudança de comportamento.
   - `db`: `tests/api/**` + `tests/infrastructure/**`. `isolate: false` (permite reuso de módulo/globalThis entre arquivos do mesmo worker — pré-requisito pra R1) + `env: { VITTA_DB_DRIVER: 'pglite' }` (já setado por arquivo hoje; sobe pro projeto, elimina duplicação).
   - `coverage` continua no nível raiz (agrega os 2 projetos).
   - Projeto `db` herda `plugins`/`resolve.alias`/`setupFiles` da raiz por padrão (Vitest 4: `extends` default `true` em projetos inline).

2. **`tests/support/pglite-file-tx.ts`** (novo)
   - `beginFileTransaction(db: AppDb)`: `db.execute(sql.raw('BEGIN'))`.
   - `rollbackFileTransaction(db: AppDb)`: `db.execute(sql.raw('ROLLBACK'))`.

3. **`tests/setup.ts`** (existente, `setupFiles` já carregado por todo arquivo)
   - Quando `VITTA_DB_DRIVER === 'pglite'`: registra `beforeAll`/`afterAll` de topo (fora de qualquer `describe`) que pega `getDb()` (singleton real de `src/infrastructure/persistence/drizzle/db.ts`, cacheado em `globalThis` — sobrevive entre arquivos do worker graças a `isolate:false`), dá `BEGIN` antes de qualquer teste do arquivo, `ROLLBACK` depois do último.
   - Hooks de topo do `setupFiles` rodam *antes* de qualquer hook declarado dentro do arquivo de teste (mais externo) — logo o `BEGIN` acontece antes dos `beforeAll` de cada describe, e o `ROLLBACK` depois dos `afterAll` deles.
   - Efeito: cada arquivo enxerga o banco como se tivesse acabado de ser migrado (mesma garantia de hoje), mas sem re-rodar `migrate()`.

4. **8 arquivos `tests/infrastructure/*.test.ts` que hoje constroem PGlite localmente** (`drizzle-repositories.test.ts`, `drizzle-repositories-extra.test.ts`, `drizzle-clinic-repository.test.ts`, `drizzle-clinical-inventory.test.ts`, `drizzle-taxonomy-care-plan.test.ts`, `drizzle-auth-token-repository.test.ts`, `professional-patient-link-repository.test.ts`, `consent-record-tenant-isolation.test.ts`)
   - Trocar `new PGlite() + drizzle() + migrate()` local por `appDb = await getDb()` (mesmo singleton dos testes de API).
   - `db.delete(schema.x)` em `beforeEach` continua igual — já é isolamento correto *dentro* do arquivo, não é o alvo de R2.
   - Precisa `process.env.VITTA_DB_DRIVER = 'pglite'` continuar setado (herdado do `env` do projeto `db` — remover a linha manual duplicada onde existir, ou deixar, é idempotente).

5. **Excluídos do reuso (R4)**: `clinic-migration-backfill.test.ts`, `role-migration-backfill.test.ts` — migram uma pasta de migrations *antiga* (`priorMigrationsDir`), testam o próprio processo de backfill. Continuam construindo PGlite local, intocados. Ficam no projeto `db` (isolate:false não afeta quem não usa o singleton), mas nunca chamam `getDb()`.

6. **48 arquivos `tests/api/*.test.ts`**: zero edição de código — já usam `getDb()` via as rotas reais. Ganham o reuso e o wrap de transação automaticamente pelo `setup.ts`.

## Risco avaliado e descartado

- **Vazamento de mock entre arquivos com `isolate:false`**: só 2 arquivos em `tests/api`/`tests/infrastructure` usam `vi.mock` (`calendar-integration-routes.test.ts`, `auth-portal-gaps.test.ts`) — checar após migração que `vi.mock`/`vi.doMock` desses 2 não vaza pros vizinhos (module registry compartilhado no worker). Se vazar, mitigar com `vi.resetModules()` num `afterEach` global do projeto `db` nesses 2 arquivos especificamente, ou `vi.mock` com `{ spy: true }`/restaurar explícito.
- **`legacy-clinic` seed** (`drizzle/0019_clinic-foundation.sql`, `INSERT INTO clinics ...`): roda dentro do `migrate()` do primeiro `getDb()` do worker, **fora** de qualquer transação de arquivo — persiste em todos os arquivos subsequentes do worker, igual hoje (cada arquivo recriava sua própria seed via migração completa).
