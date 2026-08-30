# Migração `@still-void/ui` 3.1.0 → 3.2.0 — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/still-void-v3.2-migration/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Gerado a partir de `package.json` (scripts `test`/`test:e2e`/`check:sv`), `vitest.config.ts` e amostragem de `tests/components/*.test.tsx`, `tests/pages/*.test.tsx`, `tests/scripts/check-sv-adoption.test.ts`. Guidelines do repo: `.specs/STATE.md` AD-005 (par código/doc `sv-gap`), AD-014 (port não redesign). Nenhum `CONTRIBUTING.md`/threshold de cobertura textual encontrado além do já vigente (Handoff da v3: ≥90% linhas/statements/functions/branches) — aplicado como piso, não meta nova desta migração.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Componente de apresentação (`LoadMoreButton`, `HealingChart`, `Modal`) | unit (RTL) | 1:1 com as ACs da spec que tocam o componente + todo `SPEC_DEVIATION` documentado inline quando a asserção segue a lib e não o antigo utilitário | `tests/components/*.test.tsx` | `npm test -- <nome>` |
| Página (`login`, `(staff)/page`, `(staff)/materiais`) | unit (RTL) | Asserção de texto/estrutura afetada pela troca de ícone/separador, sem regressão nas demais | `tests/pages/*.test.tsx` | `npm test -- <nome>` |
| Script de gate (`check-sv-adoption.sh`) | integration (shell contra fixture) | Nenhuma mudança de comportamento do script nesta migração — só dado (código/doc) muda; suíte existente cobre | `tests/scripts/check-sv-adoption.test.ts` | `npm test -- check-sv-adoption` |
| Doc / config (`docs/still-void-gaps.md`, `package.json`, `.specs/STATE.md`) | none | — | — | build gate only |
| Fluxo E2E (triagem, inventário, login, modais) | e2e (Playwright) | Nenhuma AC nova de fluxo — smoke de regressão nos specs já existentes que tocam os 5 componentes trocados | `e2e/*.spec.ts` | `npm run test:e2e -- <arquivo>` |

## Parallelism Assessment

> Gerado a partir de `vitest.config.ts` e `afterEach(cleanup)` já presente em todos os arquivos de teste amostrados.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| unit (RTL/vitest) | Yes | `render`/`cleanup` por teste, sem estado global/DB compartilhado | `afterEach(() => cleanup())` em `tests/components/modal.test.tsx:6-8`, `load-more-button.test.tsx:6-8` |
| integration (shell fixture) | Yes | Roda o script contra diretório de fixture isolado (`tests/scripts/check-sv-adoption.test.ts` passa `SRC`/`GAPS_DOC` próprios) | Assinatura parametrizável do script (`scripts/check-sv-adoption.sh` linha `SRC="${1:-src}"`) |
| e2e (Playwright) | No | Sobe o servidor Next real; specs de páginas diferentes podem competir por porta/estado de sessão conforme config do projeto | Precedente: Handoff da v3-migration roda `test:e2e` como gate sequencial único, não por arquivo |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após task que só mexe em 1 componente/página de apresentação | `npm run typecheck && npm test -- <arquivo(s) do teste da task>` |
| Full | Após task que fecha um slug (código + doc) ou mexe em `Modal`/ripple de teste | `npm run typecheck && npm test && npm run check:sv` |
| Build | Fim de cada fase e fechamento da feature | `npm run typecheck && npm run build && npm test && npm run test:e2e && npm run check:sv` |

---

## Execution Plan

### Phase 1: Dependência (Sequential)

```
T1
```

### Phase 2: Lacunas com call site — cada uma isolada em arquivo próprio (Parallel OK entre si, sequencial dentro)

```
        ┌→ T2 ─┐
        ├→ T3 ─┤
T1 ─────┼→ T4 ─┼──→ (Phase 3)
        └→ T5 ─┘
```

### Phase 3: `dialog-close-label` + ripple de teste (Sequential — toca 8 arquivos de teste compartilhados)

```
T6 → T7
```

### Phase 4: Fechamento de documentação e decisão (Sequential)

```
T8 → T9
```

### Phase 5: Verificação final (Sequential)

```
T10
```

---

## Task Breakdown

