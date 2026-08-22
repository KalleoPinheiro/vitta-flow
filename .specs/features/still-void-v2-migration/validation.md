# Migração `@still-void/ui` 1.x → 2.0 — Validation

**Date**: 2026-08-22
**Spec**: `.specs/features/still-void-v2-migration/spec.md`
**Diff range**: `284d6fc..HEAD` (33 commits)
**Verifier**: passe independente standalone (`validate.md`), executado após o último commit de task. Sub-agente não foi despachado: o usuário escolheu execução inline e o ambiente proíbe disparar agentes sem pedido explícito — este é o fallback previsto pela skill.

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T1 (bump + imports) | ✅ Done | Reordenado com T2: a ponte não era auto-verificável antes do bump (a `1.1.0` não emite `bg-sv-surface`) |
| T2 (ponte Tailwind) | ✅ Done | Gate empírico corrigido: o Turbopack emite CSS em `.next/static/chunks/`, não `static/css/` |
| T3 (gate executável) | ✅ Done | Nasceu vermelho com 519 achados, como planejado |
| T4–T8 (wrappers) | ✅ Done | — |
| T9 (shell) | ✅ **No-op** | Os 4 arquivos já estavam limpos da feature anterior; só o import do `staff-nav` mudou, em T1. Sem commit próprio |
| T10–T13 (portal + login) | ✅ Done | — |
| T14–T17 (staff operação) | ✅ Done | — |
| T18–T22 (staff gestão) | ✅ Done | — |
| T23–T26 (prontuário) | ✅ Done | — |
| T27–T30 (fechamento) | ✅ Done | — |
| Fix task pós-sensor | ✅ Done | `f28bc41` + `5886fd3` — ver seção do sensor |

---

## Spec-Anchored Acceptance Criteria

### P1: Subir para a v2 sem quebrar a resolução de módulo

| Critério | Resultado definido na spec | Evidência | Result |
| --- | --- | --- | --- |
| AC1 `package.json` declara `^2.0.0` e instalado começa com `2.` | `^2.0.0` / `2.x` | `package.json:12` — `"@still-void/ui": "^2.0.0"`; instalado `2.0.1` | ✅ PASS |
| AC2 `grep from "@still-void/ui"` vazio | zero linhas | gate `check:sv` [1] + `tests/scripts/check-sv-adoption.test.ts:74` — `expect(result.status).toBe(1)` para o caso plantado | ✅ PASS |
| AC3 `@import` de CSS inalterados | byte-idênticos | `git diff 284d6fc..HEAD -- src/app/globals.css` mantém as duas linhas | ✅ PASS |
| AC4 `typecheck` exit 0 | exit 0 | executado, exit 0 | ✅ PASS |
| AC5 `build` exit 0 | exit 0 | exit 0 com `NODE_OPTIONS=--max-old-space-size=6144` (limite de heap **pré-existente**, medido antes de qualquer mudança) | ✅ PASS |
| AC6 `npm test` exit 0, cobertura 90% | exit 0 | 106 arquivos / 1771 testes, 0 falhas; limiares de `vitest.config.ts:60` inalterados | ✅ PASS |

### P1: Trocar reimplementações por componentes do catálogo v2

| Critério | Resultado definido na spec | Evidência | Result |
| --- | --- | --- | --- |
| AC1 zero `<button>` cru não marcado | zero ocorrências | gate [2] verde; discriminação provada em `tests/scripts/check-sv-adoption.test.ts:84` — `expect(result.status).toBe(1)` + `"✗ [<button> cru] 1 achado(s)"` | ✅ PASS |
| AC2 zero `<input>` textual cru não marcado | zero ocorrências | gate [3] verde; `tests/scripts/check-sv-adoption.test.ts:107` | ✅ PASS |
| AC3 `ErrorAlert` → `role="alert"` com a mensagem, via `Alert`/`AlertDescription` | `role=alert` + texto + origem no pacote | `tests/components/feedback.test.tsx:16` — `expect(alert).toHaveTextContent("Falha ao salvar paciente")`; `:24` — `toHaveClass("bg-sv-surface")`; `:31` — `toHaveClass("border-danger")` | ✅ PASS |
| AC4 contrato de a11y do `Modal` preservado | role, aria-modal, rótulo, foco inicial, Escape, backdrop, clique interno, restauração | `modal.test.tsx:79` `toHaveAttribute("aria-modal","true")`; `:114` foco inicial; `:130` Escape 1×; `:55` clique interno `not.toHaveBeenCalled()`; `:150` e `:155` foco restaurado (imediato e após 100 ms); `:35` botão fechar. **Backdrop**: `e2e/modal-dismissao.spec.ts:27` — `page.mouse.click(5,5)` → `not.toBeVisible()` | ✅ PASS |
| AC5 blocos de cartão usam `Card` | `Card` do pacote | `tests/pages/portal.test.tsx:185` — `expect(container.querySelector(".bg-sv-surface")).toBeInTheDocument()`; mutação M7 (volta a div escrita à mão) morta | ✅ PASS |
| AC6 `LoadMoreButton` via `Button`, 1 clique = 1 `onClick` | `Button` da lib + contagem | `load-more-button.test.tsx:30` `toHaveClass("border-sv-border")`; `:41` `toHaveBeenCalledTimes(1)` | ✅ PASS |
| AC7 `LogoutButton` mantém POST + navegação, via `Button variant="ghost"` | fetch + push + refresh | `logout-button.test.tsx:37` `toHaveClass("hover:bg-sv-surface")`; `:60` `refresh` 1× | ✅ PASS |
| AC8 símbolo client-only só em arquivo `"use client"` | zero violações | gate [6] verde; discriminação em `tests/scripts/check-sv-adoption.test.ts:140` | ✅ PASS |

