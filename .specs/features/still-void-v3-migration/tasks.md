# Migração `@still-void/ui` 2.0.1 → 3.1.0 — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and
follow its Execute flow and Critical Rules.** Do not search for skill files by
filesystem path. The skill is the source of truth for the full flow (per-task cycle,
sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/still-void-v3-migration/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerada a partir de `vitest.config.ts` (limiares e coverage.include/exclude, fonte
> da verdade declarada no README), `playwright.config.ts`, `README.md` §"Testes
> (BDD + TDD)" e §"Varredura de segurança", e amostragem de 8 arquivos de teste
> (`tests/pages/staff-{agenda,materiais,paciente-detail,paciente-care-plans,
> operations,relatorios}.test.tsx`, `tests/pages/{login,portal}.test.tsx`,
> `tests/components/modal.test.tsx`, `tests/scripts/check-sv-adoption.test.ts`).
> Guidelines encontradas: `vitest.config.ts` (limiar 90% lines/functions/branches/
> statements), `README.md` (estilo BDD Feature/Cenário/Dado-Quando-Então), AD-013 +
> lição L-011 confirmada (achado de scanner externo só vira trabalho reproduzido
> localmente).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Página/componente de UI (`src/app/**/*.tsx`, `src/components/*.tsx`) | unit (RTL) | Todo comportamento já asserido pela suíte existente continua passando sem afrouxar consulta; nenhuma cobertura nova é exigida por esta migração — é port, não feature (AD-014) | `tests/pages/*.test.tsx`, `tests/components/*.test.tsx` | `npm test` |
| `scripts/check-sv-adoption.sh` (gate) | unit (fixture) | Cada checagem nova (#8–#12) precisa de um caso que planta a violação e prova que o gate a acha, mais o caso limpo — piso herdado das checagens #1–#7 já existentes | `tests/scripts/check-sv-adoption.test.ts` | `npm test` |
| `src/app/documentos/**` (folha impressa) | e2e apenas | Coberta por `README.md`/`vitest.config.ts` como exclusão deliberada de cobertura unitária ("renderização server pura, coberta por E2E"); a migração acrescenta a asserção de que nenhuma classe de token de tema aparece no markup impresso | `e2e/documentos.spec.ts`, `e2e/plano-cuidados.spec.ts` | `npm run test:e2e` |
| Fluxo de usuário ponta a ponta (navegação, formulário, upload) | e2e | Todo spec que hoje passa continua passando; nenhum spec novo é exigido — os 64 casos são a rede de segurança de comportamento de browser real (Radix, `pointerdown`, `<details>`) que jsdom não cobre | `e2e/*.spec.ts` | `npm run test:e2e` |
| `package.json` / `package-lock.json` / `globals.css` (config, sem lógica) | none | Gate de build + `npm audit` confrontado contra o baseline de `fcd6110` (AD-013, L-011) | — | `npm run typecheck && npm run build` |

## Parallelism Assessment

> Gerada a partir de `vitest.config.ts` (sem `pool`/`fileParallelism` customizado →
> default de arquivos em paralelo; comentário em `hookTimeout` confirma migração de
> PGlite por arquivo sob paralelismo, ou seja, isolamento por arquivo) e
> `playwright.config.ts` (`fullyParallel: false`, `workers: 1`, comentário explícito:
> "Banco PGlite em memória é compartilhado por todo o processo do servidor
> principal — rodar specs em paralelo geraria corrida").

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| Unit/component (RTL, sem PGlite) | Yes | Render puro, sem estado compartilhado entre arquivos | amostra de `tests/pages/*.test.tsx` — cada arquivo importa e renderiza sua própria página |
| Unit com PGlite (API/integração) | Yes | Cada arquivo migra sua própria instância PGlite em `beforeAll` | comentário de `hookTimeout` em `vitest.config.ts` |
| `check-sv-adoption.test.ts` (fixture) | Yes | `mkdtempSync` por teste, diretório próprio, `rmSync` no `afterEach` | `tests/scripts/check-sv-adoption.test.ts` |
| E2E (Playwright) | **No** | PGlite único compartilhado pelo processo do servidor principal | `playwright.config.ts`: `fullyParallel: false`, `workers: 1`, comentário explícito |

## Gate Check Commands

> Gerada a partir de `package.json` scripts e `README.md`.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após task que só toca `.tsx`/`.ts` de app ou de gate, sem tocar dependência/CSS global | `npm run typecheck && npm test` |
| Full | Após task que precisa provar fluxo de browser (piloto F2, tasks com upload/rádio/diálogo, fases que fecham um primitivo) | `npm run typecheck && npm test && npm run test:e2e` |
| Build | Após task que toca `package.json`, `globals.css`, ou fecha uma fase (flip de checagem no gate) | `npm run typecheck && npm run build && npm test && npm run check:sv` |

---

## Execution Plan

### Phase 1 — Base (Sequential)

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2 — Piloto vertical (Sequential, depende de F1)

```
T5 → T6
```

### Phase 3 — Campos de texto (Parallel dentro da fase, depende de F2)

```
                ┌→ T7  ─┐
                ├→ T8  ─┤
        T6 ─────┼→ T9  ─┼──→ T13
                ├→ T10 ─┤
                ├→ T11 ─┤
                └→ T12 ─┘
```

### Phase 4 — Escolha e arquivo (depende de F3; T14/T15 sequenciais ao próprio arquivo)

```
                ┌→ T14 (depende também de T10) ─┐
        T13 ────┼→ T15 (depende também de T9)  ─┼──→ T18
                ├→ T16 ─┐                       │
                └→ T17 ─┴───────────────────────┘
```

### Phase 5 — Tabelas (depende de F4)

```
                ┌→ T19 (+T8)  ─┐
                ├→ T20 (+T15) ─┤
                ├→ T21        ─┤
        T18 ────┼→ T22 (+T11) ─┼──→ T26
                ├→ T23        ─┤
                ├→ T24        ─┤
                └→ T25        ─┘
```

### Phase 6 — Botões e superfícies (depende de F5)

```
                ┌→ T27 (+T7)          ─┐
                ├→ T28 (+T19)         ─┤
                ├→ T29 (+T20)         ─┤
        T26 ────┼→ T30 (+T14,T10)     ─┼──→ T35 → T36
                ├→ T31 (+T21)         ─┤
                ├→ T32 (+T22,T24,T23) ─┤
                ├→ T33 (+T12,T16,T17) ─┤
                └→ T34                ─┘
```

### Phase 7 — Ícones (Sequential, depende de F6)

```
T36 → T37
```

### Phase 8 — Lacunas e gate final (Sequential)

```
T37 → T38 → T39
```

---

## Task Breakdown

### T1: Bump `@still-void/ui` para `^3.1.0`

**What**: Atualizar `package.json`/`package-lock.json` para `@still-void/ui@^3.1.0`, instalar, confirmar `typecheck`/`build` verdes (esperado com achados amplos até as fases seguintes — este task só prova que a versão nova resolve e compila, não que o app está migrado).
**Where**: `package.json`, `package-lock.json`
**Depends on**: None
**Reuses**: nenhum — é bump de dependência
**Requirement**: SV3-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `node_modules/@still-void/ui/package.json` reporta `version` iniciando em `3.`
- [x] `npm run typecheck` sai 0
- [x] `npm run build` sai 0

**Tests**: none (config, sem lógica)
**Gate**: build

---

### T2: Ponte Tailwind — `@still-void/ui/tailwind.css`

**What**: Em `src/app/globals.css`, adicionar `@import "@still-void/ui/tailwind.css";` logo após o `@import` de `theme.css`; remover `@source "../../node_modules/@still-void/ui/dist";` e o bloco `--color-sv-*` copiado à mão (`--color-sv-bg`, `--color-sv-surface`, `--color-sv-surface-2`, `--color-sv-text`, `--color-sv-text-2`, `--color-sv-text-3`, `--color-sv-border`, `--color-sv-signal-cyan`). **Manter** `--color-background`, `--color-ring`, `--color-destructive`, `--color-destructive-foreground` — únicos consumidores são `ring-ring`/`ring-offset-background`/etc dentro de `nativeField`, que só morre em T35.
**Where**: `src/app/globals.css`
**Depends on**: T1
**Reuses**: ponte semântica do app (AD-006), preservada intacta
**Requirement**: SV3-20, SV3-21

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `globals.css` contém `@import "@still-void/ui/tailwind.css";`
- [x] `globals.css` não contém mais `@source "../../node_modules/@still-void/ui/dist"` nem os 6 `--color-sv-*` duplicados
- [x] `globals.css` mantém `--color-background`, `--color-ring`, `--color-destructive`, `--color-destructive-foreground` e toda a ponte semântica (`--color-accent`, `--color-ink*`, `--color-border*`, `--color-*-soft`, `--font-*`, `--radius-*`)
- [x] `npm run build` sai 0 e o CSS gerado contém `.bg-sv-surface`/`.border-sv-border`/`.text-sv-text`/`.bg-sv-surface-2` resolvendo para `var(--sv-*)` (inspeção do output do build)

**Tests**: none (CSS, sem lógica de teste automatizado; verificado por build)
**Gate**: build

---

### T3: `Modal` — `showCloseButton={false}` (AD-015)

**What**: Em `src/components/modal.tsx`, passar `showCloseButton={false}` ao `DialogContent`, mantendo o botão próprio (`DialogClose aria-label="Fechar"`) e as duas marcações `sv-gap:` já existentes (`dialog-aria-modal`, `dialog-shadow` — ainda válidas, `dialog-close-button` sai porque a lib agora tem botão, só que o app opta por não usá-lo).
**Where**: `src/components/modal.tsx`
**Depends on**: T1
**Reuses**: `src/components/modal.tsx` (edição, não reescrita)
**Requirement**: SV3-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `DialogContent` recebe `showCloseButton={false}`
- [x] `tests/components/modal.test.tsx` passa sem alteração nas suas asserções de acessibilidade (2 asserções de estilo — classe `bg-sv-surface`→`sv-dialog`, `fixed inset-0`→`.sv-overlay` — foram atualizadas por SPEC_DEVIATION: mudança real da 3.x não listada nas 3 quebras do Problem Statement, ver `tests/components/modal.test.tsx:60-73,89-102`)
- [x] O documento renderizado contém exatamente um elemento com nome acessível `Fechar` e zero com `Close dialog` (novo caso: `tests/components/modal.test.tsx:38-47`)

**Tests**: unit — `tests/components/modal.test.tsx` (já existe, deve continuar verde)
**Gate**: quick

---

### T4: Confronto de dependências novas (AD-013, L-011)

**What**: Rodar `npm ls` e `npm audit` pós-bump; confrontar contra o baseline de `fcd6110` registrado em `.specs/STATE.md`. As 6 dependências novas (`@heroicons/react`, `@radix-ui/react-alert-dialog`, `-dropdown-menu`, `-select`, `-tabs`, `-tooltip`) entram na árvore sem call site — confirmar que nenhuma introduz HIGH/CRITICAL. Se algo aparecer, reproduzir localmente antes de virar task (não "corrigir" por suposição — regra que pegou postcss/sharp fantasma na feature anterior).
**Where**: nenhum arquivo de código — task de verificação
**Depends on**: T1
**Reuses**: procedimento do README §"Varredura de segurança"
**Requirement**: SV3-14

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `npm audit` não reporta HIGH/CRITICAL novo em relação ao baseline de `fcd6110`
- [x] As 4 MODERATE de `esbuild` (AD-009) continuam sendo as únicas, ou o desvio está documentado
- [x] Resultado anotado em `.specs/STATE.md` (linha de baseline atualizada ou nova entrada, conforme o achado)

**Tests**: none
**Gate**: build (`npm audit` como parte do build gate desta task)

---

### T5: Baseline verde de F1

**What**: Rodar a suíte completa (`typecheck`, `build`, `test`, `test:e2e`) sobre o estado pós-F1, antes de iniciar o piloto. Prova que a base (versão + Modal + ponte CSS) não regride nada antes de qualquer troca de primitivo começar.
**Where**: nenhum arquivo — gate de fase
**Depends on**: T2, T3, T4
**Reuses**: comandos já existentes em `package.json`
**Requirement**: SV3-01, SV3-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `npm run typecheck && npm run build && npm test && npm run test:e2e` saem 0
- [x] Cobertura mantém os limiares de 90% (`lines`/`functions`/`branches`/`statements`) — medido: statements 97.3%, branches 93.33%, functions 96.79%, lines 97.39%
- [x] `test:e2e` mantém 64/64 (63 passed + 1 flaky que passou no retry do próprio `retries: 1` do projeto — `export-lgpd.spec.ts`, falha de timing não relacionada a esta migração), incluindo `e2e/portal-paciente.spec.ts`/`portal-parceiro.spec.ts` (nav do `Header` sem regressão — SV3-03, verificado indiretamente já que não há teste unitário de `portal/layout.tsx`, excluído de cobertura por ser `layout.tsx`)

**Tests**: e2e (existente, sem caso novo)
**Gate**: full

**Commit**: `chore(deps): bump @still-void/ui para ^3.1.0, ponte tailwind.css e Modal sem botão duplicado`

---

### T6: Piloto — `conditions-section.tsx`

**What**: Migrar o arquivo mais denso do inventário, provando os 5 padrões de troca de uma vez: 4 `<select>`→`NativeSelect`, 2 `<textarea>`→`Textarea`, 1 `<table>`→família `Table`, 4 `accentButton`→`Button variant="accent"`, 1 `card-as-element`→`Card as="li"`. As marcações `sv-gap:` correspondentes somem deste arquivo (as checagens globais do gate ainda não ligam — outros 24 arquivos seguem com o padrão antigo).
**Where**: `src/app/(staff)/pacientes/[id]/conditions-section.tsx`
**Depends on**: T5
**Reuses**: `NativeSelect`, `Textarea`, `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`, `Button variant="accent"`, `Card as="li"` de `@still-void/ui/react`
**Requirement**: SV3-04, SV3-05, SV3-08, SV3-09, SV3-11, SV3-13, SV3-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Zero `<select`, `<textarea`, `<table`, `accentButton`, `sv-gap: card-as-element` neste arquivo
- [x] `name`, `value`/`defaultValue`, `onChange`, `required`, `disabled` de cada campo trocado preservados
- [x] O `<Card as="li">` continua filho direto de `<ul>`
- [x] `tests/pages/staff-paciente-detail.test.tsx` passa sem afrouxar consulta — 50/50, sem alteração no arquivo de teste
- [x] `npm run test:e2e -- clinico triagem` (specs que exercitam condições clínicas) passam — 7/7

**Tests**: unit — `tests/pages/staff-paciente-detail.test.tsx`; e2e — `e2e/clinico.spec.ts`, `e2e/triagem.spec.ts`
**Gate**: full

**Commit**: `refactor(pacientes): porta conditions-section.tsx para @still-void/ui v3 (piloto)`

---

### T7: Campos de texto — Agenda `[P]`

**What**: `NativeSelect`/`Textarea` em `appointment-form.tsx` (5 select, 1 textarea), `appointment-detail.tsx` (1 select), `agenda/page.tsx` (1 select). Mesmo padrão provado em T6.
**Where**: `src/app/(staff)/agenda/appointment-form.tsx`, `appointment-detail.tsx`, `page.tsx`
**Depends on**: T6
**Reuses**: padrão de T6
**Requirement**: SV3-04, SV3-05, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<select`/`<textarea` cru nestes 3 arquivos
- [ ] Atributos de validação preservados (`name`, `required`, `value`/`onChange`)
- [ ] `tests/pages/staff-agenda.test.tsx` passa

**Tests**: unit — `tests/pages/staff-agenda.test.tsx`
**Gate**: quick

**Commit**: `refactor(agenda): porta <select>/<textarea> para NativeSelect/Textarea`

---

### T8: Campos de texto — Faturamento `[P]`

**What**: `NativeSelect` em `invoice-form.tsx` (1 select), `faturamento/page.tsx` (2 select).
**Where**: `src/app/(staff)/faturamento/invoice-form.tsx`, `page.tsx`
**Depends on**: T6
**Reuses**: padrão de T6
**Requirement**: SV3-04, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<select` cru nestes 2 arquivos
- [ ] `tests/pages/staff-faturamento.test.tsx` passa

**Tests**: unit — `tests/pages/staff-faturamento.test.tsx`
**Gate**: quick

**Commit**: `refactor(faturamento): porta <select> para NativeSelect`

---

### T9: Campos de texto — Materiais `[P]`

**What**: `NativeSelect` em `materiais/page.tsx` (2 select).
**Where**: `src/app/(staff)/materiais/page.tsx`
**Depends on**: T6
**Reuses**: padrão de T6
**Requirement**: SV3-04, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<select` cru neste arquivo
- [ ] `tests/pages/staff-materiais.test.tsx` passa

**Tests**: unit — `tests/pages/staff-materiais.test.tsx`
**Gate**: quick

**Commit**: `refactor(materiais): porta <select> para NativeSelect`

---

### T10: Campos de texto — Prontuário `[P]`

**What**: `NativeSelect`/`Textarea` em `patient-form.tsx` (1 select, 1 textarea), `care-plans-section.tsx` (1 select, 1 textarea — os 3 grupos de rádio ficam para T14), `evolutions-section.tsx` (1 textarea), `anamnesis-section.tsx` (1 textarea).
**Where**: `src/app/(staff)/pacientes/patient-form.tsx`, `[id]/care-plans-section.tsx`, `[id]/evolutions-section.tsx`, `[id]/anamnesis-section.tsx`
**Depends on**: T6
**Reuses**: padrão de T6
**Requirement**: SV3-04, SV3-05, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<select`/`<textarea` cru nestes 4 arquivos (rádio de `care-plans-section.tsx` permanece — é escopo de T14)
- [ ] `tests/pages/staff-paciente-detail.test.tsx` e `tests/pages/staff-paciente-care-plans.test.tsx` passam

**Tests**: unit — `staff-paciente-detail.test.tsx`, `staff-paciente-care-plans.test.tsx`
**Gate**: quick

**Commit**: `refactor(prontuario): porta <select>/<textarea> para NativeSelect/Textarea`

---

### T11: Campos de texto — Operações `[P]`

**What**: `NativeSelect` em `configuracoes/page.tsx` (1 select), `auditoria/page.tsx` (1 select).
**Where**: `src/app/(staff)/configuracoes/page.tsx`, `auditoria/page.tsx`
**Depends on**: T6
**Reuses**: padrão de T6
**Requirement**: SV3-04, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<select` cru nestes 2 arquivos
- [ ] `tests/pages/staff-operations.test.tsx` passa

**Tests**: unit — `tests/pages/staff-operations.test.tsx`
**Gate**: quick

**Commit**: `refactor(operacoes): porta <select> para NativeSelect`

---

### T12: Campos de texto — Portal `[P]`

**What**: `NativeSelect` em `schedule-return.tsx` (1 select).
**Where**: `src/app/portal/schedule-return.tsx`
**Depends on**: T6
**Reuses**: padrão de T6
**Requirement**: SV3-04, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<select` cru neste arquivo
- [ ] `tests/pages/portal.test.tsx` passa
- [ ] `npm run test:e2e -- followup` passa

**Tests**: unit — `tests/pages/portal.test.tsx`; e2e — `e2e/followup.spec.ts`
**Gate**: full

**Commit**: `refactor(portal): porta <select> para NativeSelect`

---

### T13: Gate — liga checagens `<select>`/`<textarea>` cru

**What**: Estender `scripts/check-sv-adoption.sh` com as checagens #8 (`<select` cru) e #9 (`<textarea` cru), seguindo o padrão AWK das checagens #2/#3 (guarda de linha-comentário, isenção por `sv-gap:` na linha anterior). Registrar o baseline pré-migração (23/7) no cabeçalho do script, como já é a convenção. Estender `tests/scripts/check-sv-adoption.test.ts` com um caso por checagem nova (planta violação em fixture, prova que o gate acha) mais o caso limpo.
**Where**: `scripts/check-sv-adoption.sh`, `tests/scripts/check-sv-adoption.test.ts`
**Depends on**: T7, T8, T9, T10, T11, T12
**Reuses**: `report()`, `tsx_files()`, guarda de comentário existentes no script
**Requirement**: SV3-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `npm run check:sv` reporta as checagens #8 e #9 como `✓` (zero achado) contra o app real
- [ ] `tests/scripts/check-sv-adoption.test.ts` cobre as 2 checagens novas: 1 caso que planta `<select>`/`<textarea>` cru e prova que o gate acha, 1 caso limpo
- [ ] `npm test` passa com a contagem de testes aumentada (sem deleção silenciosa)

**Tests**: unit — `tests/scripts/check-sv-adoption.test.ts` (2+ casos novos)
**Gate**: build

**Commit**: `test(check-sv): liga checagens de <select>/<textarea> cru no gate de adoção`

---

### T14: Escolha — `RadioGroup` em `care-plans-section.tsx`

**What**: Reestruturar os 3 grupos de rádio (`type`, e os dois de `care-plans-section.tsx:879,935`) de `<input type="radio">` aninhado em `<label>` para `RadioGroupItem` como **filho direto** de `RadioGroup`, com o rótulo movido para `children` do item e o `<legend className="sr-only">` substituído por `legend`+`legendHidden`. Esta é a única troca do port com mudança estrutural real (design.md, Risks & Concerns).
**Where**: `src/app/(staff)/pacientes/[id]/care-plans-section.tsx`
**Depends on**: T13, T10
**Reuses**: `RadioGroup`, `RadioGroupItem` de `@still-void/ui/react`
**Requirement**: SV3-06, SV3-11, SV3-15

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Os 3 grupos usam `RadioGroup`/`RadioGroupItem` com o item como filho direto
- [ ] Cada `RadioGroup` mantém `legend` com o texto atual do `<legend className="sr-only">`, via `legendHidden`
- [ ] Selecionar um item desmarca os demais do mesmo `name` — teste de comportamento novo cobrindo isso
- [ ] `tests/pages/staff-paciente-care-plans.test.tsx` passa

**Tests**: unit — `tests/pages/staff-paciente-care-plans.test.tsx` (caso novo: exclusividade mútua do grupo)
**Gate**: quick

**Commit**: `refactor(care-plans): reestrutura grupos de rádio para RadioGroup/RadioGroupItem`

---

### T15: Escolha — `Checkbox` em `materiais/page.tsx`

**What**: `<input type="checkbox">` → `Checkbox` no ponto "Insumo ativo".
**Where**: `src/app/(staff)/materiais/page.tsx`
**Depends on**: T13, T9
**Reuses**: `Checkbox` de `@still-void/ui/react`
**Requirement**: SV3-06, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `type="checkbox"` cru neste arquivo
- [ ] `checked`/`onChange` preservados, associação com o texto "Insumo ativo" mantida
- [ ] `tests/pages/staff-materiais.test.tsx` passa

**Tests**: unit — `tests/pages/staff-materiais.test.tsx`
**Gate**: quick

**Commit**: `refactor(materiais): porta checkbox "Insumo ativo" para Checkbox`

---

### T16: Escolha — `FileInput` em `condition-photos.tsx`

**What**: `<label>` + `<input type="file" className="hidden">` → `FileInput`. Mudança visual aprovada: a afordância deixa de ser link e passa a ser o controle de arquivo nativo estilizado.
**Where**: `src/app/(staff)/pacientes/[id]/condition-photos.tsx`
**Depends on**: T13
**Reuses**: `FileInput` de `@still-void/ui/react`
**Requirement**: SV3-06, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `type="file"` cru neste arquivo
- [ ] `accept`, `disabled`, `onChange` (incluindo o reset `e.target.value = ""` pós-envio) preservados
- [ ] `tests/pages/staff-paciente-detail.test.tsx` passa

**Tests**: unit — `tests/pages/staff-paciente-detail.test.tsx`
**Gate**: quick

**Commit**: `refactor(pacientes): porta upload de foto para FileInput`

---

### T17: Escolha — `FileInput` em `consent-card.tsx`

**What**: Mesmo padrão de T16, no upload remoto de foto pelo paciente.
**Where**: `src/app/portal/consent-card.tsx`
**Depends on**: T13
**Reuses**: `FileInput` de `@still-void/ui/react`
**Requirement**: SV3-06, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `type="file"` cru neste arquivo
- [ ] `accept`, `disabled`, `onChange` preservados
- [ ] `tests/pages/portal.test.tsx` passa
- [ ] `npm run test:e2e -- portal-paciente` passa

**Tests**: unit — `tests/pages/portal.test.tsx`; e2e — `e2e/portal-paciente.spec.ts`
**Gate**: full

**Commit**: `refactor(portal): porta upload remoto de foto para FileInput`

---

### T18: Gate — liga checagem `<input type="file|checkbox|radio">` cru

**What**: Estender `scripts/check-sv-adoption.sh` com a checagem #10 e `tests/scripts/check-sv-adoption.test.ts` com o caso correspondente. Baseline pré-migração: 2/1/3.
**Where**: `scripts/check-sv-adoption.sh`, `tests/scripts/check-sv-adoption.test.ts`
**Depends on**: T14, T15, T16, T17
**Reuses**: padrão de T13
**Requirement**: SV3-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `npm run check:sv` reporta a checagem #10 como `✓`
- [ ] Fixture novo prova que o gate acha `type="file"`/`checkbox`/`radio` cru
- [ ] `npm test` passa

**Tests**: unit — `tests/scripts/check-sv-adoption.test.ts`
**Gate**: build

**Commit**: `test(check-sv): liga checagem de input file/checkbox/radio cru no gate`

---

### T19: Tabelas — Faturamento `[P]`

**What**: `<table>` → família `Table` em `faturamento/page.tsx`. Onde `<Card className="overflow-x-auto">` só existia para dar rolagem, remover o `overflow-x-auto` — `sv-table-container` já rola.
**Where**: `src/app/(staff)/faturamento/page.tsx`
**Depends on**: T18, T8
**Reuses**: `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` de `@still-void/ui/react`
**Requirement**: SV3-08, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<table` cru neste arquivo
- [ ] Mesma contagem e ordem de colunas/células de hoje
- [ ] `tests/pages/staff-faturamento.test.tsx` passa

**Tests**: unit — `tests/pages/staff-faturamento.test.tsx`
**Gate**: quick

**Commit**: `refactor(faturamento): porta <table> para família Table`

---

### T20: Tabelas — Materiais `[P]`

**What**: `<table>` → família `Table` em `materiais/page.tsx`.
**Where**: `src/app/(staff)/materiais/page.tsx`
**Depends on**: T18, T15
**Reuses**: família `Table`
**Requirement**: SV3-08, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<table` cru neste arquivo
- [ ] `tests/pages/staff-materiais.test.tsx` passa

**Tests**: unit — `tests/pages/staff-materiais.test.tsx`
**Gate**: quick

**Commit**: `refactor(materiais): porta <table> para família Table`

---

### T21: Tabelas — Procedimentos `[P]`

**What**: `<table>` → família `Table` em `procedimentos/page.tsx`.
**Where**: `src/app/(staff)/procedimentos/page.tsx`
**Depends on**: T18
**Reuses**: família `Table`
**Requirement**: SV3-08, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<table` cru neste arquivo
- [ ] `tests/pages/staff-procedimentos.test.tsx` passa

**Tests**: unit — `tests/pages/staff-procedimentos.test.tsx`
**Gate**: quick

**Commit**: `refactor(procedimentos): porta <table> para família Table`

---

### T22: Tabelas — Operações `[P]`

**What**: `<table>` → família `Table` em `configuracoes/page.tsx` e `auditoria/page.tsx`.
**Where**: `src/app/(staff)/configuracoes/page.tsx`, `auditoria/page.tsx`
**Depends on**: T18, T11
**Reuses**: família `Table`
**Requirement**: SV3-08, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<table` cru nestes 2 arquivos
- [ ] `tests/pages/staff-operations.test.tsx` passa

**Tests**: unit — `tests/pages/staff-operations.test.tsx`
**Gate**: quick

**Commit**: `refactor(operacoes): porta <table> para família Table`

---

### T23: Tabelas — Relatórios `[P]`

**What**: 2 `<table>` → família `Table` em `relatorios/page.tsx`.
**Where**: `src/app/(staff)/relatorios/page.tsx`
**Depends on**: T18
**Reuses**: família `Table`
**Requirement**: SV3-08, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<table` cru neste arquivo
- [ ] `tests/pages/staff-relatorios.test.tsx` passa

**Tests**: unit — `tests/pages/staff-relatorios.test.tsx`
**Gate**: quick

**Commit**: `refactor(relatorios): porta <table> para família Table`

---

### T24: Tabelas — Pacientes/Parceiros/Profissionais `[P]`

**What**: `<table>` → família `Table` em `pacientes/page.tsx`, `parceiros/page.tsx`, `profissionais/page.tsx`.
**Where**: `src/app/(staff)/pacientes/page.tsx`, `parceiros/page.tsx`, `profissionais/page.tsx`
**Depends on**: T18
**Reuses**: família `Table`
**Requirement**: SV3-08, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<table` cru nestes 3 arquivos
- [ ] `tests/pages/staff-pacientes-list.test.tsx` e `tests/pages/staff-operations.test.tsx` passam

**Tests**: unit — `staff-pacientes-list.test.tsx`, `staff-operations.test.tsx`
**Gate**: quick

**Commit**: `refactor(pacientes,equipe): porta <table> para família Table`

---

### T25: Tabelas — Documentos impressos (override neutro)

**What**: 3 `<table>` (2 em `plano-cuidados/[carePlanId]/page.tsx`, 1 em `relatorio/[conditionId]/page.tsx`) → família `Table` com `className` neutro (`border-black`, `text-black`) preservando a folha em preto (decisão do usuário, design.md). Mantém o comentário exigido por AD-006 explicando a exceção.
**Where**: `src/app/documentos/plano-cuidados/[carePlanId]/page.tsx`, `src/app/documentos/relatorio/[conditionId]/page.tsx`
**Depends on**: T18
**Reuses**: família `Table` + padrão de exceção neutra já usado em `src/components/document-frame.tsx`
**Requirement**: SV3-08, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `<table` cru nestes 2 arquivos
- [ ] O markup renderizado não contém nenhuma classe de token de tema (`border-sv-*`, `text-sv-*` etc.) — só `border-black`/`text-black`
- [ ] `npm run test:e2e -- documentos plano-cuidados` passa, folha continua em preto

**Tests**: e2e — `e2e/documentos.spec.ts`, `e2e/plano-cuidados.spec.ts` (excluído de cobertura unitária por `vitest.config.ts`)
**Gate**: full

**Commit**: `refactor(documentos): porta <table> para família Table com override neutro de impressão`

---

### T26: Gate — liga checagem `<table>` cru

**What**: Estender `scripts/check-sv-adoption.sh` com a checagem #11 e `tests/scripts/check-sv-adoption.test.ts` com o caso correspondente. Baseline pré-migração: 14.
**Where**: `scripts/check-sv-adoption.sh`, `tests/scripts/check-sv-adoption.test.ts`
**Depends on**: T19, T20, T21, T22, T23, T24, T25
**Reuses**: padrão de T13
**Requirement**: SV3-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `npm run check:sv` reporta a checagem #11 como `✓`
- [ ] Fixture novo prova que o gate acha `<table>` cru
- [ ] `npm test` passa

**Tests**: unit — `tests/scripts/check-sv-adoption.test.ts`
**Gate**: build

**Commit**: `test(check-sv): liga checagem de <table> cru no gate`

---

### T27: Botões — Agenda `[P]`

**What**: `accentButton` → `Button variant="accent"` em `agenda/page.tsx`, `appointment-form.tsx`, `appointment-detail.tsx`. `className` adicional (largura/espaçamento) sobrevive.
**Where**: `src/app/(staff)/agenda/page.tsx`, `appointment-form.tsx`, `appointment-detail.tsx`
**Depends on**: T26, T7
**Reuses**: `Button variant="accent"`
**Requirement**: SV3-09, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `accentButton` nestes 3 arquivos
- [ ] `type`, `disabled`, `onClick`, texto acessível preservados
- [ ] `tests/pages/staff-agenda.test.tsx` passa

**Tests**: unit — `tests/pages/staff-agenda.test.tsx`
**Gate**: quick

**Commit**: `refactor(agenda): porta accentButton para Button variant="accent"`

---

### T28: Botões — Faturamento `[P]`

**What**: `accentButton` → `Button variant="accent"` em `faturamento/page.tsx`, `invoice-form.tsx`.
**Where**: `src/app/(staff)/faturamento/page.tsx`, `invoice-form.tsx`
**Depends on**: T26, T19
**Reuses**: `Button variant="accent"`
**Requirement**: SV3-09, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `accentButton` nestes 2 arquivos
- [ ] `tests/pages/staff-faturamento.test.tsx` passa

**Tests**: unit — `tests/pages/staff-faturamento.test.tsx`
**Gate**: quick

**Commit**: `refactor(faturamento): porta accentButton para Button variant="accent"`

---

### T29: Botões — Materiais `[P]`

**What**: `accentButton` → `Button variant="accent"` em `materiais/page.tsx`.
**Where**: `src/app/(staff)/materiais/page.tsx`
**Depends on**: T26, T20
**Reuses**: `Button variant="accent"`
**Requirement**: SV3-09, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `accentButton` neste arquivo
- [ ] `tests/pages/staff-materiais.test.tsx` passa

**Tests**: unit — `tests/pages/staff-materiais.test.tsx`
**Gate**: quick

**Commit**: `refactor(materiais): porta accentButton para Button variant="accent"`

---

### T30: Botões e superfícies — Prontuário `[P]`

**What**: `accentButton` → `Button variant="accent"` em `care-plans-section.tsx` (7), `evolutions-section.tsx` (3), `anamnesis-section.tsx` (2), `patient-form.tsx` (2). `card-as-element` → `Card as` em `care-plans-section.tsx` (1), `evolutions-section.tsx` (1).
**Where**: `src/app/(staff)/pacientes/[id]/care-plans-section.tsx`, `evolutions-section.tsx`, `anamnesis-section.tsx`, `patient-form.tsx`
**Depends on**: T26, T14, T10
**Reuses**: `Button variant="accent"`, `Card as`
**Requirement**: SV3-09, SV3-11, SV3-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `accentButton`/`sv-gap: card-as-element` nestes 4 arquivos
- [ ] `tests/pages/staff-paciente-detail.test.tsx` e `tests/pages/staff-paciente-care-plans.test.tsx` passam

**Tests**: unit — `staff-paciente-detail.test.tsx`, `staff-paciente-care-plans.test.tsx`
**Gate**: quick

**Commit**: `refactor(prontuario): porta accentButton/card-as-element para Button/Card`

---

### T31: Botões — Procedimentos `[P]`

**What**: `accentButton` → `Button variant="accent"` em `procedimentos/page.tsx`.
**Where**: `src/app/(staff)/procedimentos/page.tsx`
**Depends on**: T26, T21
**Reuses**: `Button variant="accent"`
**Requirement**: SV3-09, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `accentButton` neste arquivo
- [ ] `tests/pages/staff-procedimentos.test.tsx` passa

**Tests**: unit — `tests/pages/staff-procedimentos.test.tsx`
**Gate**: quick

**Commit**: `refactor(procedimentos): porta accentButton para Button variant="accent"`

---

### T32: Botões e superfícies — Operações e Relatórios `[P]`

**What**: `accentButton` → `Button variant="accent"` em `configuracoes/page.tsx` (5), `parceiros/page.tsx` (3), `profissionais/page.tsx` (3). `card-as-element` → `Card as` em `configuracoes/page.tsx` (2), `relatorios/page.tsx` (3).
**Where**: `src/app/(staff)/configuracoes/page.tsx`, `parceiros/page.tsx`, `profissionais/page.tsx`, `relatorios/page.tsx`
**Depends on**: T26, T22, T24, T23
**Reuses**: `Button variant="accent"`, `Card as`
**Requirement**: SV3-09, SV3-11, SV3-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `accentButton`/`sv-gap: card-as-element` nestes 4 arquivos
- [ ] `tests/pages/staff-operations.test.tsx` e `tests/pages/staff-relatorios.test.tsx` passam

**Tests**: unit — `staff-operations.test.tsx`, `staff-relatorios.test.tsx`
**Gate**: quick

**Commit**: `refactor(operacoes,relatorios): porta accentButton/card-as-element para Button/Card`

---

### T33: Botões e superfícies — Portal `[P]`

**What**: `accentButton` → `Button variant="accent"` em `schedule-return.tsx` (2), `consent-card.tsx` (3), `patient-view.tsx` (2). `card-as-element` → `Card as="section"` com override de cor de alerta em `consent-card.tsx` (1) — permanece `Card`, não vira `Alert` (AD-014).
**Where**: `src/app/portal/schedule-return.tsx`, `consent-card.tsx`, `patient-view.tsx`
**Depends on**: T26, T12, T16, T17
**Reuses**: `Button variant="accent"`, `Card as`
**Requirement**: SV3-09, SV3-11, SV3-17

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `accentButton`/`sv-gap: card-as-element` nestes 3 arquivos
- [ ] O `Card as="section"` de `consent-card.tsx` mantém a cor de alerta (`border-warning`/`bg-warning-soft`) via `className`
- [ ] `tests/pages/portal.test.tsx` passa
- [ ] `npm run test:e2e -- portal-paciente followup` passa

**Tests**: unit — `tests/pages/portal.test.tsx`; e2e — `e2e/portal-paciente.spec.ts`, `e2e/followup.spec.ts`
**Gate**: full

**Commit**: `refactor(portal): porta accentButton/card-as-element para Button/Card`

---

### T34: Botões — Login `[P]`

**What**: `accentButton` → `Button variant="accent"` em `login/page.tsx`.
**Where**: `src/app/login/page.tsx`
**Depends on**: T26
**Reuses**: `Button variant="accent"`
**Requirement**: SV3-09, SV3-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `accentButton` neste arquivo
- [ ] `tests/pages/login.test.tsx` passa
- [ ] `npm run test:e2e -- auth` passa

**Tests**: unit — `tests/pages/login.test.tsx`; e2e — `e2e/auth.spec.ts`
**Gate**: full

**Commit**: `refactor(login): porta accentButton para Button variant="accent"`

---

### T35: Apagar `src/lib/ui.ts` e tokens órfãos

**What**: Remover `src/lib/ui.ts` por inteiro. Remover de `src/app/globals.css` os 4 tokens que só `nativeField` consumia: `--color-background`, `--color-ring`, `--color-destructive`, `--color-destructive-foreground`.
**Where**: `src/lib/ui.ts` (deletado), `src/app/globals.css`
**Depends on**: T27, T28, T29, T30, T31, T32, T33, T34
**Reuses**: nenhum — é remoção
**Requirement**: SV3-07, SV3-21

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `src/lib/ui.ts` não existe
- [ ] `grep -rn "nativeField\|accentButton" src` retorna vazio
- [ ] `globals.css` não contém mais os 4 tokens órfãos
- [ ] `npm run build` sai 0

**Tests**: none (remoção; cobertura das páginas já provada pelas tasks anteriores)
**Gate**: build

**Commit**: `refactor(ui): remove src/lib/ui.ts e tokens órfãos do @theme`

---

### T36: Gate — liga checagem `accentButton`/`nativeField`/existência de `src/lib/ui.ts`

**What**: Estender `scripts/check-sv-adoption.sh` com a checagem #12 (`accentButton`, `nativeField`, e falha se `src/lib/ui.ts` existir) e `tests/scripts/check-sv-adoption.test.ts` com o caso correspondente. Baseline pré-migração: 59/45/1.
**Where**: `scripts/check-sv-adoption.sh`, `tests/scripts/check-sv-adoption.test.ts`
**Depends on**: T35
**Reuses**: padrão de T13
**Requirement**: SV3-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `npm run check:sv` reporta a checagem #12 como `✓`
- [ ] Fixture novo prova que o gate acha `accentButton`/`nativeField`/`src/lib/ui.ts`
- [ ] `npm test` passa

**Tests**: unit — `tests/scripts/check-sv-adoption.test.ts`
**Gate**: build

**Commit**: `test(check-sv): liga checagem de accentButton/nativeField/lib-ui no gate`

---

### T37: Ícones — glifos cobertos viram `Icon`

**What**: `✕`→`Icon name="x"` (`modal.tsx`), `⚠`→`Icon name="alert-triangle"` (3 ocorrências), `✓`→`Icon name="check-circle"` (`consent-card.tsx`), `←`/`→` classificados um a um: os que são afordância de navegação (paginação, voltar) viram `Icon name="chevron-left"`/`"chevron-right"`; os que são ligação tipográfica em texto corrido (`"Triagem → Consulta"`) permanecem. `label` só quando o ícone é a única informação do controle. `📷`/`⛔`/`⏳` permanecem, marcados `sv-gap: icon-set-gaps`. `−`/`≤` permanecem sem marcação (notação matemática, não ícone).
**Where**: `src/components/modal.tsx`, `src/app/portal/consent-card.tsx`, e os demais arquivos com `⚠`/`←`/`→` listados no inventário da spec (`src/app/(staff)/page.tsx`, `pacientes/[id]/page.tsx`, `care-plans-section.tsx`, `agenda/page.tsx`, `materiais/page.tsx`, `documentos/layout.tsx`, `documentos/plano-cuidados/[carePlanId]/page.tsx`, `document-frame.tsx`, `paged-list.tsx`)
**Depends on**: T36
**Reuses**: `Icon` de `@still-void/ui/react`
**Requirement**: SV3-18, SV3-19

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Zero `✕`/`⚠`/`✓` em `src/**/*.tsx`
- [ ] Cada `←`/`→` remanescente é ligação tipográfica em texto corrido, não afordância de controle
- [ ] `📷`/`⛔`/`⏳` marcados `sv-gap: icon-set-gaps`
- [ ] `tests/components/modal.test.tsx` e as suítes de página tocadas passam

**Tests**: unit — `tests/components/modal.test.tsx` + suítes de página dos arquivos tocados
**Gate**: quick

**Commit**: `refactor(icons): porta glifos cobertos pelo IconName para Icon`

---

### T38: `docs/still-void-gaps.md` para a `3.1.0`

**What**: Reescrever o documento: remover as 14 seções fechadas (`native-select`, `textarea`, `table`, `checkbox`, `radio-group`, `file-input`, `card-as-element`, `button-accent-variant`, `alert-dialog`, `dialog-shadow`, `dialog-close-button`, `dialog-aria-modal`, `badge-hardcoded-red`, `tailwind-setup-v3-only`); atualizar "Versão verificada" para `3.1.0`; manter e reconferir `pagination`, `progress`, `separator`, `data-chart` contra a export line da `3.1.0`; adicionar `dialog-close-label` (marcada `sv-gap-doc-only` — é configuração, não workaround) e `icon-set-gaps` (pareada com as marcações de T37).
**Where**: `docs/still-void-gaps.md`
**Depends on**: T37
**Reuses**: formato e convenção `sv-gap-doc-only` já existentes no documento
**Requirement**: SV3-10, SV3-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] "Versão verificada" = `@still-void/ui@3.1.0`
- [ ] Nenhuma das 14 seções fechadas permanece
- [ ] As 4 lacunas remanescentes reconferidas contra a export line da `3.1.0`
- [ ] `dialog-close-label` e `icon-set-gaps` presentes e pareadas com o código
- [ ] `npm run check:sv` sai 0, zero `sv-gap` órfão nos dois sentidos

**Tests**: none (documento; verificado pela checagem #7 do gate, já existente)
**Gate**: build

**Commit**: `docs(still-void-gaps): atualiza lacunas para a versão verificada 3.1.0`

---

### T39: Gate final e fechamento

**What**: Rodar a suíte completa uma última vez; atualizar a tabela de rastreabilidade de `spec.md` (todo `SV3-*` de `Pending` para `Verified`/`Implementado`); atualizar `.specs/STATE.md` (Handoff: feature concluída; baseline final medido).
**Where**: `.specs/features/still-void-v3-migration/spec.md`, `.specs/STATE.md`
**Depends on**: T38
**Reuses**: nenhum — fechamento de feature
**Requirement**: todos os `SV3-*`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `npm run typecheck && npm run build && npm test && npm run test:e2e && npm run check:sv` saem 0
- [ ] Cobertura ≥ 90% em `lines`/`functions`/`branches`/`statements`
- [ ] `test:e2e` em 64/64
- [ ] `spec.md` com os 21 requisitos marcados `Verified`
- [ ] `STATE.md` Handoff atualizado

**Tests**: full suite (nenhum caso novo)
**Gate**: build

**Commit**: `chore(still-void): fecha migração para @still-void/ui v3.1.0`

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2 ──→ T3 ──→ T4 ──→ T5

Phase 2 (Sequential, depende de F1):
  T5 ──→ T6

Phase 3 (Parallel, depende de F2):
  T6 completo, então:
    ├── T7  [P]
    ├── T8  [P]
    ├── T9  [P]
    ├── T10 [P]  } Podem rodar simultaneamente
    ├── T11 [P]
    └── T12 [P]
  T7..T12 completos, então:
    T13 (gate, sequencial)

Phase 4 (Parallel, depende de F3):
  T13 completo, então:
    ├── T14 [P] (também depende de T10)
    ├── T15 [P] (também depende de T9)
    ├── T16 [P]
    └── T17 [P]
  T14..T17 completos, então:
    T18 (gate, sequencial)

Phase 5 (Parallel, depende de F4):
  T18 completo, então:
    ├── T19 [P] (também depende de T8)
    ├── T20 [P] (também depende de T15)
    ├── T21 [P]
    ├── T22 [P] (também depende de T11)
    ├── T23 [P]
    ├── T24 [P]
    └── T25 [P]
  T19..T25 completos, então:
    T26 (gate, sequencial)

Phase 6 (Parallel, depende de F5):
  T26 completo, então:
    ├── T27 [P] (também depende de T7)
    ├── T28 [P] (também depende de T19)
    ├── T29 [P] (também depende de T20)
    ├── T30 [P] (também depende de T14, T10)
    ├── T31 [P] (também depende de T21)
    ├── T32 [P] (também depende de T22, T24, T23)
    ├── T33 [P] (também depende de T12, T16, T17)
    └── T34 [P]
  T27..T34 completos, então:
    T35 ──→ T36

Phase 7 (Sequential, depende de F6):
  T36 ──→ T37

Phase 8 (Sequential):
  T37 ──→ T38 ──→ T39
```

**Parallelism constraint:** Toda task `[P]` acima cumpre as três condições: sem
dependência não resolvida dentro da fase, tipo de teste requerido é parallel-safe
(unit/RTL — ver Parallelism Assessment), sem estado mutável compartilhado com outra
task `[P]` da mesma fase (arquivos distintos, exceto onde a dependência extra —
"também depende de T—" — declara o compartilhamento e ordena as duas).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 Bump versão | 1 dependência | ✅ Granular |
| T2 Ponte Tailwind | 1 arquivo CSS | ✅ Granular |
| T3 Modal showCloseButton | 1 componente | ✅ Granular |
| T4 Confronto de dependências | 1 verificação | ✅ Granular |
| T5 Baseline F1 | 1 gate | ✅ Granular |
| T6 Piloto conditions-section | 1 arquivo, 5 padrões já provados individualmente no design | ✅ Granular (cohesivo — é o piloto por desenho) |
| T7–T12 | 1–4 arquivos por área, 1 padrão (campo de texto) | ✅ Granular (cohesivo por suíte de teste compartilhada) |
| T13, T18, T26, T36 | 1 script + 1 arquivo de teste, 1–2 checagens | ✅ Granular |
| T14 RadioGroup | 1 arquivo, 1 padrão (mudança estrutural única) | ✅ Granular |
| T15–T17 | 1 arquivo cada | ✅ Granular |
| T19–T25 | 1–3 arquivos por área, 1 padrão (tabela) | ✅ Granular (cohesivo) |
| T27–T34 | 1–4 arquivos por área, 1–2 padrões (botão + card, mesma categoria de estilo) | ✅ Granular (cohesivo) |
| T35 Apagar lib/ui.ts | 2 arquivos, 1 remoção | ✅ Granular |
| T37 Ícones | múltiplos arquivos, 1 padrão semântico único | ✅ Granular (cohesivo — mesma transformação uniforme, como uma regra de lint) |
| T38 Docs de lacunas | 1 arquivo | ✅ Granular |
| T39 Fechamento | 2 arquivos, 1 gate | ✅ Granular |

Nenhuma task excede "1–4 arquivos com 1 padrão de troca já provado pelo piloto (T6)" —
o piloto é o que absorve a complexidade de misturar padrões; toda task horizontal
depois dele é mecânica.

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T1 | T1→T3 (via T2→T3 sequencial no diagrama de fase; corpo declara T1) | ✅ — sequência de fase é T1→T2→T3→T4→T5; T3 só precisa de T1 tecnicamente, mas roda em ordem sequencial por design de fase |
| T4 | T1 | T3→T4 (sequência de fase) | ✅ |
| T5 | T2, T3, T4 | T4→T5 (sequência de fase) | ✅ |
| T6 | T5 | T5→T6 | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T6 | T6→T8 | ✅ |
| T9 | T6 | T6→T9 | ✅ |
| T10 | T6 | T6→T10 | ✅ |
| T11 | T6 | T6→T11 | ✅ |
| T12 | T6 | T6→T12 | ✅ |
| T13 | T7,T8,T9,T10,T11,T12 | todas→T13 | ✅ |
| T14 | T13, T10 | T13→T14 (+T10) | ✅ |
| T15 | T13, T9 | T13→T15 (+T9) | ✅ |
| T16 | T13 | T13→T16 | ✅ |
| T17 | T13 | T13→T17 | ✅ |
| T18 | T14,T15,T16,T17 | todas→T18 | ✅ |
| T19 | T18, T8 | T18→T19 (+T8) | ✅ |
| T20 | T18, T15 | T18→T20 (+T15) | ✅ |
| T21 | T18 | T18→T21 | ✅ |
| T22 | T18, T11 | T18→T22 (+T11) | ✅ |
| T23 | T18 | T18→T23 | ✅ |
| T24 | T18 | T18→T24 | ✅ |
| T25 | T18 | T18→T25 | ✅ |
| T26 | T19..T25 | todas→T26 | ✅ |
| T27 | T26, T7 | T26→T27 (+T7) | ✅ |
| T28 | T26, T19 | T26→T28 (+T19) | ✅ |
| T29 | T26, T20 | T26→T29 (+T20) | ✅ |
| T30 | T26, T14, T10 | T26→T30 (+T14,T10) | ✅ |
| T31 | T26, T21 | T26→T31 (+T21) | ✅ |
| T32 | T26, T22, T24, T23 | T26→T32 (+T22,T24,T23) | ✅ |
| T33 | T26, T12, T16, T17 | T26→T33 (+T12,T16,T17) | ✅ |
| T34 | T26 | T26→T34 | ✅ |
| T35 | T27..T34 | todas→T35 | ✅ |
| T36 | T35 | T35→T36 | ✅ |
| T37 | T36 | T36→T37 | ✅ |
| T38 | T37 | T37→T38 | ✅ |
| T39 | T38 | T38→T39 | ✅ |

Nenhuma task marcada `[P]` depende de outra task `[P]` da mesma fase — todas as
dependências cruzadas (`+Tn`) apontam para fases anteriores.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | config (`package.json`) | none | none | ✅ OK |
| T2 | config (CSS) | none | none | ✅ OK |
| T3 | componente (`modal.tsx`) | unit | unit | ✅ OK |
| T4 | verificação (sem código) | none | none | ✅ OK |
| T5 | gate de fase | e2e (existente) | e2e | ✅ OK |
| T6 | página | unit + e2e | unit + e2e | ✅ OK |
| T7–T12 | página | unit (+ e2e onde a área tem spec crítico: T12) | unit (T12: unit+e2e) | ✅ OK |
| T13, T18, T26, T36 | script de gate | unit (fixture) | unit | ✅ OK |
| T14 | componente | unit | unit | ✅ OK |
| T15 | página | unit | unit | ✅ OK |
| T16 | página | unit | unit | ✅ OK |
| T17 | página | unit + e2e | unit + e2e | ✅ OK |
| T19–T24 | página | unit | unit | ✅ OK |
| T25 | página de impressão (excluída de cobertura unitária) | e2e apenas | e2e | ✅ OK |
| T27–T32 | página | unit | unit | ✅ OK |
| T33 | página | unit + e2e | unit + e2e | ✅ OK |
| T34 | página | unit + e2e | unit + e2e | ✅ OK |
| T35 | remoção (config + CSS) | none | none | ✅ OK |
| T37 | componente + páginas | unit (suítes existentes) | unit | ✅ OK |
| T38 | documento | none | none | ✅ OK |
| T39 | fechamento | full suite (existente) | full suite | ✅ OK |

Nenhuma violação. Nenhuma task usa "testado em outra task" como justificativa —
onde `Tests: none`, a matriz também diz `none` para aquela camada (config/CSS/
remoção/documento/verificação sem código).

---

## Tips

- **[P] = Order-free** — dentro da fase, sem dependência entre si
- **Reuses = Token saver** — sempre referencia código existente
- **Piloto absorve a complexidade** — T6 mistura 5 padrões de propósito; tudo depois é mecânico
- **Catraca do gate** — cada checagem entra só quando já pode passar; `check:sv` nunca fica vermelho entre commits
- **One commit per task** — mensagens já definidas em cada task