### T1: Atualizar `@still-void/ui` para `3.2.0`

**What**: bump `package.json` (`^3.1.0` → `^3.2.0`), `npm install`, confirmar `node_modules/@still-void/ui/package.json` resolve `3.2.0`.
**Where**: `package.json`, `package-lock.json`
**Depends on**: None
**Reuses**: nada
**Requirement**: SV32-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `package.json` tem `"@still-void/ui": "^3.2.0"`
- [ ] `npm ls @still-void/ui` mostra `3.2.0` resolvido, 0 `invalid`/`extraneous`
- [ ] `npm run typecheck` e `npm run build` verdes (nenhuma quebra de tipo por causa do bump em si, antes de qualquer código de call site mudar)

**Tests**: none
**Gate**: build

**Commit**: `chore(deps): atualiza @still-void/ui para 3.2.0`

---

### T2: Fechar `pagination` — `LoadMoreButton` → família `Pagination` [P]

**What**: substituir `<div className="mt-4 text-center"><Button variant="outline">Carregar mais</Button></div>` por `Pagination > PaginationContent > PaginationItem > PaginationNext label="Carregar mais" onClick={onClick}`; remover comentário `// sv-gap: pagination`.
**Where**: `src/components/load-more-button.tsx`
**Depends on**: T1
**Reuses**: nenhum novo componente — só troca de import (`Button` sai, entram `Pagination`/`PaginationContent`/`PaginationItem`/`PaginationNext` de `@still-void/ui/react`)
**Requirement**: SV32-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `getByRole("nav", { name: "pagination" })` presente quando `visible=true`
- [ ] `getByRole("button", { name: "Carregar mais" })` continua presente e disparando `onClick` no clique (assert inalterado — ver design.md)
- [ ] Asserção de classe do teste atualizada de `sv-btn--outline` para a classe real emitida (`sv-pagination__link--next` — confirmar lendo a classe renderizada, não assumir) com comentário `SPEC_DEVIATION` no mesmo padrão dos demais
- [ ] `visible=false` continua retornando `null` (teste existente inalterado)
- [ ] Nenhuma ocorrência de `sv-gap: pagination` restante em `src/`
- [ ] Gate check passa: `npm run typecheck && npm test -- load-more-button`
- [ ] Contagem de testes de `tests/components/load-more-button.test.tsx` inalterada (4 testes) — nenhuma asserção removida, só a de classe atualizada

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(ui): fecha lacuna pagination com Pagination do still-void`

---

### T3: Fechar `separator` — divisor "ou" do login → `Separator` [P]

**What**: substituir os dois `<span className="h-px flex-1 bg-surface-2" />` por um `<Separator decorative={false} className="flex-1" />`; manter o texto "ou" como nó de texto solto no mesmo `<div>`; remover comentário `// sv-gap: separator`.
**Where**: `src/app/login/page.tsx`
**Depends on**: T1
**Reuses**: nada
**Requirement**: SV32-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `role="separator"` presente no DOM quando `providers.google && providers.password`
- [ ] `getByText("ou")` continua passando nos 3 cenários de `tests/pages/login.test.tsx` (só-senha, só-Google, ambos) sem mudança de asserção
- [ ] Nenhuma ocorrência de `sv-gap: separator` restante em `src/`
- [ ] Gate check passa: `npm run typecheck && npm test -- login`

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(ui): fecha lacuna separator com Separator do still-void`

---

### T4: Fechar `icon-set-gaps` — glifos → `Icon` [P]

**What**: substituir `📷` por `<Icon name="camera" />`, `⛔` por `<Icon name="blocked" />`, `⏳` por `<Icon name="pending" />`, sem prop `label` (decorativo — texto adjacente já anuncia); remover os 3 comentários `{/* sv-gap: icon-set-gaps */}`.
**Where**: `src/app/(staff)/page.tsx` (linha ~222-223), `src/app/(staff)/materiais/page.tsx` (linhas ~152-153, ~160-161)
**Depends on**: T1
**Reuses**: `Icon` já importado nos dois arquivos
**Requirement**: SV32-04, SV32-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `tests/pages/staff-dashboard.test.tsx` e `tests/pages/staff-materiais.test.tsx` passam sem mudança de asserção (regex já não depende do emoji — confirmar rodando, não assumir)
- [ ] `e2e/triagem.spec.ts` e `e2e/inventario.spec.ts` (specs relevantes) continuam passando
- [ ] Nenhuma ocorrência de `sv-gap: icon-set-gaps` restante em `src/`
- [ ] Gate check passa: `npm run typecheck && npm test -- staff-dashboard staff-materiais`

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(ui): fecha lacuna icon-set-gaps com camera/blocked/pending`

