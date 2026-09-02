# Fase A — Padrões Estruturais Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/fase-a-padroes-estruturais/design.md`
**Status**: In Progress — Phase 1 done (T1-T5, commits ed31d8f, a912f98, 821d2a7, e174ecd; T2 sem commit — ErrorAlert já único). Desvio documentado: T3/T4 estenderam escopo a `pacientes/[id]/page.tsx` (propagar isLoading/error do pai). Phase 2 done (T6-T17, commits 8d1e762..8bd4ae6). Desvio documentado em T17: o e2e revelou que envolver as tabelas em `overflow-x-auto` não bastava para AC4 da história P1 — `SidebarProvider` (@still-void/ui) já embrulha os filhos num `.sv-app-shell` flex, e o `<div className="flex min-h-screen">` do próprio shell (`staff-layout-client.tsx`) herdava `min-width: auto` como item flex único dessa linha, crescendo para caber o `<main>` e empurrando a página inteira além do viewport mobile. Fix (`min-w-0` no wrapper + `min-h-11/min-w-11` no `SidebarTrigger` para a área de toque de 44px) entrou no commit de T17 por ser pré-requisito do próprio teste, não constatado no Design original. 2484/2484 testes unit, 82/82 e2e (1 flaky por colisão de horário, absorvida pelo retry padrão da suíte).

Phase 3 done (T18-T30, commits b249765, e477cbb, b96c561, 346b051, af27178, 9bf32b2, 254bade, 969144c, 4efc1f5, a70b10a, a615ab9, f93700b). `ConfirmAction` (T18) encapsula `AlertDialog*` de `@still-void/ui@3.3.1` com `trigger`/`title`/`description`/`confirmLabel`/`onConfirm`/`variant`. Os 12 call sites (T19-T30) foram migrados; cada teste de página existente foi estendido para clicar no trigger + no botão de confirmação (ou em "Cancelar" dentro do `alertdialog`) antes de assertar a chamada de API, e cada página ganhou um teste novo cobrindo o caminho de cancelamento (não dispara a API). "Reativar" (lado oposto do toggle em parceiros/pacientes/procedimentos/profissionais/configuracoes) permanece sem confirmação, conforme nota do design.md. Desvios: (1) T20+T21 (triagem de fotos no dashboard) entraram num único commit — mesmo componente `TriageQueue`, mesmo bloco de mudança, sem valor extra em separar; (2) `confirmLabel` foi escolhido em cada call site para nunca colidir com o texto do próprio trigger nem com "Cancelar" (ex.: "Confirmar", "Cancelar retorno", "Cancelar fatura", "Confirmar antecipação") — texto literal diferente do sugerido em alguns rótulos da tabela do design.md, mesma semântica. 2500/2500 testes unit; `typecheck`/`lint`/`check:sv` verdes. E2E completo não executado nesta fase (fora do escopo dos gates "quick" de T19-T30).

---

## Test Coverage Matrix