### P1: Registrar as lacunas do catálogo

| Critério | Resultado definido na spec | Evidência | Result |
| --- | --- | --- | --- |
| AC1 cada lacuna com nome, motivo, contagem, exemplos, workaround | os cinco campos | `docs/still-void-gaps.md` — 12 lacunas + 5 defeitos, cada uma com os campos | ✅ PASS |
| AC2 componente listado não consta na export line | ausência verificada | conferido contra `dist/react/index.d.ts` e `dist/react/client/index.d.ts` da `2.0.1`; `grep -c "\bTextarea\b"` etc. = 0 | ✅ PASS |
| AC3 mínimo: Textarea, NativeSelect, Label/Field, Table, Checkbox, RadioGroup, Pagination, Progress, Separator, AlertDialog | os dez presentes | todos presentes; `label`/`field` **coberto de forma indireta** — ver gap abaixo | ⚠️ Spec-precision gap |
| AC4 todo workaround tem `// sv-gap:` ligado ao doc | sincronia nos dois sentidos | gate [7] verde; discriminação em `tests/scripts/check-sv-adoption.test.ts:149` e `:161`; exceção `doc-only` em `:170` | ✅ PASS |

### P2: Um único vocabulário de cor

| Critério | Resultado definido na spec | Evidência | Result |
| --- | --- | --- | --- |
| AC1 `grep` de paleta crua vazio | zero linhas | gate [4] verde; discriminação em `tests/scripts/check-sv-adoption.test.ts:128` | ✅ PASS |
| AC2 `@theme` sem `--color-slate-*`/`--color-teal-*` | zero | gate [5] verde; discriminação em `:` do caso "apelido de volta no @theme" | ✅ PASS |
| AC3 `@theme` define a ponte semântica completa | todos os nomes usados | `src/app/globals.css:29–83`; verificado no CSS emitido: `.bg-sv-surface{background-color:var(--color-sv-surface)}` com `--color-sv-surface:var(--sv-surface)` | ✅ PASS |
| AC4 todo utilitário de cor resolve para token ou é neutro | token ou `black`/`white` | gate [4]; neutros restantes justificados por comentário em `document-frame.tsx`, `documentos/layout.tsx` e nas 3 páginas de documento | ✅ PASS |
| AC5 nenhum valor de cor mudou nos mapeamentos 1:1 | idênticos | `9e87092:globals.css` definia `--color-teal-500: var(--sv-accent)`, `--color-teal-700: var(--sv-accent-ink)`, `--color-slate-50: var(--sv-bg)`, `--color-slate-900: var(--sv-text)`; os alvos do mapeamento (`--color-accent`, `--color-accent-ink`, `--color-bg`, `--color-ink`) apontam para as **mesmas** variáveis | ✅ PASS |

**Status**: ✅ 22/23 ACs com evidência `file:line`; 1 lacuna de precisão de spec (abaixo).

### Lacuna de precisão de spec

**AC P1-3.3** exige que o documento liste `Label`/`Field` entre as lacunas mínimas. O documento
não tem uma seção `### \`label\`` própria: a necessidade está diluída nas seções `native-select`,
`textarea` e `file-input`, que descrevem o padrão `<label>` envolvendo o campo. A spec não define
se "listar `Label`/`Field`" significa seção própria ou menção — os dois são leituras válidas do
critério. Registrado como lacuna de precisão em vez de aprovado em silêncio.

---

## Edge Cases