---

### T5: Fechar `data-chart` — `HealingChart` → `ChartContainer`/`ChartAxis`/`ChartLine` [P]

**What**: trocar `<svg role="img" aria-label="...">` manual por `ChartContainer`; a `<line>` de base por `ChartAxis orientation="bottom" ticks={[]}` dentro de um `<g transform="translate(...)">`; as 3 `<polyline>` de série por `ChartLine`; adaptar `toPoints()` para devolver `ChartPoint[]` em vez de string. Manter círculos de dado e todos os `<text>` (série, datas) como filhos manuais de `ChartContainer`. Adicionar classe `.healing-chart__pain-line` em `globals.css` (`stroke-width:1.5; stroke-dasharray:4 3;`) para a série de dor. Remover comentário `// sv-gap: data-chart`.
**Where**: `src/components/healing-chart.tsx`, `src/app/globals.css`
**Depends on**: T1
**Reuses**: `buildChartModel`, `formatDate`, constantes de padding — inalterados
**Requirement**: SV32-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `getByRole("img", { name: "Gráfico de evolução da condição" })` continua presente em todos os cenários de `tests/components/healing-chart.test.tsx` que hoje o afirmam
- [ ] As 3 séries renderizam via elemento com classe `sv-chart__line` (prova de origem — `ChartLine`, não `<polyline>` manual)
- [ ] A linha de base renderiza via elemento com classe `sv-chart__axis` na posição correta (teste de integração novo: verificar `x1`/`y1`/`x2`/`y2` ou o `transform` do `<g>` pai resultam na mesma posição pixel que a `<line>` manual anterior — ver Risks & Concerns do design.md)
- [ ] Série de dor mantém aparência tracejada/fina via `healing-chart__pain-line` (teste verifica presença da classe, já que jsdom não computa CSS de layout)
- [ ] Textos "dor /10", "{areaMax}mm²" e as duas datas continuam recuperáveis por `getByText`
- [ ] Nenhuma ocorrência de `sv-gap: data-chart` restante em `src/`
- [ ] Gate check passa: `npm run typecheck && npm test -- healing-chart`

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(ui): fecha lacuna data-chart com ChartContainer/ChartAxis/ChartLine`

---

### T6: Fechar `dialog-close-label` — `Modal` usa `closeLabel` nativo

**What**: remover `showCloseButton={false}`, remover `<DialogClose aria-label="Fechar"><Icon name="x" /></DialogClose>` manual e o import de `Icon`; `DialogContent` ganha `closeLabel="Fechar"`; reescrever o docstring do componente (referência a AD-015 vira referência a AD-016).
**Where**: `src/components/modal.tsx`
**Depends on**: T1
**Reuses**: nada
**Requirement**: SV32-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `DialogContent` recebe `closeLabel="Fechar"`, não recebe `showCloseButton`
- [ ] `DialogClose`/`Icon` removidos dos imports de `modal.tsx`
- [ ] `tests/components/modal.test.tsx` reescrito nesta mesma task (ver T7 — feito junto porque o componente fica sem teste verde entre T6 isolado e T7; **merge forward** aplicado: T6 e T7 viram uma única task de execução para não deixar `Modal` sem cobertura passando)
- [ ] Gate check passa: `npm run typecheck && npm test -- modal`

**Tests**: unit
**Gate**: quick

**Commit**: (absorvido no commit de T7 — ver nota de merge forward acima)

---

### T7: Ripple — `getByLabelText("Fechar")` → `getByRole("button", { name: "Fechar" })` em toda a suíte

**What**: em `tests/components/modal.test.tsx` (6 ocorrências) e nos 7 arquivos `tests/pages/staff-*.test.tsx` (11 ocorrências — `staff-procedimentos`, `staff-agenda` ×2, `staff-operations` ×3, `staff-faturamento` ×3, `staff-paciente-detail` ×2), trocar toda consulta do botão de fechar do `Modal` de `getByLabelText`/`getAllByLabelText` para `getByRole("button", { name: "Fechar" })`/`getAllByRole`. Reescrever o título e o corpo do teste `"Dado showCloseButton={false}... (AD-015)"` em `modal.test.tsx:38` para refletir `closeLabel="Fechar"` (AD-016) em vez de `showCloseButton={false}`.
**Where**: `tests/components/modal.test.tsx`, `tests/pages/staff-procedimentos.test.tsx`, `tests/pages/staff-agenda.test.tsx`, `tests/pages/staff-operations.test.tsx`, `tests/pages/staff-faturamento.test.tsx`, `tests/pages/staff-paciente-detail.test.tsx`
**Depends on**: T6 (código muda primeiro, senão os testes reescritos falham contra o `Modal` antigo)
**Reuses**: nada
**Requirement**: SV32-07, SV32-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `grep -rn 'getByLabelText("Fechar")\|getAllByLabelText("Fechar")' tests` retorna vazio
- [ ] Todas as 17 ocorrências (6 + 11) substituídas por `getByRole`/`getAllByRole` equivalente
- [ ] `queryByRole("button", { name: "Close dialog" })` em `modal.test.tsx:46` continua ausente do DOM (assert inalterado, ainda válido)
- [ ] Contagem de testes de cada um dos 6 arquivos inalterada — nenhuma asserção removida, só a query trocada
- [ ] Gate check passa: `npm run typecheck && npm test && npm run check:sv`

**Tests**: unit
**Gate**: full

**Commit**: `fix(ui): fecha lacuna dialog-close-label com closeLabel nativo do Modal e atualiza queries de teste`

---

### T8: Arquivar as 6 seções em `docs/still-void-gaps.md`

**What**: remover do corpo ativo as 6 seções `### \`slug\`` (`pagination`, `progress`, `separator`, `data-chart`, `icon-set-gaps`, `dialog-close-label`); adicionar seção "## Histórico — lacunas fechadas pela 3.2.0" no fim do arquivo, com cada slug como `#### slug` (nível 4 — fora do regex `^### \`slug\`` do gate), resumindo o que fechou e citando o commit/task; atualizar cabeçalho (`Status: Fechado`, `Data`, `Versão verificada: 3.2.0`).
**Where**: `docs/still-void-gaps.md`
**Depends on**: T2, T3, T4, T5, T7 (só arquiva depois que todo `sv-gap:` correspondente já saiu do código)
**Reuses**: padrão de blockquote "RESOLVIDO" de `docs/backlog-design-system.md` (adaptado ao nível de cabeçalho que o gate não lê)
**Requirement**: SV32-06, SV32-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `grep -c '^### \`' docs/still-void-gaps.md` retorna `0`
- [ ] `npm run check:sv` reporta `0` achados na checagem `[7]`
- [ ] Seção de histórico presente com as 6 entradas, cada uma citando a versão (`3.2.0`) e o artefato que fechou

