# Validation — Redução de ruído dos scanners de segurança

**Veredito: PASS**

Faixa do diff: `f725554..HEAD` (5 commits).
Passe independente executado após o último commit de implementação (fallback standalone
do Verifier: checagem ancorada na spec + sensor de discriminação por mutação).

## Estado dos scanners

Árvore final, escaneada como o GitGuard escaneia — sem o `.gitleaks.toml` do repositório.

| Scanner / regra | Antes (f725554) | Depois | Origem da queda |
|---|---|---|---|
| GITLEAKS `generic-api-key` | 7 | **0** | `gitleaks:allow` inline nas 7 fixtures |
| SEMGREP `detect-non-literal-regexp` | 18 | **0** | eliminação na origem (28 call sites → 1 helper) |
| SEMGREP `gcm-no-tag-length` | 0 | 0 | já estava corrigido no PR #9; o relatório listava dado obsoleto |
| SEMGREP `node_insecure_random_generator` | 0 | 0 | idem |
| SEMGREP `hardcoded_secrets` (`node_secret`/`node_password`/`node_username`) | 57 | 57 | falso positivo aceito por AD-012 |
| SEMGREP `unsafe-formatstring` | 1 | 1 | falso positivo (B9), sem ação |
| **Total Semgrep** | **76** | **58** | |
| `npm audit` HIGH/CRITICAL | 0 | 0 | — |

Ferramentas: `gitleaks` 8.30.1, `semgrep` 1.174.0, `npm audit` do lockfile da árvore.

## Evidência por critério de aceite

| AC | Evidência | |
|---|---|---|
| AC-001.1 | `git grep "new RegExp" -- src e2e tests scripts` → 1 linha de código (`e2e/support/regexp.ts:36`); as outras 3 são comentário | ✅ |
| AC-001.2 | Semgrep com `r/…detect-non-literal-regexp` sobre `src e2e tests scripts` → **0** findings | ✅ |
| AC-001.3 | `escapeRegExp` deixou de ser exportado; o chamador passa o valor cru e `rx` escapa. `npm run typecheck` limpo — nenhum call site tenta importá-lo | ✅ |
| AC-001.4 | `node ./node_modules/@playwright/test/cli.js test --list` → `Total: 64 tests in 17 files` | ✅ |
| AC-002.1 | `gitleaks dir .` sobre a árvore **sem** `.gitleaks.toml` → `no leaks found` (era 7) | ✅ |
| AC-002.2 | As 7 linhas levam `// gitleaks:allow — fixture de teste, não é credencial` | ✅ |
| AC-002.3 | As supressões estão só em `tests/api/scheduling-catalog-routes.test.ts` e `tests/pages/login.test.tsx` | ✅ |
| AC-003.1 | Nenhuma decisão cita arquivo inexistente; AD-012 registra a escolha de não criar o `.semgrepignore` e por quê | ✅ (com desvio registrado na spec) |
| AC-003.2 | AD-008 corrigido em `.specs/STATE.md` | ✅ |
| AC-004.1 | README, seção "Varredura de segurança": versões, comandos e as duas armadilhas (caminho relativo no gitleaks; config do repo não alcança scanner hospedado) | ✅ |
| AC-004.2 | AD-011, AD-012 e AD-013 em `.specs/STATE.md` | ✅ |

## Sensor de discriminação

Mutação no helper `rx`, com a suíte `tests/support/regexp.test.ts` como detector.

| # | Mutação | Resultado |
|---|---|---|
| M1 | Não escapar o valor interpolado | **morto** — 6 testes falham |
| M2 | Escapar também a parte estática | **morto** — 3 testes falham |
| M3 | Ler `parts` cozido em vez de `parts.raw` | **sobreviveu** → lacuna corrigida |
| M4 | Inverter a ordem dos valores interpolados | **morto** — 1 teste falha |

M3 sobreviveu porque nenhum teste exercitava o que o próprio comentário do helper
afirma importar: uma barra invertida escrita no template (`\d`) tem de chegar intacta ao
padrão, e a forma cozida a descartaria. Adicionado o teste "Dado escape de regex na
parte estática, Quando casar, Então chega intacto ao padrão"; com ele, M3 passa a matar
1 teste. Nenhum mutante sobrevive.

## Checagem ancorada na spec

Cada teste de `tests/support/regexp.test.ts` afirma um resultado definido pela spec
(comportamento do casamento), não a forma da implementação: nenhum inspeciona `.source`
nem usa `new RegExp` — usá-lo reintroduziria o padrão que FR-001 remove.

**Precisão da spec.** Um AC precisou de correção: AC-003.1 pedia criar o
`.semgrepignore`, apoiado na premissa de que o ignore default do Semgrep já excluía
`tests/`. A premissa é falsa (`--verbose` → `Skipped by .semgrepignore: <none>`). O
desvio, a evidência e a decisão resultante estão em FR-003 da spec e em AD-012.

## Gates

- `npm test` → 107 arquivos, 1791 testes, todos passando
- `npm run typecheck` → limpo
- `npm run lint` → `No issues found`
- `npx playwright test --list` → 64 testes em 17 arquivos

## O que não foi feito

- Nenhuma correção de vulnerabilidade: não havia nenhuma. Os 6 findings TRIVY do
  relatório citam versões que não existem na árvore desde o PR #9.
- `hardcoded_secrets` de `tests/**` (B7) e `unsafe-formatstring` (B9) seguem como falso
  positivo documentado, por AD-012.