- [x] **Componente server importa símbolo client-only** — gate [6] pega antes do build; discriminação provada (`check-sv-adoption.test.ts:140`)
- [x] **Radix em jsdom** — os 12 testes de `modal.test.tsx` passam sem polyfill. O `PointerEvent` foi testado e **não resolve** a dismissão por clique fora; a asserção mudou de camada para E2E em vez de ser afrouxada
- [x] **`className` do app vence a do `Button`** — `login.test.tsx:223` — `toHaveClass("bg-accent-ink")` num `<Button>` cuja variante default é `bg-sv-surface`; o `tailwind-merge` interno resolve a favor do app
- [x] **`<button>` cru que precisa sobreviver** — a célula da grade de agenda ficou `<div onClick>` (não é `<button>`, então não é flagrada); os demais workarounds levam `// sv-gap:`
- [x] **Doc de lacunas cita a versão** — "Versão verificada: `@still-void/ui@2.0.1`" no cabeçalho e "ausente em 2.0.1" nas entradas

---

## Discrimination Sensor

15 mutações de comportamento, aplicadas em estado descartável e revertidas.

| # | Arquivo | Mutação | Morto? |
| --- | --- | --- | --- |
| M1 | `src/components/feedback.tsx` | `ErrorAlert` perde `border-danger` (token semântico de erro) | ✅ |
| M2 | `src/components/modal.tsx` | remove `aria-modal="true"` | ✅ |
| M3 | `src/components/modal.tsx` | remove a restauração de foco no desmonte | ✅ |
| M4 | `src/components/modal.tsx` | remove `shadow-none` (volta a sombra da lib) | ✅ |
| M5 | `src/lib/ui.ts` | `accentButton` deixa de ser accent | ✅ |
| M6 | `src/components/load-more-button.tsx` | troca a variante do `Button` | ✅ |
| M7 | `src/app/portal/page.tsx` | volta a div-cartão escrita à mão | ✅ |
| M8 | `scripts/check-sv-adoption.sh` | gate deixa de detectar `<button>` cru | ❌ **Sobreviveu** → fix `f28bc41` → ✅ |
| M9 | `scripts/check-sv-adoption.sh` | gate deixa de detectar paleta crua | ✅ |
| M10 | `scripts/check-sv-adoption.sh` | gate para de honrar a marcação `sv-gap` | ✅ |
| M11 | `scripts/check-sv-adoption.sh` | gate para de exigir sincronia doc → código | ✅ |
| M12 | `scripts/check-sv-adoption.sh` | gate deixa de detectar `<input>` textual cru | ❌ **Sobreviveu** → fix `5886fd3` → ✅ |
| M13 | `scripts/check-sv-adoption.sh` | gate ignora a marcação `sv-gap-doc-only` | ✅ |
| M14 | `scripts/check-sv-adoption.sh` | gate sempre sai com 0 | ✅ |
| M15 | `scripts/check-sv-adoption.sh` | gate passa a tratar `type="email"` como isento | ✅ |

**Profundidade**: lightweight ampliada (15 mutações, contra as 1–3 do default) — o gate concentra o risco desta feature, então recebeu cobertura de mutação própria.

**Dois falsos positivos do próprio sensor, corrigidos e re-medidos:**
1. A revert por `git checkout` de uma primeira rodada apagou a correção ainda não commitada, invalidando a re-verificação de M8. Refeito após commit.
2. A substituição de M13 trocava só a primeira ocorrência do texto (um comentário), sem alterar comportamento. Refeito com alvo na regra `awk`.

**Resultado**: 15/15 mortos após as correções — ✅ PASS

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Nada além do pedido | ✅ — zero mudança em `src/app/api`, `src/domain`, `src/application`, `src/infrastructure`, `src/proxy.ts` (verificado por `git diff --stat`) |
| Sem abstração de uso único | ✅ — `src/lib/ui.ts` tem duas constantes, ambas com ≥7 call sites; nenhum wrapper novo criado |
| Sem "flexibilidade" não pedida | ✅ — a única parametrização (`$SRC`/`$GAPS_DOC` no gate) existe para o teste do próprio gate |
| Só os arquivos da task | ✅ — um commit por task; os marcadores de `<table>` aplicados em lote ficaram parados na árvore até o commit da task de cada arquivo |
| Não "melhorou" código alheio | ✅ — dívida pré-existente de lint (11 achados) deixada intacta e registrada |
| Segue o padrão do repo | ✅ — testes em `Feature / Cenário / Dado-Quando-Então`; wrappers com comentário justificando a existência, como `brand-logo.tsx` já fazia |
| Aprovaria numa revisão sênior | ✅ |
| Asserções mapeiam ACs e não são rasas | ✅ — reforçado após M12, que era exatamente uma asserção rasa |
| Outcome ancorado na spec | ✅ — 22/23; 1 lacuna de precisão sinalizada, não aprovada em silêncio |
| Expectativa de cobertura por camada | ✅ — wrappers e páginas com cenário feliz + erro + vazio; gate com happy + 6 violações + 3 negativos |
| Todo teste mapeia a um requisito | ✅ |
| Diretrizes do projeto seguidas | ✅ — `vitest.config.ts` (limiares 90%), `AGENTS.md`, padrão BDD do `README.md` |