**Tests**: none
**Gate**: full

**Commit**: `docs(still-void-gaps): arquiva as 6 lacunas fechadas pela 3.2.0`

---

### T9: Registrar AD-016 em `.specs/STATE.md`

**What**: adicionar entrada `AD-016` documentando que `Modal` usa `closeLabel="Fechar"` nativo da `3.2.0` em vez do botão manual; marcar `AD-015` como `Status: superseded by AD-016` (sem apagar o texto original).
**Where**: `.specs/STATE.md`
**Depends on**: T7
**Reuses**: convenção já usada em AD-008 ("Correção de...")
**Requirement**: SV32-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] AD-016 presente com Decision/Reason/Trade-off/Scope/Date/Status
- [ ] AD-015 tem `Status: superseded by AD-016` (texto original preservado)

**Tests**: none
**Gate**: none (doc-only)

**Commit**: `docs(state): registra AD-016 — Modal usa closeLabel nativo, supersede AD-015`

---

### T10: Verificação final e gate completo

**What**: rodar o gate completo do projeto e confirmar os 12 requisitos (SV32-01..12) fechados; atualizar a tabela de Requirement Traceability em `spec.md` para `Verified`.
**Where**: `.specs/features/still-void-v3.2-migration/spec.md` (só a tabela de traceability)
**Depends on**: T8, T9
**Reuses**: nada
**Requirement**: SV32-12 (e fecha o traceability dos demais)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `npm run typecheck && npm run build && npm test && npm run test:e2e && npm run check:sv` — todos verdes
- [ ] `npm ls @still-void/ui` resolve `3.2.0`
- [ ] Requirement Traceability de `spec.md` com os 12 requisitos `Verified`

