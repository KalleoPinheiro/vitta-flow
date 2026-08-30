# Adoção `@still-void/ui@3.3.0` — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

**Model mandate (this session, user instruction):** planejamento = opus (já feito — spec/design/tasks). Execução = haiku, obrigatoriamente. Todo phase worker desta feature deve ser despachado com `model: haiku`.

---

**Design**: `.specs/features/still-void-v3.3-adoption/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase (`vitest.config.ts`, `playwright.config.ts`, sampled `tests/pages/*.test.tsx`, `tests/components/*.test.tsx`). Guidelines found: `vitest.config.ts` (coverage include/exclude + 90% thresholds, global), `playwright.config.ts` (e2e config), `.claude/rules/ecc/typescript/testing.md` (Playwright for e2e — already in use). Confirm before Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| `src/app/(staff)/layout.tsx` | none (unit) — excluded by `vitest.config.ts` (`exclude: ["src/app/**/layout.tsx"]`, comment: "sem branches, cobertos visualmente por E2E") | E2E only: responsive behavior (rail ≥1024px, drawer <1024px, open/close, focus restore, no content clipped at 390px) | `e2e/*.spec.ts` (novo arquivo) | `npm run test:e2e` |
| `src/app/(staff)/sidebar-auto-close.tsx` (novo) | unit | All branches: fecha em troca de pathname, NÃO fecha no mount inicial | `tests/components/*.test.tsx` (novo arquivo) ou `tests/pages/staff-*.test.tsx` se testado via layout | `npm test` |
| Alert call sites (6 arquivos, componentes de apresentação) | unit | 1:1 por AC da spec (P2-1..10): variante correta + `role` derivado, por condição (presente/ausente, vencido/a vencer, etc.) | `tests/components/feedback.test.tsx`, `tests/pages/staff-*.test.tsx`, `tests/pages/portal.test.tsx` (arquivos já existentes, atualizados) | `npm test` |
| Toast infra (`ToastProvider` no root layout + helper de teste) | unit (helper) + none (layout, excluído) | Helper testado indiretamente pelos call sites que o usam | `tests/support/render-with-toast.tsx` (novo, sem teste próprio — utilitário puro de render) | `npm test` |
| Toast call sites (13 arquivos, 32 funções) | unit | 1:1 por AC da spec (P3-33..35): toast de sucesso disparado com o texto exato; toast de erro disparado com a mensagem existente; `Alert`/`setActionError` inline não removido onde já existia | `tests/pages/staff-*.test.tsx`, `tests/pages/portal.test.tsx` (arquivos já existentes, atualizados) | `npm test` |
| Domínio/aplicação (não tocado nesta feature) | — | — | — | — |

**Coverage Expectation values**: guideline do repo é 90% global (`vitest.config.ts` thresholds), não por arquivo — cada task deve manter o agregado ≥90% (checar `npm run test:coverage` no gate `build`, não em todo task).

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
|---|---|---|---|
| Unit (Vitest, `tests/pages/*.test.tsx`, `tests/components/*.test.tsx`) | Yes | `global.fetch = vi.fn(...)` reatribuído por teste/arquivo, sem banco real, sem estado global compartilhado entre arquivos | `tests/pages/staff-agenda.test.tsx` (fetch mockado inline, sem PGlite) |
| E2E (Playwright) | No | `playwright.config.ts`: `fullyParallel: false`, `workers: 1` — servidor real compartilhado | `playwright.config.ts:28-29` |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | Após task com só teste unitário (Alert, Toast, SidebarAutoClose) | `npm run typecheck && npx vitest run <arquivo(s) de teste da task>` |
| Full | Após task de Sidebar (layout, e2e) | `npm run typecheck && npx vitest run && npm run test:e2e -- <arquivo e2e novo>` |
| Build | Ao fechar cada FASE (não cada task) | `npm run typecheck && npm test && npm run build && npm run check:sv` |

---

## Execution Plan

### Phase 1: Sidebar (Sequential)