---

## Gate Check

- **Comando**: `npm run typecheck && npm test && npx eslint <arquivos tocados> && NODE_OPTIONS=--max-old-space-size=6144 npm run build` + `bash scripts/check-sv-adoption.sh` + `npx playwright test`
- **Unit**: 106 arquivos, **1771 passaram, 0 falharam, 0 pulados**
- **Antes da feature**: 105 arquivos, 1749 testes
- **Delta**: **+22 testes** (+1 arquivo), nenhuma deleção, nenhuma asserção afrouxada
- **Typecheck**: exit 0
- **Build**: exit 0; `bg-sv-surface` presente no CSS emitido; zero apelido `slate-*`/`teal-*` no chunk final
- **Lint**: 0 achados nos arquivos tocados. O `npm run lint` global sai com 1 por **dívida pré-existente** (1 erro `complexity` em `src/domain/clinical/image-sanitizer.ts` + 10 `no-unused-vars` em 6 arquivos de teste), medida no baseline `284d6fc` antes de qualquer task
- **Gate de adoção**: 519 achados → **0**
- **E2E**: **60 passaram, 4 falharam**

### Integridade das falhas de E2E

As 4 falhas **não são regressão**, e isso foi medido, não presumido: uma worktree em `d917d72`
(o commit que só sobe a versão e corrige os imports, antes de qualquer mudança de UI) falha
**exatamente os mesmos 4 testes**, e só eles.

| Teste | Baseline `d917d72` | HEAD |
| --- | --- | --- |
| `faturamento` :: pacote pré-pago consome sessão | ❌ | ❌ |
| `portal do paciente` :: confirma presença, aceita consentimento e envia foto | ❌ | ❌ |
| `triagem de fotos` :: mantém o plano | ❌ | ❌ |
| `triagem de fotos` :: antecipa retorno | ❌ | ❌ |
| todos os demais (60) | ✅ | ✅ |

Causa provável dos três de foto: `POST /api/portal/patient/photos`
([route.ts:52](../../../src/app/api/portal/patient/photos/route.ts)) exige consentimento vigente
(gate COMP3-01, fase 3), e o helper `uploadPatientPhoto` de `e2e/triagem.spec.ts` envia a foto sem
aceitar o termo — o teste é anterior ao gate. Fora do escopo desta feature; registrado no item 5
de `docs/BACKLOG-DESIGN-SYSTEM.md`.

---

## Requirement Traceability Update

| Requisito | Status anterior | Novo |
| --- | --- | --- |
| SV2-01 … SV2-09 | Implementing | ✅ Verified |
| SV2-10 | Implementing | ⚠️ Verified com lacuna de precisão (AC P1-3.3, `Label`/`Field`) |
| SV2-11 … SV2-13 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 22/23 ACs com o valor asserido batendo o resultado definido na spec; 1 lacuna de precisão sinalizada
**Sensor**: 15/15 mutações mortas (2 sobreviventes na primeira rodada, ambos corrigidos)
**Gate**: 1771 unit passando (+22), typecheck e build verdes, gate de adoção em zero, E2E sem regressão

**O que funciona**: a v2 está instalada e sem nenhum import do entry point removido; os componentes shadcn renderizam com estilo de verdade (a ponte foi verificada no CSS emitido, não presumida); `<button>`, `<input>`, cartão, alerta e diálogo vêm do catálogo; toda cor resolve para um token; as lacunas estão documentadas e amarradas ao código por um gate que agora tem teste próprio.

**Problemas encontrados**: dois testes fracos do gate, achados pelo sensor e corrigidos (`f28bc41`, `5886fd3`); uma lacuna de precisão de spec em AC P1-3.3.

**Fora do escopo, registrado**: 11 achados de lint pré-existentes; heap padrão do Node insuficiente para o build; 4 testes E2E que já falhavam antes.

**Next steps**: revisão humana do diff (33 commits); abrir issues no repositório still-void a partir de `docs/still-void-gaps.md`.
