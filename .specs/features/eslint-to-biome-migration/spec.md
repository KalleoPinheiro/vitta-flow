# Migração ESLint → Biome Specification

## Problem Statement

`npx harness-score` aponta SNS-04 (formatter ausente, +3 pts). AGENTS.md hoje documenta explicitamente "No Prettier/Biome — there is no formatter command" como decisão registrada. Em vez de somar Prettier (rodaria em paralelo ao ESLint, duplicando superfície de config), a decisão (issue #107) é migrar ESLint → Biome como lint + formatter único.

## Goals

- [ ] `biome.json` na raiz cobre lint + format com config fornecida pelo usuário (issue #107)
- [ ] Regras equivalentes migradas 1:1 onde Biome suporta (`complexity: 10`, `max-depth: 4`, `max-lines-per-function: 120/320`, `no-unused-vars` prefixo `_`); gaps documentados
- [ ] `npm run lint` roda Biome; `npm run format` adicionado
- [ ] ESLint removido (config + deps) sem quebrar CI/pre-commit/hook de feedback
- [ ] AGENTS.md atualizado (comando de formatter existe agora)
- [ ] `npx harness-score` confirma SNS-04 fechado

## Out of Scope

| Feature | Reason |
| --- | --- |
| Adotar Prettier | Decisão explícita da issue: Biome substitui, não soma |
| Migrar regras sem equivalente exato no Biome | Documentar gap em vez de forçar 1:1 artificial |
| Reformatar todo o codebase agora além do necessário para `biome check` passar | Fora do escopo da issue; PR de migração de tooling, não de reformatação em massa (mas `biome format --write .` roda 1x para deixar o repo em conformidade, já que não há formatter hoje) |
| Atualizar `.specs/STATE.md` (log histórico de decisões passadas) | É log append-only de decisões já tomadas; não é doc de estado atual da ferramenta |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Versão do `@biomejs/biome` | Última estável (2.5.x), schema `2.2.0` do JSON fornecido ajustado para a versão instalada | Schema URL é só validação de editor; instalar a última estável evita CVEs/bugs já corrigidos | y (default razoável, sem impacto de comportamento) |
| `max-lines-per-function` diferenciado `.tsx` (320) vs resto (120) | Biome `nursery`/`style` não tem override por extensão nativo tão granular quanto ESLint `files: []` — usar `overrides` do Biome (`biome.json` suporta `overrides` por glob desde 1.x) | Biome suporta `overrides` com `includes` por glob, equivalente ao `files:` do ESLint | y |
| `tests/**` sem limite de linhas por função | Mesma técnica de `overrides` | Preserva comportamento atual (describe blocks longos) | y |
| Comentário `// eslint-disable-next-line` em `e2e/agenda.spec.ts:49` | Trocar para supressão Biome (`// biome-ignore lint/complexity/noExcessiveLinesPerFunction: ...` — nome exato da regra confirmado durante implementação via `biome lint`) | Ferramenta trocou; supressão precisa apontar pra regra nova | y |
| Hook `.claude/hooks/lint-edited-file.sh` (chama `npx eslint`) | Trocar para `npx biome check` no arquivo | Hook é feedback não-bloqueante; deve continuar funcional pós-migração | y |
| `lint-staged` (`eslint --fix`) | Trocar para `biome check --write` | Mesmo papel (fix automático pre-commit) | y |
| CI (`ci.yml` step "Lint" roda `npm run lint`) | Sem mudança no workflow — só o que `npm run lint` executa muda | Script já é indireção correta | y |

**Open questions:** nenhuma — todas resolvidas acima.

---

## User Stories

### P1: Biome substitui ESLint como lint + formatter ⭐ MVP

**User Story**: Como mantenedor do projeto, quero um único comando (`biome`) fazendo lint e format, para reduzir superfície de config e fechar o gap SNS-04 do harness-score.

**Why P1**: É o core da issue — sem isso nada mais faz sentido.

**Acceptance Criteria**:

1. WHEN `npm run lint` roda THEN o sistema SHALL executar `biome check` (lint, sem side-effect de escrita) e sair com código 0 no estado atual do repo
2. WHEN `npm run format` roda THEN o sistema SHALL executar `biome format --write` e formatar arquivos sem erros
3. WHEN o Biome lint roda THEN o sistema SHALL aplicar `complexity <= 10`, `max-depth <= 4`, `max-lines-per-function <= 120` (320 para `.tsx`, sem limite em `tests/**`), e não sinalizar variáveis/params prefixados com `_` como não usados
4. WHEN `eslint.config.mjs`, `eslint`, `eslint-config-next` são removidos THEN `npm run build`, `npm run typecheck`, `npm run test:coverage`, `npm run check:sv` SHALL continuar passando

**Independent Test**: Rodar `npm run lint` e `npm run format` localmente; ambos saem limpos.

---

### P2: Integrações (hook, pre-commit, CI) continuam funcionais

**User Story**: Como agente/desenvolvedor, quero que o feedback de lint no meu fluxo (hook do Claude Code, pre-commit, CI) continue funcionando após a troca de ferramenta.

**Why P2**: Não bloqueia o core da migração mas quebra DX se ignorado.

**Acceptance Criteria**:

1. WHEN um arquivo `.ts/.tsx/.js/.jsx` é editado via Claude Code THEN `.claude/hooks/lint-edited-file.sh` SHALL rodar `biome check` nesse arquivo (não mais `eslint`)
2. WHEN um commit é feito THEN `lint-staged` SHALL rodar `biome check --write` nos arquivos staged (não mais `eslint --fix`)
3. WHEN a CI roda o step "Lint" THEN SHALL continuar chamando `npm run lint` sem alteração no `ci.yml`

**Independent Test**: Editar um arquivo `.ts` via Edit tool e observar o hook rodando Biome; `git commit` disparando `lint-staged` com Biome.

---

### P3: Documentação e validação de fechamento

**User Story**: Como mantenedor, quero AGENTS.md e o harness-score refletindo a mudança, para que a decisão fique rastreável e o gap SNS-04 seja confirmado fechado.

**Why P3**: Fecha o loop da issue mas não é bloqueante tecnicamente.

**Acceptance Criteria**:

1. WHEN AGENTS.md é lido THEN a seção "Code style" SHALL documentar `biome check` / `biome format` no lugar da frase "No Prettier/Biome — there is no formatter command"
2. WHEN `npx harness-score` roda THEN SNS-04 SHALL aparecer fechado (ou ausente da lista de gaps)

**Independent Test**: `grep -n "Biome" AGENTS.md`; rodar `npx harness-score` e conferir ausência de SNS-04.

---

## Edge Cases

- WHEN o Biome não suporta 1:1 alguma regra ESLint atual THEN o sistema SHALL documentar o gap em AGENTS.md ou comentário no `biome.json` (não inventar regra equivalente falsa)
- WHEN `biome check` encontra violações pré-existentes no código atual (comportamento diferente do ESLint) THEN SHALL corrigir o código (não suprimir) para manter `npm run lint` com exit 0, igual ao baseline atual
- WHEN `.claude/worktrees/**` contém checkouts de sessões paralelas de agente THEN `biome.json` `files.includes` SHALL ignorá-los, mesmo motivo do ignore atual do ESLint (issue #49)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| BIOME-01 | P1 | Execute | Pending |
| BIOME-02 | P1 | Execute | Pending |
| BIOME-03 | P1 | Execute | Pending |
| BIOME-04 | P1 | Execute | Pending |
| BIOME-05 | P2 | Execute | Pending |
| BIOME-06 | P2 | Execute | Pending |
| BIOME-07 | P2 | Execute | Pending |
| BIOME-08 | P3 | Execute | Pending |
| BIOME-09 | P3 | Execute | Pending |

**Coverage:** 9 total, 9 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `npm run lint`, `npm run format`, `npm run typecheck`, `npm run test:coverage`, `npm run check:sv`, `npm run build` todos passam
- [ ] `eslint`, `eslint-config-next`, `eslint.config.mjs` removidos do repo
- [ ] `npx harness-score` sem SNS-04 na lista de gaps