```
T1 → T2
```

### Phase 2: Alert (Parallel OK — 6 arquivos independentes)

```
T3 [P] ─┐
T4 [P] ─┤
T5 [P] ─┼── (sem dependência entre si; fase começa após Phase 1 fechar)
T6 [P] ─┤
T7 [P] ─┤
T8 [P] ─┘
```

### Phase 3: Toast — infraestrutura (Sequential)

```
T9
```

### Phase 4: Toast — call sites A (Parallel OK — 8 arquivos, staff top-level + portal)

```
T10 [P] ─┐
T11 [P] ─┤
T12 [P] ─┤
T13 [P] ─┼── (depende só de T9)
T14 [P] ─┤
T15 [P] ─┤
T16 [P] ─┤
T17 [P] ─┘
```

### Phase 5: Toast — call sites B (Parallel OK — 5 arquivos do prontuário)

```
T18 [P] ─┐
T19 [P] ─┤
T20 [P] ─┼── (depende só de T9; separada da Fase 4 só por tamanho de contexto do worker, não por dependência real)
T21 [P] ─┤
T22 [P] ─┘
```

---

## Task Breakdown

### T1: `SidebarAutoClose` component

**What**: Novo componente client `SidebarAutoClose` que fecha o drawer mobile ao trocar de rota (ver design.md, Components).
**Where**: `src/app/(staff)/sidebar-auto-close.tsx` (novo)
**Depends on**: None
**Reuses**: `useSidebar` de `@still-void/ui/react/client`, `usePathname` de `next/navigation`
**Requirement**: SV33-04 (fechar drawer ao navegar — edge case da spec)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Componente implementado exatamente como no design.md (guarda de primeiro render, `setOpen(false)` em toda troca subsequente de `pathname`)
- [ ] Teste unitário cobre: NÃO fecha no mount inicial; fecha ao mudar pathname (com `SidebarProvider` mockado/real envolvendo, `defaultOpen={true}` pra provar que fechou de fato)
- [ ] `npm run typecheck` limpo
- [ ] Gate: `npx vitest run tests/components/sidebar-auto-close.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T2: Adotar `SidebarProvider`/`SidebarPanel`/`SidebarTrigger`/`SidebarInset` em `(staff)/layout.tsx`

**What**: Substituir `<Sidebar>` estático pelo template completo do design.md (`SidebarProvider` + `SidebarAutoClose` + `SidebarPanel` com `BrandLogo`/`StaffNav`/`LogoutButton` + `SidebarInset` com trigger mobile `lg:hidden` + `{children}`), remover `overflow-x-hidden` do `<main>` antigo.
**Where**: `src/app/(staff)/layout.tsx` (edição)
**Depends on**: T1
**Reuses**: `SidebarAutoClose` (T1), `BrandLogo`, `LogoutButton`, `StaffNav` sem alteração
**Requirement**: SV33-01..06 (todos os ACs de P1)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Layout usa a família `SidebarProvider`/`SidebarPanel`/`SidebarTrigger`/`SidebarInset` de `@still-void/ui/react/client` — zero `<Sidebar>`/`<SidebarSection>` de `@still-void/ui/react` restante pro shell (nota: `SidebarSection` continua sendo usado DENTRO do `SidebarPanel`, é primitivo diferente — não remover esse import)
- [ ] `npm run check:sv` continua verde (nenhum HTML cru introduzido)
- [ ] Novo teste e2e (`e2e/sidebar-responsive.spec.ts`) cobre, no mínimo: (a) viewport 390px → sidebar não visível por padrão, `SidebarTrigger` visível, clique abre drawer com todos os itens de `StaffNav`, (b) viewport 1280px → sidebar visível como rail, sem drawer/overlay, (c) 390px → abrir drawer, navegar por um link → drawer fecha (valida T1 integrado), (d) qualquer página do staff em 390px não tem conteúdo cortado horizontalmente (checar `scrollWidth` do `<main>`/`SidebarInset` ≤ largura do viewport, ou verificação visual equivalente)
- [ ] Validação manual registrada no commit/PR: screenshot ou nota confirmando visual em 390/768/1024/1280px (Risco R2 do design)
- [ ] `npm run typecheck` limpo
- [ ] Gate: `npm run typecheck && npx vitest run && npm run test:e2e -- e2e/sidebar-responsive.spec.ts` verde

**Tests**: e2e
**Gate**: full

**Commit**: `feat(staff): adota SidebarProvider responsivo no layout do staff`

---

### T3: `ErrorAlert` → `Alert variant="danger"` [P]

**What**: Trocar `className="border-danger"` + `text-danger` manual por `variant="danger"`.
**Where**: `src/components/feedback.tsx` (edição — `ErrorAlert`)
**Depends on**: T2 (fase sequencial; sem dependência de código real)
**Reuses**: `Alert` já importado
**Requirement**: SV33-07

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `ErrorAlert` usa `<Alert variant="danger"><AlertDescription>{message}</AlertDescription></Alert>`, sem `className`/`text-danger` manual, sem `role` manual (deriva sozinho)
- [ ] Comentário obsoleto (linhas 7-11, "o catálogo não traz variante de erro") removido/atualizado
- [ ] `tests/components/feedback.test.tsx` atualizado: assert `role="alert"` e classe `sv-alert--danger` (ou seletor equivalente) presentes
- [ ] Gate: `npm run typecheck && npx vitest run tests/components/feedback.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T4: `AllergyBanner` → `Alert variant="danger"` [P]

