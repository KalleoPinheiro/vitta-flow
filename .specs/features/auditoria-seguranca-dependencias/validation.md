# Validation — Auditoria de segurança e varredura de dependências

**Veredito: PASS**
**Faixa verificada**: `5b0a072..ba9098a` (5 commits)
**Data**: 2026-08-23

Verificação executada em passada independente (fallback standalone do Verifier: sem
sub-agentes nesta sessão). Evidência por execução de comando, não por autoavaliação.

## Gates

| Gate | Resultado |
|---|---|
| `npm test` | 107 arquivos, **1787 passed**, 0 failed (baseline pré-mudança: 106 / 1780) |
| `npm run typecheck` | limpo |
| `npm run lint` | `No issues found` |
| `npm run build` | build de produção completo |
| `npm run check:sv` | `OK — adoção do @still-void/ui v2 completa` |
| `npx playwright test e2e/auth.spec.ts` | 6 passed, 0 failed (re-executado após o bump do `@playwright/test` para 1.62.1, que exige `npx playwright install`) |
| `npm audit` | 0 HIGH, 0 CRITICAL (4 MODERATE aceitos — AD-009) |

## Evidência por critério de aceite

| AC | Evidência | Status |
|---|---|---|
| AC-001.1 | `next@16.3.2` | ✅ |
| AC-001.2 | `postcss@8.5.23` em toda a árvore (> 8.5.22) | ✅ |
| AC-001.3 | `sharp@0.35.3` (≥ 0.35.0) | ✅ |
| AC-001.4 | `brace-expansion` 1.1.18 / 2.1.4 / 5.0.9 — as 3 cópias fora da faixa `<=1.1.17 \|\| 2.0.0-2.1.3 \|\| 4.0.0-5.0.8` | ✅ |
| AC-001.5 | `undici@7.29.0`, `nanoid@3.3.18`, `js-yaml@4.3.1` | ✅ |
| AC-001.6 | 4 MODERATE remanescentes, todas de `esbuild` via `@esbuild-kit`→`drizzle-kit`, dev-only; registrado em AD-009 | ✅ |
| AC-002.1 | `authTagLength: 16` em `createCipheriv` e `createDecipheriv` | ✅ |
| AC-002.2 | Teste "tag de autenticação truncada" — falha antes da correção com `Unsupported state or unable to authenticate data`, passa depois | ✅ |
| AC-002.3 | Teste "payload legado" confirma tag de 16 bytes e round-trip | ✅ |
| AC-003.1 | `escapeRegExp` em `e2e/support/regexp.ts`, com teste dedicado | ✅ |
| AC-003.2 | Varredura residual: 0 ocorrências de `new RegExp` dinâmica sem escape (a única ocorrência restante está dentro de um comentário) | ✅ |
| AC-003.3 | Teste "ponto não funciona como curinga" + "parêntese não balanceado" | ✅ |
| AC-004.1 | `grep Math.random(` em `src/`, `e2e/`, `tests/` → 0 | ✅ |
| AC-004.2 | `randomBytes(4).toString("hex")` — mesmas 8 posições alfanuméricas | ✅ |
| AC-005.1 | `e2e/support/constants.ts` sem literal de segredo (restam URLs, paths e nome de cookie) | ✅ |
| AC-005.2 | `secretFromEnv` lê de `process.env` e grava o valor gerado de volta | ✅ |
| AC-005.3 | `e2e/auth.spec.ts` 6 passed — o `global-setup` faz login real com a senha gerada, provando a propagação runner → workers → servidor Next | ✅ |
| AC-005.4 | `.gitleaks.toml` restrito à regra `generic-api-key` nos 11 arquivos de teste enumerados; sem supressão para `e2e/**` (0 literais após T4, verificado) e sem `.semgrepignore` (findings resolvidos na origem) | ✅ |
| AC-006.1 | `npm outdated` só lista majors | ✅ |
| AC-006.2 | Nenhum major aplicado (TS 5.9.3, ESLint 9.39.5, @types/node 20, jest-dom 6.9.1, googleapis 173) | ✅ |
| AC-006.3 | Ver tabela de gates | ✅ |

## Sensor de discriminação (mutação)

Defeitos injetados em escopo descartável; todos revertidos com `git checkout` após medição.

| Mutante | Resultado |
|---|---|
| M1 — remove validação de tamanho de IV/tag em `crypto.ts` | **morto** (2 testes falharam) |
| M2 — `AUTH_TAG_LENGTH` de 16 → 4 | **morto** (2 testes falharam) |
| M3 — `escapeRegExp` vira função identidade | **morto** (3 de 4 falharam; o 4º é teste de equivalência para entrada sem metacaractere, sobrevive por construção) |
| M2 (2ª rodada) — contra o teste de compatibilidade reescrito | **morto** — a versão anterior do teste sobrevivia a este mutante, porque cifrava com o próprio helper já corrigido |

### Gap de precisão encontrado e corrigido

A primeira execução de M3 matou apenas **1** dos 4 testes. Dois testes passavam por
acidente, não por discriminação:

1. `new RegExp("Dr. Ana").test("DrXAna")` já retornava `false` sem escape — falta o
   espaço, então o `.` não chegava a agir como curinga. Corrigido para `"DrX Ana"`.
2. A string de metacaracteres continha `|`, o que sem escape a torna uma alternação
   que casa trivialmente pelo ramo `b *`. Adicionada asserção negativa contra um
   texto diferente.

Após a correção, M3 mata 3 de 4. Isto é uma falha real do primeiro conjunto de
testes, encontrada pelo sensor — não pela leitura do código.

## Confronto final com o relatório

Os 35 findings particionam assim — os buckets somam 35 sem sobreposição:

| Bucket | Qtd | Veredito |
|---|---|---|
| TRIVY — dependências (`postcss` 3, `sharp` 1, `brace-expansion` 1) | 5 | procede, corrigido |
| SEMGREP `gcm-no-tag-length` | 1 | procede, corrigido |
| SEMGREP `node_insecure_random_generator` | 1 | procede, corrigido |
| SEMGREP `detect-non-literal-regexp` | 18 | procede como fragilidade de teste (sem exposição em produção), corrigido |
| **Subtotal — procedem** | **25** | |
| GITLEAKS `generic-api-key` | 7 | falso positivo (fixtures de teste) |
| SEMGREP `hardcoded_secrets` (`node_secret`, `node_password`) | 2 | falso positivo (mesmas fixtures) |
| SEMGREP `unsafe-formatstring` | 1 | falso positivo (template literal de JS não tem semântica printf) |
| **Subtotal — falsos positivos** | **10** | |
| **Total** | **35** | |

Conferência cruzada com os totais do relatório: HIGH = 4 (TRIVY) + 7 (GITLEAKS) + 3
(SEMGREP) = 14 ✓ · MEDIUM = 1 (TRIVY, o XSS do postcss) + 19 (SEMGREP) = 20 ✓ ·
LOW = 1 ✓. Por scanner: SEMGREP 23 · GITLEAKS 7 · TRIVY 5 = 35 ✓.

O código teve **29** construções de `new RegExp` dinâmica corrigidas — mais que as 18
reportadas, porque o scan não flagrou todas as ocorrências existentes.

O relatório **não reportou** 3 HIGH reais — `undici`, `nanoid`, `js-yaml` — que o
`npm audit` acusa no mesmo commit. Também corrigidos aqui, e por isso fora da
partição dos 35 acima.

## Pendências

Nenhuma bloqueante. Backlog registrado: AD-009 (MODERATE de `esbuild`, revisar quando
`drizzle-kit` largar o `@esbuild-kit`) e AD-010 (majors adiados).
