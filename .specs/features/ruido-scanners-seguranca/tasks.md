# Tasks — Redução de ruído dos scanners de segurança

Fase 1 — Eliminação na origem (FR-001)
Fase 2 — Supressão e registro (FR-002, FR-003, FR-004)

## Fase 1

### T1 — Helper `rx` com escape por construção
- **Cobre**: AC-001.3, AC-001.1 (parcial)
- **Faz**: em `e2e/support/regexp.ts`, troca o `escapeRegExp` exportado por um tagged
  template `rx` (partes estáticas = fonte da regex, valores interpolados escapados
  automaticamente) e `literal(v)`, definido como `rx\`${v}\``. `escapeRegExp` vira
  interno. `new RegExp` passa a existir em um único ponto do repositório.
- **Testes primeiro**: `tests/support/regexp.test.ts` reescrito para exercitar `rx` e
  `literal` pelo comportamento (metacaractere tratado como literal, parte estática
  preservada como padrão), não pela implementação. Os testes não podem usar
  `new RegExp` — se usassem, reintroduziriam o padrão que a task remove.
- **Gate**: `npm test -- tests/support/regexp.test.ts`

### T2 — Migração dos call sites E2E
- **Cobre**: AC-001.1, AC-001.2, AC-001.4
- **Faz**: 28 call sites em 8 specs passam de `new RegExp(escapeRegExp(x))` para
  `literal(x)`, e os 5 com padrão misto para `` rx`...${x}...` ``.
- **Gate**: `npx playwright test --list` sem erro + `git grep -c "new RegExp"` = 1 linha
  de código + semgrep local ≤ 1 finding da regra

## Fase 2

### T3 — Supressão inline dos segredos de teste
- **Cobre**: AC-002.1, AC-002.2, AC-002.3
- **Faz**: `gitleaks:allow` nas 7 linhas exatas de
  `tests/api/scheduling-catalog-routes.test.ts` e `tests/pages/login.test.tsx`.
- **Gate**: `gitleaks dir <árvore sem .gitleaks.toml>` = 0 leaks

### T4 — `.semgrepignore` e correção do AD-008
- **Cobre**: AC-003.1, AC-003.2
- **Gate**: arquivo existe; AD-008 não afirma mais o que não existe

### T5 — Registro do confronto e das decisões
- **Cobre**: AC-004.1, AC-004.2
- **Faz**: `validation.md`, novas decisões em `.specs/STATE.md`, procedimento de
  reprodução local dos scanners no README.
- **Gate**: `npm run lint` + `npm run typecheck` + `npm test`