**What**: Trocar o `<div>` manual (border/bg/text danger) por `Alert variant="danger"`.
**Where**: `src/app/(staff)/pacientes/[id]/page.tsx` (edição — `AllergyBanner`, linhas ~85-97)
**Depends on**: T2
**Reuses**: `Alert`, `AlertDescription` (novo import em `page.tsx`), `Icon` já importado
**Requirement**: SV33-08

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `AllergyBanner` usa `Alert variant="danger"`, texto "Alergias: {allergies}" preservado, ícone `alert-triangle` preservado (via `icon` prop custom OU aceitar o ícone default de `danger` do catálogo — checar no `.d.ts` qual ícone default `danger` usa; manter `alert-triangle` explícito se divergir, pra não mudar o visual)
- [ ] `tests/pages/staff-paciente-detail.test.tsx` atualizado: assert `role="alert"` no banner de alergia
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-paciente-detail.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T5: `LowStockBanner` + `ExpiryBanner` (split) → `Alert` [P]

**What**: `LowStockBanner` vira `Alert variant="warning"`. `ExpiryBanner` divide em até 2 `Alert` (`variant="danger"` só se `expired.length > 0`, `variant="warning"` só se `expiring.length > 0`), cada um renderiza `null`/nada se sua lista for vazia.
**Where**: `src/app/(staff)/materiais/page.tsx` (edição — `LowStockBanner` linhas ~130-141, `ExpiryBanner` linhas ~143-171)
**Depends on**: T2
**Reuses**: `Alert`, `AlertDescription`
**Requirement**: SV33-09, SV33-10

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `LowStockBanner` usa `Alert variant="warning"`, texto preservado
- [ ] `ExpiryBanner` emite 0, 1 ou 2 `Alert` conforme AC P2-4/Edge Case (spec) — vencidos em `danger`, a vencer em `warning`, textos preservados, ícones `blocked`/`pending` preservados
- [ ] `tests/pages/staff-materiais.test.tsx` atualizado: caso só vencidos → 1 `Alert danger`; só a vencer → 1 `Alert warning`; ambos → 2 `Alert`; nenhum → 0 `Alert` (banner ausente)
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-materiais.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T6: "Grade salva" → `Alert variant="success"` [P]

