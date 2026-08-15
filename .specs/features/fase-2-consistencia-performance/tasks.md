# Fase 2 — Consistência Transacional e Performance — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill (Execute flow + Critical Rules).

**Design**: `.specs/features/fase-2-consistencia-performance/design.md`
**Status**: In Progress

## Test Coverage Matrix

> Guidelines: mesmas da fase 1 (`vitest.config.ts`, BDD pt-br, 80%+; matrix da fase 1 reaproveitada).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|------------|--------------------|----------------------|------------------|-------------|
| Ports/impls (TransactionManager, adjustStock, findByIds) | unit + integration (PGlite p/ drizzle) | 1:1 com ACs; rollback real testado | `tests/application`, `tests/infrastructure` | `node_modules/.bin/vitest run <file>` |
| Use case (RegisterStockMovement) | unit | ACs 05–07 + NotFound preservado | `tests/application` | idem |
| Rotas (triagem, reports, PATCH complete) | integration (PGlite) | payload preservado; cache hit/miss; rollback | `tests/api` | `npm test` |

## Parallelism Assessment

igual à fase 1 (unit: sim; PGlite por worker: sim).

## Gate Check Commands

| Gate Level | Command |
|------------|---------|
| Quick | `node_modules/.bin/vitest run <arquivos>` |
| Full | `npm test` |
| Build | `npm test && npm run lint && npm run build` |

## Execution Plan

### Phase A (Sequential): atômicos independentes
T1 → T2

### Phase B (Sequential): estoque atômico
T3

### Phase C (Sequential): unidade de trabalho
T4 → T5

## Task Breakdown

### T1: `findByIds` no repositório de condições + rota de triagem em lote
**Where**: `src/domain/clinical/clinical-repositories.ts`, drizzle/in-memory clinical repos, `src/app/api/photos/triage/route.ts`, testes de repos + rota
**Requirement**: CONS2-09..10 | **Tests**: unit+integration | **Gate**: full
**Commit**: `perf(clinical): buscar condições da fila de triagem em lote`

### T2: Cache de relatório para meses encerrados
**Where**: `src/app/api/reports/route.ts`, teste da rota (spy no use case ou contagem)
**Requirement**: CONS2-11..13 | **Tests**: integration | **Gate**: full
**Commit**: `perf(reports): cachear relatório de meses encerrados`

### T3: `adjustStock` condicional + RegisterStockMovement atômico
**Where**: `src/domain/inventory/inventory-repositories.ts`, drizzle/in-memory inventory repos, `src/application/inventory/register-stock-movement.ts`, testes
**Requirement**: CONS2-05..08 | **Tests**: unit+integration | **Gate**: full
**Commit**: `fix(inventory): decremento de estoque condicional no banco`

### T4: Porta TransactionManager + impls + container
**Where**: `src/application/ports/transaction-manager.ts` (novo), `src/infrastructure/persistence/drizzle/` (impl + fábrica de repos), in-memory impl, `src/infrastructure/container.ts`, testes
**Requirement**: CONS2-03 | **Tests**: unit+integration | **Gate**: full
**Commit**: `feat(infra): porta de transação com repositórios transacionais`

### T5: Conclusão de consulta dentro da transação
**Where**: `src/app/api/appointments/[id]/route.ts`, teste de rollback (PGlite, fatura falhando)
**Requirement**: CONS2-01..02, CONS2-04 | **Tests**: integration | **Gate**: build (último)
**Commit**: `feat(appointments): conclusão de consulta transacional`

## Cross-checks

| Task | Depends On | Diagram | Status | Layer | Matrix | Task Tests | Status |
|------|-----------|---------|--------|-------|--------|-----------|--------|
| T1 | None | A | ✅ | repo+rota | unit+integration | unit+integration | ✅ |
| T2 | None | A (após T1) | ✅ | rota | integration | integration | ✅ |
| T3 | None | B | ✅ | repo+use case | unit+integration | unit+integration | ✅ |
| T4 | None | C | ✅ | port+infra | unit+integration | unit+integration | ✅ |
| T5 | T4 | C após T4 | ✅ | rota | integration | integration | ✅ |
