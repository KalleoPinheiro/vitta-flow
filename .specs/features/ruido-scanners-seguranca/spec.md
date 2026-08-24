# Spec — Redução de ruído dos scanners de segurança

## Contexto

Relatório GitGuard (scan `cmt60oz29012twtz1z1duza2q`, MANUAL, branch `main`, commit
`f725554446450489002584425f2910ae4298cbb4`), 54 findings: HIGH 15 · MEDIUM 38 · LOW 1 ·
scanners SEMGREP 41 / GITLEAKS 7 / TRIVY 6.

Este é o scan pós-merge do PR #9 que o handoff anterior pediu. Diferente da auditoria
anterior (`auditoria-seguranca-dependencias`), aqui os scanners **puderam ser
reproduzidos localmente**: `gitleaks` 8.30.1 (binário da release oficial) e `semgrep`
1.174.0 (via `uv tool install`). O confronto deixou de ser por busca dirigida e passou
a ser por execução.

## Resultado do confronto

Reprodução: `git archive f725554 | tar -x -C <tmp>` e execução dos dois scanners sobre
a árvore extraída, mais `npm audit` e `npm ls`.

| # | Apontamento | Sev. | Veredito | Evidência |
|---|---|---|---|---|
| B1 | TRIVY `postcss` 8.4.31, 3 CVEs | HIGH | **Obsoleto** | `package-lock.json` em f725554: 8.5.26 (top-level) e 8.5.23 (aninhada no next). 8.4.31 não existe na árvore |
| B2 | TRIVY `sharp` 0.34.5, libvips | HIGH | **Obsoleto** | lock em f725554: 0.35.3 |
| B3 | TRIVY `brace-expansion` 2.1.4, 2× o mesmo CVE-2026-14257 | HIGH | **Falso positivo + duplicado** | Cópias 1.1.18 / 2.1.4 / 5.0.9, todas fora da faixa `<=1.1.17 \|\| 2.0.0-2.1.3 \|\| 4.0.0-5.0.8`. O relatório lista o mesmo CVE duas vezes na mesma tabela |
| B4 | 7× GITLEAKS `generic-api-key` | HIGH | **Falso positivo — reproduzido** | `gitleaks dir` sem config: exatamente 7, todos `password: "<senha>123"` em `tests/api/scheduling-catalog-routes.test.ts` (428/451/464/475/493) e `tests/pages/login.test.tsx` (147/182). Com o `.gitleaks.toml` do repo: 0 |
| B5 | SEMGREP `gcm-no-tag-length` | HIGH | **Obsoleto — já corrigido** | Regra executada localmente em f725554: 0 findings. `authTagLength` está em `src/lib/auth/crypto.ts:19` e `:43` desde o PR #9 |
| B6 | SEMGREP `node_insecure_random_generator` | MEDIUM | **Obsoleto — já corrigido** | 0 findings locais; `Math.random()` não existe mais na árvore (`e2e/support/api.ts` usa `randomBytes(4)`) |
| B7 | SEMGREP `node_secret` / `node_password` | HIGH | **Falso positivo** | 57 ocorrências locais (40 secret + 13 password + 4 username), todas fixtures de `tests/**`; o GitGuard deduplica por regra e reporta 2 |
| B8 | 36× SEMGREP `detect-non-literal-regexp` | MEDIUM | **Duplicado (18 reais)** | Local: 18, mesmo número do scan anterior. Todas em `e2e/**`, todas já envoltas em `escapeRegExp` desde o PR #9 |
| B9 | SEMGREP `unsafe-formatstring` | LOW | **Falso positivo** | `src/application/reminders/send-reminders.ts:115` — template literal sem `%`; JS não tem semântica printf |

### Conclusão do confronto

O relatório **não traz informação nova**. É o conjunto do scan anterior
(`cmt5621zz00acwtz1o07u2rro`, 35 findings) com duplicação: `detect-non-literal-regexp`
contado 18→36 e o CVE do `brace-expansion` contado 1→2. Isso explica 35 → 54 sem
nenhum achado inédito. Dois findings já remediados no PR #9 (B5, B6) continuam
listados, o que confirma que os dados são do scan anterior.