**What**: Trocar `<p className="bg-success-soft text-success">` manual por `Alert variant="success"`, mantendo comportamento persistente (`saved` não expira sozinho).
**Where**: `src/app/(staff)/configuracoes/page.tsx` (edição, linhas ~98-102)
**Depends on**: T2
**Reuses**: `Alert`, `AlertDescription` (novo import)
**Requirement**: SV33-11

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `{saved && <Alert variant="success"><AlertDescription>Grade salva — vale imediatamente para novos agendamentos.</AlertDescription></Alert>}`
- [ ] `tests/pages/staff-operations.test.tsx` atualizado: assert `role="status"` (variant success deriva `status`) após salvar
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-operations.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T7: `seriesNotice` → `Alert` success/warning [P]

**What**: `seriesNotice` vira `Alert variant="success"` (nenhuma sessão pulada) ou `variant="warning"` (há puladas), texto atual preservado.
**Where**: `src/app/(staff)/agenda/page.tsx` (edição — `AgendaNotices`, linhas ~38-55; `handleCreate`, linhas ~119-141 só se precisar expor `skipped.length` pro componente de notice)
**Depends on**: T2
**Reuses**: `Alert`, `AlertDescription`
**Requirement**: SV33-12

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `seriesNotice` passa a carregar variante junto (ex.: `{ text: string; variant: "success" | "warning" }` em vez de `string` puro) OU `AgendaNotices` recebe um segundo prop `seriesNoticeVariant` — decisão de implementação livre, desde que `handleCreate` continue sendo a única fonte da lógica de "há pulados?"
- [ ] `tests/pages/staff-agenda.test.tsx` atualizado: série sem pulados → `role="status"`; série com pulados → `role="alert"`, texto com contagem de pulados preservado
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-agenda.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T8: `consent-card.tsx` (3 banners) → `Alert` [P]

**What**: Termo aceito → `Alert variant="success"`; termo pendente (título do `Card`) → cor/ícone `warning` (mantendo `Card`, não é `Alert` puro — ver spec AC P2-8); bloqueio de upload por consentimento pendente → `Alert variant="warning"`.
**Where**: `src/app/portal/consent-card.tsx` (edição — linhas ~32-38, ~59-63, ~120-126)
**Depends on**: T2
**Reuses**: `Alert`, `AlertDescription`, `Card` (já em uso)
**Requirement**: SV33-13, SV33-14, SV33-15

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Termo aceito usa `Alert variant="success"`, texto + `formatDateTime` preservados
- [ ] Termo pendente: título do `Card` usa cor/ícone consistente com `warning` (aceitar manter `Card` + classes manuais SE a lib não tiver uma variante de `Card` — documentar a decisão inline se `Card` continuar sem variant); o `<pre>` do texto do termo permanece inalterado (fora de escopo — é conteúdo, não feedback)
- [ ] Bloqueio de upload usa `Alert variant="warning"`, texto preservado
- [ ] `tests/pages/portal.test.tsx` atualizado (seção "Cartão de consentimento" e "Envio de foto"): assert `role` correto nos 2 pontos que viram `Alert` de fato (aceito, bloqueio de upload)
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/portal.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T9: `ToastProvider` no root + helper de teste

**What**: Montar `ToastProvider` em `src/app/layout.tsx` envolvendo `{children}`; criar helper `renderWithToast` reutilizável pros testes que forem consumir `useToast()`.
**Where**: `src/app/layout.tsx` (edição), `tests/support/render-with-toast.tsx` (novo)
**Depends on**: Phase 2 completa (T3-T8) — sequencial só por ordem de fase, sem dependência de código real
**Reuses**: `ToastProvider` de `@still-void/ui/react/client`
**Requirement**: SV33-33 (infra)

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `RootLayout` continua Server Component (sem `"use client"` no topo do arquivo); `<body>` passa a envolver `{children}` com `<ToastProvider>{children}</ToastProvider>`
- [ ] `tests/support/render-with-toast.tsx` exporta `renderWithToast(ui: ReactElement, options?: RenderOptions)`, envolvendo com `<ToastProvider>` e repassando pro `render` de `@testing-library/react`
- [ ] `npm run check:sv` continua verde
- [ ] `npm run typecheck` limpo
- [ ] Gate: `npm run typecheck && npx vitest run` (suíte inteira — layout excluído de coverage, mas precisa não quebrar nenhum teste existente que renderiza páginas do staff/portal sem o provider, já que ele passa a existir só a partir do root real; testes chamam os componentes diretamente sem o `RootLayout`, então não deveriam quebrar — confirmar)