**Tests**: none (gate agregado, sem teste novo)
**Gate**: build

**Commit**: nenhum commit de código — é o ponto onde o Verifier independente roda (ver SKILL.md Critical Rules) e escreve `validation.md`

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1

Phase 2 (Parallel entre si, cada uma sequencial internamente):
  T1 complete, then:
    ├── T2 [P]  Pagination
    ├── T3 [P]  Separator
    ├── T4 [P]  Icons
    └── T5 [P]  Chart

Phase 3 (Sequential — toca arquivos de teste compartilhados):
  T2, T3, T4, T5 complete, then:
    T6 ──→ T7

Phase 4 (Sequential — depende de todo código já migrado):
  T7 complete, then:
    T8 ──→ T9

Phase 5 (Sequential):
  T9 complete, then:
    T10 (Verifier independente)
```

**Nota de fases:** 5 fases > 3 — oferta de sub-agente por fase se aplica (ver SKILL.md Sub-Agent Delegation). Fases 2 tem 4 tasks `[P]` sem dependência cruzada (arquivos disjuntos: `load-more-button.tsx`, `login/page.tsx`, `(staff)/page.tsx`+`materiais/page.tsx`, `healing-chart.tsx`+`globals.css`); testes de cada uma são parallel-safe (RTL isolado por `render`/`cleanup`), então `[P]` é válido dentro da fase.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: bump da dependência | 1 config + lockfile | ✅ Granular |
| T2: Pagination | 1 componente | ✅ Granular |
| T3: Separator | 1 página (1 bloco JSX) | ✅ Granular |
| T4: Icons | 2 arquivos, 3 substituições mecânicas idênticas | ✅ Granular (cohesivo — mesmo padrão, mesmo commit) |
| T5: Chart | 1 componente + 1 classe CSS de suporte | ✅ Granular |
| T6+T7: Modal + ripple | 1 componente + 6 arquivos de teste com a MESMA substituição mecânica | ✅ Granular (merge forward documentado — ver nota em T6) |
| T8: doc | 1 arquivo | ✅ Granular |
| T9: STATE.md | 1 entrada de decisão | ✅ Granular |
| T10: verificação | agregação, sem código novo | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Sem seta de entrada | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | T1 | T1 → T4 | ✅ Match |
| T5 | T1 | T1 → T5 | ✅ Match |
| T6 | T1 | T1 → T6 (via Phase 3, após T2-T5 completarem — dependência de fase, não de dado) | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T2, T3, T4, T5, T7 | T2,T3,T4,T5,T7 → T8 (via fim da Phase 3) | ✅ Match |
| T9 | T7 | T7 → T9 (via T8, mesma fase) | ✅ Match |
| T10 | T8, T9 | T8, T9 → T10 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: bump dependência | Entity/config | none | none | ✅ OK |
| T2: Pagination | Componente de apresentação | unit | unit | ✅ OK |
| T3: Separator | Página | unit | unit | ✅ OK |
| T4: Icons | Página | unit | unit | ✅ OK |
| T5: Chart | Componente de apresentação | unit | unit | ✅ OK |
| T6+T7: Modal + ripple | Componente de apresentação | unit | unit | ✅ OK |
| T8: doc | Doc/config | none | none | ✅ OK |
| T9: STATE.md | Doc/config | none | none | ✅ OK |
| T10: verificação | — (agregação) | none | none | ✅ OK |

Nenhuma violação — nenhum "testado em outra task" usado como desculpa; T6/T7 documentam explicitamente o merge forward (T6 sem teste verde isoladamente seria code sem verificação, então a cobertura de `Modal` entra na mesma unidade de execução que a troca de código).
