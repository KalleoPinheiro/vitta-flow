# Tasks — Auditoria de segurança e varredura de dependências

Design formal dispensado: não há decisão arquitetural nova nem padrão novo — são
correções pontuais localizadas e bumps de versão. O único ponto com desenho real
(propagação do segredo E2E entre runner e workers) está descrito em T4.

Baseline antes da execução: `npm test` → 106 arquivos, 1780 testes, 0 falhas.

## Fase 1 — Correções de código

### T1 — AES-GCM com `authTagLength` explícito (FR-002)
- **Arquivos**: `src/lib/auth/crypto.ts`, `tests/lib/auth.test.ts` (é onde já vive o
  bloco "Criptografia de segredos em repouso (AES-256-GCM)" — não há
  `tests/lib/crypto.test.ts`)
- **Teste primeiro**: payload com tag truncada deve ser rejeitado (AC-002.2);
  round-trip preservado (AC-002.3); compatibilidade retroativa exercitada com um
  ciphertext construído no formato ANTERIOR (`createCipheriv` sem `authTagLength`),
  não com a saída do helper já corrigido.
- **Gate**: `npx vitest run tests/lib/auth.test.ts`

### T2 — `unique()` com gerador criptográfico (FR-004)
- **Arquivos**: `e2e/support/api.ts`
- **Verificação**: `! grep -rn "Math\.random(" --include="*.ts" --include="*.tsx" src e2e scripts tests`
  (recursivo, e o gate só passa quando não há ocorrência); formato do sufixo
  preservado (alfanumérico curto), unicidade mantida.
- **Gate**: `npm run typecheck` + `npm run lint`

### T3 — `escapeRegExp` nas RegExp dinâmicas (FR-003)
- **Arquivos**: novo `e2e/support/regexp.ts` (ou módulo de suporte compartilhado),
  todos os specs de `e2e/**` e os 2 testes de `tests/pages/**` com `new RegExp(...)`.
- **Teste primeiro**: fixture cujo nome contém metacaractere casa literalmente (AC-003.3).
- **Gate**: `npm test` + `npm run typecheck` + `npm run lint`

### T4 — Segredos E2E fora do código (FR-005)
- **Arquivos**: `e2e/support/constants.ts`, `.gitleaks.toml` (novo), `.env.example`, `README.md`
- **Desenho**: `constants.ts` lê `process.env.E2E_AUTH_SECRET` / `E2E_AUTH_PASSWORD`;
  se ausentes, gera com `randomBytes` **e grava de volta em `process.env`**. O módulo é
  carregado primeiro pelo runner (via `playwright.config.ts`), e os workers do Playwright
  são processos filhos que herdam o `env` do runner — logo enxergam o mesmo valor.
  O servidor Next recebe os valores explicitamente por `webServer.env`.
- **Verificação**: nenhum literal de segredo em `e2e/support/constants.ts`;
  allowlist cobre as constantes remanescentes de `tests/**` com justificativa.
- **Gate**: `npm run typecheck` + `npm run lint`

## Fase 2 — Dependências

### T5 — Atualização de dependências (FR-001, FR-006)
- **Arquivos**: `package.json`, `package-lock.json`
- **Passos**: `next` → ≥16.3.2 (elimina `postcss` e `sharp` vulneráveis); `overrides`
  para `brace-expansion`, `undici`, `nanoid`, `js-yaml` e `postcss` transitivos que
  não saírem da faixa vulnerável sozinhos; demais pacotes até o `Wanted` (patch/minor).
  Nenhum major.
- **Gate**: `npm audit` sem HIGH/CRITICAL + `npm test` (1780 testes) + `npm run typecheck`
  + `npm run lint` + `npm run build`

### T6 — Registro das decisões (FR-001 AC-001.6)
- **Arquivos**: `.specs/STATE.md`, `.specs/features/auditoria-seguranca-dependencias/validation.md`
- **Conteúdo**: AD-005 (falsos positivos de segredo — sem rotação/reescrita de histórico),
  AD-006 (aceite do MODERATE `esbuild`/`drizzle-kit`, dev-only), AD-007 (sem majors).
- **Gate**: revisão documental

## Ordem e dependências

T1, T2, T3, T4 são independentes entre si → podem ir em qualquer ordem.
T5 depende de T1–T4 estarem verdes (para atribuir qualquer regressão ao bump, e não ao código).
T6 fecha, depois do veredito de T5.