**Tests**: none (layout excluído por config; helper é utilitário puro, testado indiretamente pelos consumidores nas fases 4/5)
**Gate**: quick

---

### T10: `resolveFollowUp` → toast + try/catch [P]

**What**: Envolver o `PATCH` em `try/catch`; sucesso dispara toast "Retorno concluído"/"Retorno cancelado" (conforme `status`); erro dispara toast `variant="danger"` com a mensagem (`err instanceof Error ? err.message : "Erro ao atualizar retorno"`).
**Where**: `src/app/(staff)/page.tsx` (edição — `resolveFollowUp`, linhas ~32-40)
**Depends on**: T9
**Reuses**: `useToast` (novo import)
**Requirement**: SV33-17 (linha 3 da tabela de call sites da spec)

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `resolveFollowUp` tem `try/catch`; sucesso chama `toast({ description: "Retorno concluído" | "Retorno cancelado", variant: "success" })`; catch chama `toast({ description: ..., variant: "danger" })`
- [ ] `tests/pages/staff-dashboard.test.tsx` atualizado (usa `renderWithToast` de T9): concluir retorno → toast de sucesso aparece com o texto certo; falha de rede → toast `danger`
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-dashboard.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T11: `handleCreate` (consulta única) → toast + try/catch [P]

**What**: Envolver só o ramo `else` (consulta única, sem `occurrences > 1`) em `try/catch`; sucesso dispara toast "Consulta criada"; erro dispara toast `danger`. Ramo de série (`seriesNotice`) NÃO muda (fora de escopo, já tratado por Alert em T7).
**Where**: `src/app/(staff)/agenda/page.tsx` (edição — `handleCreate`, linhas ~106-144)
**Depends on**: T9
**Reuses**: `useToast`
**Requirement**: SV33-18

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Ramo de consulta única tem `try/catch` próprio; sucesso → toast "Consulta criada"; erro → toast `danger` com mensagem
- [ ] Ramo de série inalterado (continua sem `try/catch` novo, comportamento preservado)
- [ ] `tests/pages/staff-agenda.test.tsx` atualizado (usa `renderWithToast`): criar consulta única → toast de sucesso; falha → toast `danger`; criar série continua sem toast (só `Alert`, de T7)
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-agenda.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T12: `faturamento/page.tsx` (4 funções) → toast [P]

**What**: `handleCreate` ganha `try/catch` novo + toast "Fatura criada"/`danger`. `handlePay` (já tem catch) ganha toast "Pagamento registrado" no sucesso, mantendo `actionError`/`ErrorAlert` no catch. `handleCancel` (já tem catch) ganha toast "Fatura cancelada" no sucesso. `PackageForm.handleSubmit` ganha toast "Pacote vendido" no sucesso (checar se precisa de `try/catch` novo).
**Where**: `src/app/(staff)/faturamento/page.tsx` (edição — 4 funções, linhas ~134-353)
**Depends on**: T9
**Reuses**: `useToast`
**Requirement**: SV33-19..22

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] 4 funções disparam toast de sucesso com o texto exato da tabela da spec; `handlePay`/`handleCancel` mantêm `Alert`/`actionError` de erro intactos (AC P3-35); `handleCreate` ganha `try/catch` + toast `danger`
- [ ] `tests/pages/staff-faturamento.test.tsx` atualizado (usa `renderWithToast`): uma asserção de toast de sucesso por função, mais o caso de erro de `handleCreate`
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-faturamento.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T13: `procedimentos/page.tsx` (3 funções) → toast [P]

