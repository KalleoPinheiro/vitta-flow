# Spec — Auditoria de segurança e varredura de dependências

## Contexto

Relatório GitGuard (scan `cmt5621zz00acwtz1o07u2rro`, MANUAL, branch `main`, commit
`5b0a072d057b`), 35 findings: HIGH 14 · MEDIUM 20 · LOW 1 · scanners SEMGREP 23 /
GITLEAKS 7 / TRIVY 5. O relatório é da versão FREE: informa **o quê**, não **onde**.

Cada apontamento foi confrontado contra o checkout do commit escaneado. O relatório
não pôde ser reproduzido com o Semgrep local (sem `pip`/`pipx` no ambiente); a
validação foi feita por busca dirigida aos padrões exatos de cada regra citada, e
por `npm audit` (fonte de verdade para os itens TRIVY).

## Resultado do confronto

| # | Apontamento | Severidade | Veredito | Evidência |
|---|---|---|---|---|
| A1 | `postcss` 8.4.31, 3 CVEs | HIGH | **Procede (parcialmente impreciso)** | 8.4.31 existe, mas em `node_modules/next/node_modules/postcss`. O top-level é 8.5.19 — **também vulnerável** (`npm audit`: `<=8.5.22`). Ambos dev-only |
| A2 | `sharp` 0.34.5, libvips CVEs | HIGH | **Procede** | Transitivo de `next@16.2.11`; não é dependência direta (ver AD-002) |
| A3 | `brace-expansion` 2.1.2 | HIGH | **Procede (subdimensionado)** | 3 cópias: 1.1.16 (eslint), 2.1.2 (googleapis→gaxios→rimraf→glob), 5.0.7 (typescript-eslint). Faixa vulnerável `<=1.1.17 \|\| 2.0.0-2.1.3 \|\| 4.0.0-5.0.8` cobre as três |
| A4 | 7× GitLeaks `generic-api-key` | HIGH | **Falso positivo** | Fixtures de teste rotuladas (`e2e/support/constants.ts`, `tests/**`). `.env.example` só tem valores vazios/placeholder. Nenhuma credencial real |
| A5 | `hardcoded_secrets.node_secret` / `node_password` | HIGH | **Falso positivo** | Mesmas constantes de A4 |
| A6 | `gcm-no-tag-length` | HIGH | **Procede** | `src/lib/auth/crypto.ts` usa `aes-256-gcm` sem `authTagLength` em `createDecipheriv` |
| A7 | 19× `detect-non-literal-regexp` | MEDIUM | **Procede como fragilidade, não como vuln** | Todas em `e2e/**` e `tests/**`, interpolando nomes de fixture sem escape. Sem exposição em produção |
| A8 | `node_insecure_random_generator` | MEDIUM | **Procede** | 1 ocorrência: `e2e/support/api.ts:57` `Math.random()` |
| A9 | `unsafe-formatstring` | LOW | **Falso positivo** | Template literals de JS não têm semântica printf |

### Findings que o relatório NÃO reportou (lacuna do scan)

`npm audit` no mesmo commit acusa 3 HIGH adicionais, ausentes do relatório:

- `undici` 7.0.0–7.28.0 — 5 advisories (desync de resposta, vazamento entre usuários via cache, CRLF injection, cookie injection)
- `nanoid` `<3.3.18` — loop infinito com `size` zero
- `js-yaml` 4.0.0–4.3.0 — consumo quadrático de CPU em `!!omap` (CVE-2026-59870)

### Dependências não utilizadas

Nenhuma. `pg` é usado via import dinâmico em
`src/infrastructure/persistence/drizzle/db.ts:37`; `react-dom` é peer de runtime do
React/Next. Ambos foram verificados individualmente e devem permanecer.

## Requisitos

### FR-001 — Vulnerabilidades de dependência remediadas
Após a correção, `npm audit` não reporta nenhuma vulnerabilidade HIGH ou CRITICAL.

**AC-001.1** `next` ≥ 16.3.2, eliminando as cópias vulneráveis de `postcss` e `sharp`.
**AC-001.2** `postcss` resolvido em toda a árvore para versão > 8.5.22.
**AC-001.3** `sharp` resolvido para ≥ 0.35.0.
**AC-001.4** `brace-expansion` resolvido, nas três cópias, para fora da faixa vulnerável.
**AC-001.5** `undici`, `nanoid` e `js-yaml` resolvidos para versões corrigidas.
**AC-001.6** Vulnerabilidades remanescentes são exclusivamente MODERATE, dev-only, e
estão documentadas com justificativa de aceite.

### FR-002 — AES-GCM com `authTagLength` explícito
`src/lib/auth/crypto.ts` fixa o tamanho da tag de autenticação nas duas pontas.

**AC-002.1** `createCipheriv` e `createDecipheriv` recebem `{ authTagLength: 16 }`.
**AC-002.2** Payload cifrado com tag truncada (< 16 bytes) é **rejeitado** na decifragem.
**AC-002.3** Round-trip cifra/decifra continua funcionando; payloads já existentes
(tag de 16 bytes, o default do Node) continuam decifráveis — sem quebra de compatibilidade.

### FR-003 — RegExp construída a partir de dado dinâmico é escapada
Toda `new RegExp()` sobre nome de fixture usa um helper de escape compartilhado.

**AC-003.1** Existe helper `escapeRegExp` exportado de um módulo de suporte único.
**AC-003.2** Nenhuma `new RegExp()` em `e2e/**` ou `tests/**` interpola valor dinâmico
sem passar por `escapeRegExp`.
**AC-003.3** Fixture cujo nome contenha metacaractere de regex (`.`, `+`, `(`, `[`)
casa literalmente, e não como padrão.

### FR-004 — Gerador aleatório criptográfico na suíte E2E
**AC-004.1** `e2e/support/api.ts` não usa `Math.random()`.
**AC-004.2** O sufixo `unique()` vem de `node:crypto` e mantém a unicidade entre specs.

### FR-005 — Segredos da suíte E2E fora do código-fonte
Decisão do usuário: externalizar **e** configurar allowlist de scanner.

**AC-005.1** `e2e/support/constants.ts` não contém literal de segredo/senha.
**AC-005.2** Os valores vêm de `process.env`; na ausência, são gerados aleatoriamente
por execução e propagados ao servidor Next e aos workers do Playwright.
**AC-005.3** A suíte E2E continua funcional: runner e workers enxergam o mesmo valor.
**AC-005.4** Existe configuração de allowlist (`.gitleaks.toml` + supressões Semgrep)
cobrindo as constantes de teste remanescentes em `tests/**`, com justificativa.

### FR-006 — Dependências atualizadas dentro de patch/minor
Decisão do usuário: sem majors quebráveis.

**AC-006.1** Todo pacote com atualização patch/minor disponível é atualizado.
**AC-006.2** Nenhum major é aplicado (TypeScript 7, ESLint 10, `@types/node` 26,
`@testing-library/jest-dom` 7, `googleapis` 176 ficam fora).
**AC-006.3** `npm test`, `npm run typecheck` e `npm run lint` passam após as atualizações.

## Fora de escopo

- Atualizações major (FR-006/AC-006.2) — decisão explícita do usuário.
- Reescrita do histórico Git. Os "segredos" são falsos positivos (A4/A5); não há
  credencial real exposta, logo não há o que rotacionar nem histórico a expurgar.
- `esbuild`/`drizzle-kit` MODERATE: o único "fix" oferecido pelo npm é downgrade
  major de `drizzle-kit` 0.31.10 → 0.18.1. Ver AC-001.6.