> Generated from codebase (`tests/lib/hooks.test.tsx`, `tests/pages/staff-paciente-care-plans.test.tsx`, `tests/support/render-with-toast.tsx`, `e2e/*.spec.ts`) and `AGENTS.md` ("90% coverage minimum enforced"). Guidelines found: `AGENTS.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| `src/lib/use-api-query.ts` (hook) | unit | 1:1 com ACs de FASEA-01..03 (loading/error/vazio/refresh) | `tests/lib/hooks.test.tsx` | `npm test` |
| `src/components/confirm-action.tsx` (novo componente) | unit | Render trigger, confirmar dispara `onConfirm`, cancelar não dispara, Esc fecha | `tests/components/confirm-action.test.tsx` (novo) | `npm test` |
| Páginas migradas (Prontuário: evolutions/conditions/care-plans/condition-photos) | unit | Erro 4xx/5xx renderiza bloco de erro, não `EmptyState`; loading distinto | `tests/pages/staff-paciente-*.test.tsx` (existentes, estender) | `npm test` |
| Páginas com toggle destrutivo (pacientes/profissionais/parceiros/procedimentos/configuracoes) + dashboard + faturamento + care-plans/conditions/fotos | unit | Clique no trigger abre dialog; confirmar dispara API; cancelar não dispara | `tests/pages/staff-*.test.tsx` (existentes, estender) | `npm test` |
| 4 páginas de toast (`pacientes`, `configuracoes`, `portal/patient-view`, `portal/consent-card`) | unit | Mutação com sucesso dispara toast `success`; falha dispara toast `danger` (usar `renderWithToast`) | `tests/pages/*.test.tsx` (existentes, estender) | `npm test` |
| Tabelas com `overflow-x-auto` | e2e | Viewport 375px sem scroll horizontal de página, nas 11 páginas | `e2e/*.spec.ts` (novo spec `e2e/responsive-tables.spec.ts`) | `npm run test:e2e` |
| CSS/wrapper puro (sem lógica) | none | — | — | build gate (`npm run typecheck`, `npm run lint`, `npm run check:sv`) |

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| unit (vitest) | Yes | `vi.stubGlobal("fetch", ...)` por teste, sem estado global compartilhado, `afterEach(() => vi.unstubAllGlobals())` | `tests/lib/hooks.test.tsx:1-13` |
| e2e (Playwright) | No | Testes de banco/servidor compartilhado entre specs (não há isolamento por schema visível nos specs existentes) | `e2e/faturamento.spec.ts`, `e2e/agenda.spec.ts` rodam contra o mesmo servidor de dev |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após task com só teste unit | `npm run typecheck && npm test` |
| Full | Após task com e2e | `npm run typecheck && npm test && npm run test:e2e` |
| Build | Fim de fase / antes de merge | `npm run typecheck && npm run lint && npm run check:sv && npm run test:coverage && npm run test:e2e` |

---

## Execution Plan

### Phase 1: `useApiQuery` + contrato de erro (Sequential → Parallel)

```
T1 ──→ T2 ──┬──→ T3 [P]
            ├──→ T4 [P]
            └──→ T5 [P]
```

### Phase 2: Tabelas responsivas (Parallel, sem dependência de Phase 1)

```
T6 [P] ── T7 [P] ── T8 [P] ── T9 [P] ── T10 [P] ── T11 [P] ── T12 [P] ── T13 [P] ── T14 [P] ── T15 [P] ── T16 [P]
T17 (e2e, depende de T6..T16)
```

### Phase 3: `ConfirmAction` + migração das 12 ações destrutivas (Sequential → Parallel)

```
T18 ──┬──→ T19 [P]
      ├──→ T20 [P]
      ├──→ T21 [P]
      ├──→ T22 [P]
      ├──→ T23 [P]
      ├──→ T24 [P]
      ├──→ T25 [P]
      ├──→ T26 [P]
      ├──→ T27 [P]
      ├──→ T28 [P]
      ├──→ T29 [P]
      └──→ T30 [P]
```

### Phase 4: Toast nas 4 páginas sem feedback (Parallel)

```
T31 [P]
T32 [P]
T33 [P]
T34 [P]
```

---

## Task Breakdown

### T1: Adicionar `isLoading` ao `useApiQuery`

**What**: Estender `useApiQuery` com `isLoading: boolean` — `true` antes/durante o fetch, `false` em sucesso ou erro; mantém `data`/`error`/`refresh` como estão.
**Where**: `src/lib/use-api-query.ts`
**Depends on**: None
**Reuses**: implementação atual (`apiFetch`, `useEffect`, `useState`)
**Requirement**: FASEA-01

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `isLoading` é `true` do início do `useEffect` até `.then`/`.catch` resolver
- [ ] `url === null` retorna `isLoading: false` (comportamento de query condicional preservado)
- [ ] Assinatura antiga (`data`, `error`, `refresh`) continua igual — nenhum consumidor existente quebra
- [ ] Gate: `npm run typecheck && npm test`

**Tests**: unit (`tests/lib/hooks.test.tsx` — estender com casos: loading true durante fetch pendente, loading false após sucesso, loading false após erro)
**Gate**: quick

---

### T2: Criar `ErrorAlert` genérico reaproveitável (se ainda não for exportado)

**What**: Confirmar que `ErrorAlert` usado em `conditions-section.tsx`/`care-plans-section.tsx` é importável por outras páginas do Prontuário; se for local/duplicado, extrair pra `src/components/error-alert.tsx` único.
**Where**: `src/components/error-alert.tsx` (novo, se necessário) ou confirmação de que já é compartilhado
**Depends on**: T1
**Reuses**: `ErrorAlert` já existente em `conditions-section.tsx`
**Requirement**: FASEA-02

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Um único `ErrorAlert` é usado por todos os consumidores migrados nesta fase (T3–T5)
- [ ] Gate: `npm run typecheck`

**Tests**: none (componente de apresentação puro, coberto indiretamente pelos testes de página em T3-T5)
**Gate**: quick

---

### T3: Migrar `evolutions-section.tsx` pro contrato de 3 estados [P]

**What**: Página passa a checar `isLoading` → `error` (`ErrorAlert` + botão "Tentar novamente" chamando `refresh()`) → `data` vazio (`EmptyState`), nessa ordem.
**Where**: `src/app/(staff)/pacientes/[id]/evolutions-section.tsx`
**Depends on**: T2
**Reuses**: `ErrorAlert` (T2), `EmptyState` já usado
**Requirement**: FASEA-04, FASEA-05

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Erro 4xx/5xx renderiza `ErrorAlert`, nunca `EmptyState`
- [ ] `data` vazio (sucesso) renderiza `EmptyState`
- [ ] Gate: `npm run typecheck && npm test`

**Tests**: unit — estender `tests/pages/staff-paciente-*.test.tsx` correspondente com caso de erro 500 mockado
**Gate**: quick

**Commit**: `fix(prontuario): distingue erro de vazio em evoluções (#57)`

---

### T4: Migrar `conditions-section.tsx` e `care-plans-section.tsx` pro contrato de 3 estados [P]

**What**: Mesma migração de T3 aplicada às duas seções (já usam `ErrorAlert` — só falta checar `isLoading` antes de decidir entre erro/vazio).
**Where**: `src/app/(staff)/pacientes/[id]/conditions-section.tsx`, `src/app/(staff)/pacientes/[id]/care-plans-section.tsx`
**Depends on**: T2
**Reuses**: `ErrorAlert`, `EmptyState`
**Requirement**: FASEA-04, FASEA-05

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Ambas as seções distinguem loading/erro/vazio
- [ ] Erro nunca aparece como "Nenhuma condição clínica cadastrada" / "Nenhum plano"
- [ ] Gate: `npm run typecheck && npm test`

**Tests**: unit — estender `tests/pages/staff-paciente-care-plans.test.tsx` e equivalente de conditions
**Gate**: quick

**Commit**: `fix(prontuario): distingue erro de vazio em condições e planos de cuidado (#57)`

---

### T5: Migrar `condition-photos.tsx` pro contrato de 3 estados [P]

**What**: Mesma migração aplicada à galeria de fotos.
**Where**: `src/app/(staff)/pacientes/[id]/condition-photos.tsx`
**Depends on**: T2
**Reuses**: `ErrorAlert`, `EmptyState`
**Requirement**: FASEA-04, FASEA-05

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Erro 4xx/5xx renderiza `ErrorAlert`
- [ ] Gate: `npm run typecheck && npm test`

**Tests**: unit — estender teste de página correspondente
**Gate**: quick

**Commit**: `fix(prontuario): distingue erro de vazio em fotos de condição (#57)`

---

### T6–T16: Envolver tabela com `overflow-x-auto` em cada página [P]

Uma task por página (11 tasks, mesmo padrão, sem dependência entre si).

**What**: Envolver a tabela existente em `<div className="overflow-x-auto">`, seguindo o padrão já usado em `calendar-grid.tsx:55`.
**Where** (uma task por arquivo):
- T6: `src/app/(staff)/faturamento/page.tsx`
- T7: `src/app/(staff)/relatorios/page.tsx`
- T8: `src/app/(staff)/profissionais/page.tsx`
- T9: `src/app/(staff)/pacientes/page.tsx`
- T10: `src/app/(staff)/parceiros/page.tsx`
- T11: `src/app/(staff)/auditoria/page.tsx`
- T12: `src/app/(staff)/procedimentos/page.tsx`
- T13: `src/app/(staff)/configuracoes/page.tsx`
- T14: `src/app/(staff)/materiais/page.tsx`
- T15: `src/app/documentos/plano-cuidados/[carePlanId]/page.tsx`
- T16: `src/app/documentos/relatorio/[conditionId]/page.tsx`

**Depends on**: None
**Reuses**: padrão de `calendar-grid.tsx:55`
**Requirement**: FASEA-06, FASEA-08

**Tools**: MCP: NONE / Skill: NONE

**Done when** (cada task):
- [ ] Tabela envolta em `overflow-x-auto`, sem alterar colunas/conteúdo
- [ ] Gate: `npm run typecheck && npm run lint && npm run check:sv`

**Tests**: none (mudança de wrapper CSS puro; cobertura fica no e2e de T17)
**Gate**: quick (typecheck/lint apenas)

**Commit** (cada task): `fix(ux): contém scroll horizontal na tabela de [página] (#58)`

---

### T17: E2E de ausência de scroll horizontal em viewport mobile

**What**: Novo spec Playwright que visita as 11 páginas em viewport 375×667 e assere `document.documentElement.scrollWidth <= 375` (ou igual à largura do viewport) e presença de `overflow-x-auto` no wrapper da tabela; também verifica alvo de toque ≥44px no `SidebarTrigger`.
**Where**: `e2e/responsive-tables.spec.ts` (novo)
**Depends on**: T6, T7, T8, T9, T10, T11, T12, T13, T14, T15, T16
**Reuses**: padrão de login/autenticação já usado em outros specs (`e2e/auth.spec.ts` ou helper de sessão existente)
**Requirement**: FASEA-06, FASEA-07, FASEA-09

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] 11 páginas testadas, todas sem scroll horizontal em 375px
- [ ] `SidebarTrigger` medido ≥44×44px
- [ ] Gate: `npm run test:e2e`

**Tests**: e2e (este é o próprio teste)
**Gate**: full

**Commit**: `test(e2e): cobre ausência de scroll horizontal mobile nas telas do staff (#58)`

---

### T18: Criar componente `ConfirmAction`

**What**: Componente novo que encapsula `AlertDialog`/`AlertDialogTrigger`/`AlertDialogContent`/`AlertDialogHeader`/`AlertDialogFooter`/`AlertDialogTitle`/`AlertDialogDescription` de `@still-void/ui/react/client`, parametrizado por `trigger`, `title`, `description`, `confirmLabel`, `onConfirm`, `variant?`.
**Where**: `src/components/confirm-action.tsx` (novo)
**Depends on**: None
**Reuses**: `AlertDialog*` de `@still-void/ui/react/client` (3.3.1, já instalado)
**Requirement**: FASEA-10

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Renderiza `trigger` como disparador do dialog
- [ ] Confirmar chama `onConfirm` e fecha o dialog
- [ ] Cancelar/Esc/clique fora NÃO chama `onConfirm`
- [ ] Gate: `npm run typecheck && npm test`

**Tests**: unit — novo `tests/components/confirm-action.test.tsx`: (1) clique no trigger abre dialog com título/descrição corretos, (2) confirmar dispara `onConfirm` uma vez, (3) cancelar não dispara `onConfirm`, (4) Esc fecha sem disparar
**Gate**: quick

**Commit**: `feat(ui): adiciona ConfirmAction sobre AlertDialog do still-void (#59)`

---

### T19–T30: Migrar cada ação destrutiva pro `ConfirmAction` [P]

Uma task por call site (12 tasks, mesmo padrão, sem dependência entre si além de T18).

**What**: Envolver o botão existente com `ConfirmAction`, copy nomeando a consequência específica da tabela "Ações destrutivas levantadas" do `design.md`.
**Where** (uma task por call site):
- T19: `(staff)/page.tsx` — `resolveFollowUp(id, "cancelled")` ("Cancelar" retorno)
- T20: `(staff)/page.tsx` — `triage(photo, "reviewed")` ("Ok, manter plano")
- T21: `(staff)/page.tsx` — `triage(photo, "escalated")` ("Antecipar retorno")
- T22: `faturamento/page.tsx` — `onCancel(invoice)` ("Cancelar" fatura)
- T23: `parceiros/page.tsx` — toggle `active → false` ("Desativar")
- T24: `pacientes/page.tsx` — toggle `active → false` ("Desativar")
- T25: `procedimentos/page.tsx` — toggle `active → false` ("Desativar")
- T26: `profissionais/page.tsx` — toggle `active → false` ("Desativar")
- T27: `configuracoes/page.tsx` — toggle `active → false` ("Desativar" conta)
- T28: `pacientes/[id]/care-plans-section.tsx` — `resolveCarePlan` ("Resolver plano")
- T29: `pacientes/[id]/conditions-section.tsx` — `resolveCondition` ("Resolver condição")
- T30: `pacientes/[id]/condition-photos.tsx` — delete foto ("Excluir")

**Depends on**: T18
**Reuses**: `ConfirmAction` (T18)
**Requirement**: FASEA-10, FASEA-11, FASEA-12

**Tools**: MCP: NONE / Skill: NONE

**Done when** (cada task):
- [ ] Clique no botão abre `ConfirmAction` em vez de chamar a API direto
- [ ] Confirmar dispara a mesma chamada de API de antes (sem mudar comportamento de sucesso)
- [ ] Cancelar não dispara chamada nenhuma
- [ ] Teste existente da página é atualizado pra simular clique no trigger + confirmação antes de assertar a chamada de API
- [ ] Gate: `npm run typecheck && npm test`

**Tests**: unit — atualizar o teste de página existente correspondente (`tests/pages/staff-*.test.tsx`)
**Gate**: quick

**Commit** (cada task): `fix([página]): confirma [ação] com AlertDialog antes de executar (#59)`

---

### T31: Toast de sucesso/erro em `pacientes/page.tsx` [P]

**What**: Handlers de mutação (criar/editar/toggle ativo) passam a chamar `toast({ description, variant: "success" })` no sucesso e `variant: "danger"` no erro, reaproveitando a forma de chamada já usada em `faturamento/page.tsx`.
**Where**: `src/app/(staff)/pacientes/page.tsx`
**Depends on**: None (independe das outras fases; pode rodar em paralelo com Phase 1–3)
**Reuses**: `useToast` de `@still-void/ui/react/client`, padrão de `faturamento/page.tsx`
**Requirement**: FASEA-14, FASEA-15, FASEA-16, FASEA-17

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Mutação bem-sucedida dispara toast `success`
- [ ] Mutação com erro dispara toast `danger` com a mensagem
- [ ] Gate: `npm run typecheck && npm test`

**Tests**: unit — estender `tests/pages/*.test.tsx` de pacientes com `renderWithToast`, assertando toast disparado
**Gate**: quick

**Commit**: `feat(pacientes): adiciona feedback de sucesso/erro em mutações (#60)`

---

### T32: Toast de sucesso/erro em `configuracoes/page.tsx` [P]

**What**: Mesmo padrão de T31 aplicado a criar/editar/desativar conta.
**Where**: `src/app/(staff)/configuracoes/page.tsx`
**Depends on**: None
**Reuses**: `useToast`, padrão de `faturamento/page.tsx`
**Requirement**: FASEA-14, FASEA-15, FASEA-16, FASEA-17

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Mutação bem-sucedida dispara toast `success`; erro dispara `danger`
- [ ] Gate: `npm run typecheck && npm test`

**Tests**: unit — estender teste existente com `renderWithToast`
**Gate**: quick

**Commit**: `feat(configuracoes): adiciona feedback de sucesso/erro em mutações (#60)`

---

### T33: Toast de sucesso/erro em `portal/patient-view.tsx` [P]

**What**: Mesmo padrão aplicado às mutações do portal do paciente (ex.: envio de foto, confirmação de agendamento).
**Where**: `src/app/portal/patient-view.tsx`
**Depends on**: None
**Reuses**: `useToast`, padrão já usado em `portal/schedule-return.tsx`
**Requirement**: FASEA-14, FASEA-15, FASEA-16, FASEA-17

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Mutação bem-sucedida dispara toast `success`; erro dispara `danger`
- [ ] Gate: `npm run typecheck && npm test`

**Tests**: unit — estender `tests/pages/portal.test.tsx` com `renderWithToast`
**Gate**: quick

**Commit**: `feat(portal): adiciona feedback de sucesso/erro em mutações do paciente (#60)`

---

### T34: Toast de sucesso/erro em `portal/consent-card.tsx` [P]

**What**: Mesmo padrão aplicado à ação de assinar/consentir.
**Where**: `src/app/portal/consent-card.tsx`
**Depends on**: None
**Reuses**: `useToast`
**Requirement**: FASEA-14, FASEA-15, FASEA-16, FASEA-17

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Mutação bem-sucedida dispara toast `success`; erro dispara `danger`
- [ ] Gate: `npm run typecheck && npm test`

**Tests**: unit — estender `tests/pages/portal.test.tsx` com `renderWithToast`
**Gate**: quick

**Commit**: `feat(portal): adiciona feedback de sucesso/erro na assinatura de consentimento (#60)`

---

## Parallel Execution Map

```
Phase 1 (useApiQuery — sequential então parallel):
  T1 ──→ T2 ──┬── T3 [P]
              ├── T4 [P]
              └── T5 [P]

Phase 2 (tabelas — totalmente paralelo, independente de Phase 1):
  T6..T16 [P] (11 tasks, qualquer ordem)
  T6..T16 completos ──→ T17 (e2e)

Phase 3 (AlertDialog — sequential então parallel):
  T18 ──→ T19..T30 [P] (12 tasks, qualquer ordem)

Phase 4 (toast — totalmente paralelo, independente das outras fases):
  T31 [P], T32 [P], T33 [P], T34 [P]
```

**Nota de execução real**: Phases 2 e 4 não dependem de nenhuma outra fase — podem começar imediatamente. Phase 3 só depende de T18. Phase 1 é a única com uma cadeia sequencial curta (T1→T2) antes de abrir em paralelo.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 função (hook) | ✅ Granular |
| T2 | 1 componente (ou confirmação de reuso) | ✅ Granular |
| T3–T5 | 1 arquivo cada | ✅ Granular |
| T6–T16 | 1 arquivo cada (wrapper CSS) | ✅ Granular |
| T17 | 1 spec e2e | ✅ Granular |
| T18 | 1 componente | ✅ Granular |
| T19–T30 | 1 call site cada | ✅ Granular |
| T31–T34 | 1 arquivo cada | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T2 | T2→T3 | ✅ Match |
| T4 | T2 | T2→T4 | ✅ Match |
| T5 | T2 | T2→T5 | ✅ Match |
| T6–T16 | None | Paralelo, sem seta de dependência entre si | ✅ Match |
| T17 | T6..T16 | T6..T16→T17 | ✅ Match |
| T18 | None | None | ✅ Match |
| T19–T30 | T18 | T18→cada uma | ✅ Match |
| T31–T34 | None | Paralelo, sem dependência | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | `use-api-query.ts` (hook) | unit | unit | ✅ OK |
| T2 | `error-alert.tsx` (componente puro) | none (indireto via páginas) | none | ✅ OK |
| T3–T5 | Páginas do Prontuário | unit | unit | ✅ OK |
| T6–T16 | wrapper CSS puro | none | none | ✅ OK |
| T17 | e2e novo | e2e | e2e | ✅ OK |
| T18 | `confirm-action.tsx` (componente) | unit | unit | ✅ OK |
| T19–T30 | páginas (handler + trigger) | unit | unit | ✅ OK |
| T31–T34 | páginas (handler de mutação) | unit | unit | ✅ OK |

Nenhuma violação — todas as tasks com código testável incluem teste na própria task; wrappers CSS puros e componente de apresentação sem lógica ficam com `Tests: none`, coerente com a matriz.

---

## Sub-Agent Delegation

4 fases → acima do limiar de 3. Ofereço 1 sub-agente por fase (sequencial), Verifier automático ao final da última task.

## Tools per Task

Nenhuma task precisa de MCP externo ou skill adicional além do `tlc-spec-driven` já ativo — tudo é código local (React/TS) usando componentes já no bundle `@still-void/ui@3.3.1` e o padrão de teste já estabelecido no repo (vitest + RTL + Playwright).