**What**: `toggleActive` (já tem catch) → toast "Procedimento ativado"/"desativado" conforme novo estado. `ProcedureForm.handleSubmit` (já tem catch) → toast "Procedimento salvo". `KitForm.save` (já tem catch) → toast "Kit atualizado".
**Where**: `src/app/(staff)/procedimentos/page.tsx` (edição)
**Depends on**: T9
**Reuses**: `useToast`
**Requirement**: SV33-23..25

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] 3 funções disparam toast de sucesso com o texto exato; nenhum `try/catch` novo necessário (todas já têm)
- [ ] `tests/pages/staff-procedimentos.test.tsx` atualizado (usa `renderWithToast`)
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-procedimentos.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T14: `materiais/page.tsx` (2 funções) → toast [P]

**What**: `MovementForm.handleSubmit` (já tem catch) → toast "Entrada registrada"/"Saída registrada" conforme `type`. `SupplyForm.handleSubmit` (já tem catch) → toast "Insumo salvo".
**Where**: `src/app/(staff)/materiais/page.tsx` (edição — arquivo já tocado em T5, fase diferente, sem colisão)
**Depends on**: T9
**Reuses**: `useToast`
**Requirement**: SV33-26, SV33-27

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] 2 funções disparam toast de sucesso com texto exato; nenhum `try/catch` novo necessário
- [ ] `tests/pages/staff-materiais.test.tsx` atualizado (usa `renderWithToast`, mesmo arquivo de T5 — cuidar pra não reverter a mudança de T5 ao editar)
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-materiais.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T15: `profissionais/page.tsx` (2 funções) → toast [P]

**What**: `toggleActive` (já tem catch) → toast "Profissional ativado"/"desativado". `ProfessionalForm.handleSubmit` (já tem catch) → toast "Profissional salvo".
**Where**: `src/app/(staff)/profissionais/page.tsx` (edição)
**Depends on**: T9
**Reuses**: `useToast`
**Requirement**: SV33-28, SV33-29

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] 2 funções disparam toast de sucesso com texto exato
- [ ] `tests/pages/staff-operations.test.tsx` atualizado (usa `renderWithToast`, mesmo arquivo de T6 — não reverter)
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-operations.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T16: `parceiros/page.tsx` (2 funções) → toast [P]

**What**: `toggleActive` (já tem catch) → toast "Parceiro ativado"/"desativado". `PartnerForm.handleSubmit` (já tem catch) → toast "Parceiro salvo".
**Where**: `src/app/(staff)/parceiros/page.tsx` (edição)
**Depends on**: T9
**Reuses**: `useToast`
**Requirement**: SV33-30, SV33-31

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] 2 funções disparam toast de sucesso com texto exato
- [ ] `tests/pages/staff-operations.test.tsx` atualizado (mesmo arquivo de T6/T15 — não reverter; se T15 e T16 forem ao mesmo worker de fase, cuidar da ordem de edição no mesmo arquivo de teste)
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-operations.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T17: `portal/schedule-return.tsx` → toast [P]