`npm audit` em f725554: **0 HIGH, 0 CRITICAL**. Restam apenas os 4 MODERATE de
`esbuild` já aceitos em AD-009.

## Problema a resolver

Nenhuma vulnerabilidade. O problema é de **sinal**: 54 findings de ruído mascaram um
achado real no próximo scan, e o canal de supressão que o projeto adotou não alcança o
GitGuard.

Duas causas, ambas verificadas por execução:

1. **O GitGuard não usa o `.gitleaks.toml` do repositório.** Teste A/B na mesma árvore:
   sem o arquivo → 7 leaks; com o arquivo → 0. O `.gitleaks.toml` está correto. A
   precedência do gitleaks é `--config` > `GITLEAKS_CONFIG` > `(target)/.gitleaks.toml`,
   então um wrapper que passa a própria config sobrepõe a do repo. O único canal que
   sobrevive é o comentário inline `gitleaks:allow`, desligado apenas pela flag global
   `--ignore-gitleaks-allow`.
2. **O próprio fix do PR #9 multiplicou os call sites.** `escapeRegExp` corrigiu a
   fragilidade real, mas espalhou `new RegExp(...)` por 28 pontos de `e2e/**`. A regra
   `detect-non-literal-regexp` não reconhece escape — ela dispara no formato, não na
   segurança.

## Requisitos

### FR-001 — Ruído de `detect-non-literal-regexp` eliminado na origem
O padrão `new RegExp(...)` deixa de existir nos specs E2E: passa a existir em um único
ponto, dentro do helper de `e2e/support/regexp.ts`. A eliminação é por construção, não
por supressão.

**AC-001.1** `git grep "new RegExp" -- e2e tests src scripts` retorna exatamente 1 linha
de código (o interior do helper); demais ocorrências são comentário.
**AC-001.2** Semgrep local com `r/javascript.lang.security.audit.detect-non-literal-regexp`
sobre `src e2e tests scripts` retorna no máximo 1 finding.
**AC-001.3** O escape deixa de ser opcional no ponto de chamada: a API do helper escapa
os valores interpolados por construção, sem o chamador precisar lembrar de `escapeRegExp`.
**AC-001.4** `npx playwright test --list` enumera a suíte E2E sem erro de compilação.

### FR-002 — Segredos de teste suprimidos por canal que alcança o GitGuard
Os 7 findings `generic-api-key` são suprimidos por comentário inline, que é honrado
independente da config passada ao scanner.

**AC-002.1** `gitleaks dir <árvore> --no-banner` **sem** `.gitleaks.toml` retorna 0 leaks.
**AC-002.2** Cada supressão inline fica na linha da fixture e diz por que aquele valor
não é credencial.
**AC-002.3** Nenhum arquivo fora de `tests/` recebe supressão inline.

### FR-003 — Config de scanner completa e verdadeira
AD-008 afirma que existe allowlist em `.semgrepignore`; o arquivo nunca foi criado.
A decisão passa a corresponder à árvore.

**AC-003.1** `.semgrepignore` existe, cobre as fixtures de `tests/` e diz que não
alcança o GitGuard.
**AC-003.2** AD-008 é corrigido em `.specs/STATE.md` e deixa de afirmar o que não existe.

### FR-004 — Confronto registrado e reproduzível
**AC-004.1** O procedimento de reprodução local dos dois scanners fica documentado, com
versões e comandos.
**AC-004.2** `.specs/STATE.md` registra a decisão sobre o alcance da supressão no GitGuard.

## Fora de escopo

- Correção de vulnerabilidade: não há nenhuma (`npm audit` limpo).
- Majors adiados (AD-010) e os 4 MODERATE de `esbuild` (AD-009).
- Centralizar as fixtures de segredo dos 11 arquivos de `tests/**` (B7): o GitGuard
  deduplica em 2 findings; o refactor custaria 11 arquivos para remover 2 linhas do
  relatório.
- `unsafe-formatstring` (B9): falso positivo de 1 LOW, sem ação.
