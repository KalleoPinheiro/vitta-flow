# Fase 1 — Hardening de Segurança — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: activate it by name and follow its
Execute flow and Critical Rules.

**Design**: `.specs/features/fase-1-hardening-seguranca/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Guidelines found: `vitest.config.ts` (coverage v8, include src/**, threshold do projeto 80%+),
> regras globais do usuário (TDD, 80%+, AAA), testes BDD pt-br existentes em `tests/**`
> (`Feature/Cenário/Dado-Quando-Então`), `AGENTS.md` (ler docs do Next em node_modules quando tocar APIs Next).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|------------|--------------------|----------------------|------------------|-------------|
| Domain (image-sanitizer) | unit | Todos os branches; 1:1 com ACs SEC1-05..09 + edge cases listados | `tests/application/*.test.ts` ou `tests/lib/*.test.ts` | `npx vitest run <file>` |
| Lib auth (client-ip, guard, staff-revocation) | unit | 1:1 com ACs; cache TTL, fail-open, deny-list | `tests/lib/*.test.ts` | `npx vitest run tests/lib` |
| Application (AddConditionPhoto com strip) | unit | AC de wiring (SEC1-08) com storage in-memory | `tests/application/condition-photos.test.ts` | `npx vitest run <file>` |
| Rotas (export, delete foto, cron, login) | integration (PGlite via suíte existente) | Contrato HTTP preservado; write-ahead falha → 500 | `tests/**` existentes | `npm test` |
| proxy.ts wiring | unit (função `proxy` importável) | revogação 401/redirect; fail-open | `tests/lib/*.test.ts` | `npx vitest run tests/lib` |

## Parallelism Assessment

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
|-----------|----------------|-----------------|----------|
| unit (lib/domain) | Yes | sem estado compartilhado; in-memory por teste | `tests/lib/auth.test.ts` |
| integration (PGlite) | Yes (vitest workers) | PGlite por worker, migrado no beforeAll | `vitest.config.ts` hookTimeout comment |

## Gate Check Commands

| Gate Level | When to Use | Command |
|------------|-------------|---------|
| Quick | task com unit tests | `npx vitest run <arquivos do task>` |
| Full | task tocando rotas/repos | `npm test` |
| Build | último task da fase | `npm test && npm run lint && npm run build` |

---

## Execution Plan

### Phase A (Sequential): fundações de lib
T1 → T2

### Phase B (order-free após T1): endurecimentos pontuais
T3 [P], T4 [P], T5 [P]

### Phase C (Sequential): sanitizer (maior peça)
T6

## Task Breakdown

### T1: Extrair `clientIpFromHeader` + adotar em proxy e login
**What**: função única de derivação de IP com `TRUSTED_PROXY_HOPS` (default 1).
**Where**: `src/lib/auth/client-ip.ts` (novo), `src/proxy.ts`, `src/app/api/auth/login/route.ts`, `tests/lib/client-ip.test.ts`
**Depends on**: None | **Requirement**: SEC1-10..13
**Done when**: ACs 10–13 com teste unitário cada; proxy e login importam a função; quick gate passa.
**Tests**: unit | **Gate**: quick
**Commit**: `fix(auth): derivar ip do cliente por cadeia de proxy confiável`

### T2: Guard `requireRole` + adoção nas 6 rotas do portal
**What**: guard único `{ session } | { error }`; refatorar rotas que repetem o padrão inline.
**Where**: `src/lib/auth/guard.ts` (novo), `src/app/api/portal/**/route.ts` (6 arquivos), `tests/lib/guard.test.ts`
**Depends on**: None | **Requirement**: SEC1-14..17
**Done when**: ACs 14–16 com unit; rotas usam o guard; suíte completa passa (contrato preservado).
**Tests**: unit + full | **Gate**: full
**Commit**: `refactor(auth): unificar guard de papel das rotas do portal`

### T3: Revogação de sessão staff no proxy [P]
**What**: `staff-revocation.ts` (deny-list, cache 60s, fail-open) + proxy async chamando a checagem.
**Where**: `src/lib/auth/staff-revocation.ts` (novo), `src/proxy.ts`, `tests/lib/staff-revocation.test.ts`
**Depends on**: T1 (proxy já tocado) | **Requirement**: SEC1-01..04
**Done when**: ACs 01–04 com unit (lookup injetado); proxy chama com lookup default; full gate passa.
**Tests**: unit + full | **Gate**: full
**Commit**: `feat(auth): revogar sessão de conta staff desativada`

### T4: Cron secret timing-safe + aviso de senha master [P]
**What**: `passwordMatches` no header do cron; `console.warn` no login master bem-sucedido.
**Where**: `src/app/api/reminders/run/route.ts`, `src/app/api/auth/login/route.ts`, testes existentes de login/reminders
**Depends on**: T1 | **Requirement**: SEC1-18..19
**Done when**: comparação via `passwordMatches`; warn coberto por teste (spy); quick gate passa.
**Tests**: unit | **Gate**: quick
**Commit**: `fix(auth): comparação em tempo constante no cron e aviso de senha master`

### T5: `recordAuditNow` write-ahead em export e delete de foto [P]
**What**: variante awaited de auditoria; adotar nas duas rotas críticas.
**Where**: `src/lib/audit.ts`, `src/app/api/patients/[id]/export/route.ts`, `src/app/api/photos/[id]/route.ts`, `tests/lib/audit.test.ts`
**Depends on**: None | **Requirement**: SEC1-20..22
**Done when**: ACs 20–21 testados (falha de auditoria → erro); demais rotas intactas (SEC1-22); full gate passa.
**Tests**: unit + full | **Gate**: full
**Commit**: `feat(audit): auditoria write-ahead na exportação lgpd e exclusão de foto`

### T6: Sanitizer de metadados de imagem + wiring no AddConditionPhoto
**What**: `stripImageMetadata` (JPEG/PNG/WebP, fail-safe) + aplicação no use case.
**Where**: `src/domain/clinical/image-sanitizer.ts` (novo), `src/application/clinical/add-condition-photo.ts`, `tests/domain/image-sanitizer.test.ts` (novo), `tests/application/condition-photos.test.ts`
**Depends on**: None (último por ser a maior peça) | **Requirement**: SEC1-05..09 + edge cases
**Done when**: ACs 05–09 e 3 edge cases com teste; use case grava bytes limpos; build gate passa.
**Tests**: unit | **Gate**: build (último da fase)
**Commit**: `feat(clinical): remover metadados exif/xmp de fotos no ingest`

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram | Status |
|------|-------------------|---------|--------|
| T1 | None | início Phase A | ✅ |
| T2 | None | Phase A após T1 (mesma lib, sequencial por convenção) | ✅ |
| T3 | T1 | Phase B após A | ✅ |
| T4 | T1 | Phase B após A | ✅ |
| T5 | None | Phase B (order-free) | ✅ |
| T6 | None | Phase C (isolado) | ✅ |

## Test Co-location Validation

| Task | Layer | Matrix Requires | Task Says | Status |
|------|-------|-----------------|-----------|--------|
| T1 | lib auth | unit | unit | ✅ |
| T2 | lib auth + rotas | unit+full | unit+full | ✅ |
| T3 | lib auth + proxy | unit+full | unit+full | ✅ |
| T4 | rotas | unit | unit | ✅ |
| T5 | lib + rotas | unit+full | unit+full | ✅ |
| T6 | domain + application | unit | unit | ✅ |

**Tools por task**: nenhum MCP externo necessário; skill ativa: `tlc-spec-driven`. Docs do Next
16 em `node_modules/next/dist/docs/` quando tocar proxy/rotas (AGENTS.md).