**What**: `schedule` (já tem catch) → toast "Retorno agendado" no sucesso.
**Where**: `src/app/portal/schedule-return.tsx` (edição — `SchedulePanel.schedule`, linhas ~78-91)
**Depends on**: T9
**Reuses**: `useToast`
**Requirement**: SV33-32

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `schedule` dispara toast "Retorno agendado" no sucesso; erro continua no `setError` existente (AC P3-35)
- [ ] `tests/pages/portal.test.tsx` atualizado (usa `renderWithToast`, seção "retornos recomendados" ~linha 370): toast de sucesso ao agendar
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/portal.test.tsx` verde

**Tests**: unit
**Gate**: quick

**Nota de contexto para o worker desta fase**: ao final da Fase 4, se `tests/pages/portal.test.tsx` também foi tocado em T8 (Fase 2, `consent-card`), confirmar que as duas edições coexistem sem reverter uma à outra (arquivos de fases diferentes, sem colisão de commit, mas mesmo arquivo — revisar diff antes de commitar).

---

### T18: `anamnesis-section.tsx` → toast [P]

**What**: `handleSubmit` (já tem catch) → toast "Anamnese salva" no sucesso, REMOVE o texto `Salvo às {hora}` (`savedAt`) — toast substitui inteiramente.
**Where**: `src/app/(staff)/pacientes/[id]/anamnesis-section.tsx` (edição)
**Depends on**: T9
**Reuses**: `useToast`
**Requirement**: SV33-33 (item #18 da tabela P3 da spec)

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `handleSubmit` dispara toast "Anamnese salva"; `savedAt`/`setSavedAt` e o `<span>` que o renderizava são removidos (comportamento migra pro toast, não duplica)
- [ ] `tests/pages/staff-paciente-detail.test.tsx` atualizado: assert toast em vez de `Salvo às`
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-paciente-detail.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T19: `conditions-section.tsx` (3 funções) → toast [P]

**What**: `resolveCondition` → toast "Condição resolvida". `ConditionForm.handleSubmit` → toast "Condição registrada". Assessment `handleSubmit` → toast "Avaliação registrada". Todas já têm `catch`.
**Where**: `src/app/(staff)/pacientes/[id]/conditions-section.tsx` (edição)
**Depends on**: T9
**Reuses**: `useToast`
**Requirement**: SV33-33 (itens #19-21)

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] 3 funções disparam toast de sucesso com texto exato
- [ ] `tests/pages/staff-paciente-detail.test.tsx` atualizado (mesmo arquivo de T18 — não reverter)
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-paciente-detail.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T20: `evolutions-section.tsx` → toast [P]

**What**: `handleSubmit` (já tem catch) → toast "Evolução registrada" no sucesso.
**Where**: `src/app/(staff)/pacientes/[id]/evolutions-section.tsx` (edição)
**Depends on**: T9
**Reuses**: `useToast`
**Requirement**: SV33-33 (item #22)

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `handleSubmit` dispara toast "Evolução registrada"
- [ ] `tests/pages/staff-paciente-detail.test.tsx` atualizado (mesmo arquivo de T18/T19 — não reverter)
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-paciente-detail.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

### T21: `care-plans-section.tsx` (7 funções) → toast [P]

**What**: `OpenCarePlanForm.handleSubmit` → "Plano de cuidados aberto". `CarePlanPanel.resolvePlan` → "Plano de cuidados encerrado". `RecordInterventionButton` → "Execução registrada". `AddDiagnosisForm` → "Diagnóstico adicionado". `PrescribeOutcomeForm` → "Resultado prescrito". `PrescribeInterventionForm` → "Intervenção prescrita". `EvaluateOutcomeForm` → "Avaliação de resultado registrada". Todas já têm `catch`.
**Where**: `src/app/(staff)/pacientes/[id]/care-plans-section.tsx` (edição — arquivo grande, 7 pontos; maior task da feature)
**Depends on**: T9
**Reuses**: `useToast`
**Requirement**: SV33-33 (itens #23-29)

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] 7 funções disparam toast de sucesso com texto exato cada
- [ ] `tests/pages/staff-paciente-care-plans.test.tsx` atualizado: 1 asserção de toast por função (7 no total)
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-paciente-care-plans.test.tsx` verde

**Tests**: unit
**Gate**: quick

**Nota de tamanho**: esta é a task mais densa da feature (7 pontos num arquivo só). Se o worker perceber que o contexto está apertado, processar as 7 funções em sub-lotes sequenciais dentro da MESMA task (ainda um commit só ao final) — não quebrar em tasks novas sem atualizar este arquivo.

---

### T22: `condition-photos.tsx` (2 funções) → toast [P]

**What**: `upload` (já tem catch) → toast "Foto enviada". `remove` (já tem catch) → toast "Foto excluída".
**Where**: `src/app/(staff)/pacientes/[id]/condition-photos.tsx` (edição)
**Depends on**: T9
**Reuses**: `useToast`
**Requirement**: SV33-33 (itens #30-31)

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] 2 funções disparam toast de sucesso com texto exato
- [ ] `tests/pages/staff-paciente-detail.test.tsx` atualizado (mesmo arquivo de T18/T19/T20 — não reverter; revisar diff final)
- [ ] Gate: `npm run typecheck && npx vitest run tests/pages/staff-paciente-detail.test.tsx` verde

**Tests**: unit
**Gate**: quick

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2

Phase 2 (Parallel, após Phase 1):
    ├── T3 [P]
    ├── T4 [P]
    ├── T5 [P]
    ├── T6 [P]
    ├── T7 [P]
    └── T8 [P]

Phase 3 (Sequential, após Phase 2):
  T9

Phase 4 (Parallel, após Phase 3):
    ├── T10 [P]
    ├── T11 [P]
    ├── T12 [P]
    ├── T13 [P]
    ├── T14 [P]
    ├── T15 [P]
    ├── T16 [P]
    └── T17 [P]

Phase 5 (Parallel, após Phase 3 — roda depois da Fase 4 só por ordem de dispatch, não por dependência):
    ├── T18 [P]
    ├── T19 [P]
    ├── T20 [P]
    ├── T21 [P]
    └── T22 [P]
```

**Nota sobre T14/T15/T16 vs. T5/T6/T7**: mesmos arquivos, fases diferentes (2 e 4) — sem colisão real porque cada fase fecha (todos os commits da fase entram) antes da próxima abrir. Dentro da MESMA fase, nenhum arquivo se repete entre tasks `[P]` (checar tabela de cross-check abaixo).

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1 | 1 componente novo | ✅ Granular |
| T2 | 1 arquivo (layout) | ✅ Granular |
| T3-T8 | 1 arquivo cada, 1-3 pontos de Alert coesos por arquivo | ✅ Granular (2-3 pontos relacionados no mesmo arquivo é OK) |
| T9 | 1 arquivo (layout) + 1 helper novo, ambos infra do mesmo conceito (Toast) | ✅ Granular |
| T10-T22 | 1 arquivo cada, 1-7 funções coesas (mesmo padrão de toast) por arquivo | ✅ Granular (T21 é o limite superior aceitável — 7 pontos, mas todos o mesmo padrão mecânico num arquivo já grande que já seria editado inteiro de qualquer forma) |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | (raiz da Fase 1) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3-T8 | T2 | Fase 2 após Fase 1 | ✅ Match |
| T9 | Fase 2 completa | Fase 3 após Fase 2 | ✅ Match |
| T10-T17 | T9 | Fase 4 após Fase 3 | ✅ Match |
| T18-T22 | T9 | Fase 5 após Fase 3 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | `sidebar-auto-close.tsx` (não é `layout.tsx`) | unit | unit | ✅ OK |
| T2 | `(staff)/layout.tsx` | none (unit) / e2e | e2e | ✅ OK |
| T3-T8 | Alert call sites (`src/components`, `src/app/**`, não-layout) | unit | unit | ✅ OK |
| T9 | `src/app/layout.tsx` (root, é `layout.tsx` → excluído) + helper puro | none / unit(helper indireto) | none | ✅ OK |
| T10-T22 | Toast call sites (`src/app/**`, não-layout) | unit | unit | ✅ OK |

Nenhuma violação — todas as tasks que tocam camada com teste exigido incluem o teste na própria task (co-localizado no mesmo arquivo de teste já existente).

---

## MCPs e Skills por task

Nenhuma task desta feature precisa de MCP externo (sem chamada a API de terceiros, sem schema novo, sem pesquisa de biblioteca — `@still-void/ui@3.3.0` já foi verificado no round-5). Nenhum skill adicional além do `tlc-spec-driven` que já está conduzindo esta execução.
