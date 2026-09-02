import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next. `**/` na frente de cada
  // padrão (issue #49): sem ele, o glob só bate na raiz do projeto — outros
  // checkouts aninhados (ex.: `.claude/worktrees/*/`, usados por sessões de
  // agente em paralelo) escapam do ignore e seus artefatos de build viram
  // "erros" reais no `npx eslint .`, mascarando a dívida de lint verdadeira.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/.next-open-mode/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    "**/coverage/**",
    // Checkouts de worktree usados por sessões de agente — nunca alvo do lint
    // deste projeto.
    ".claude/worktrees/**",
  ]),
  {
    // Qualidade estrutural: complexidade ciclomática baixa imposta em todo o código.
    rules: {
      // Prefixo `_` marca ligação deliberadamente não usada — parâmetro que existe
      // só para manter a assinatura de um contrato (mock de SDK, handler, callback).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      complexity: ["error", { max: 10 }],
      "max-depth": ["error", 4],
      "max-lines-per-function": [
        "error",
        { max: 120, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // Componentes React declarativos (JSX extenso) têm teto maior de linhas,
    // mas mantêm o mesmo limite de complexidade ciclomática.
    files: ["**/*.tsx"],
    rules: {
      "max-lines-per-function": [
        "error",
        { max: 320, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // Suítes BDD (describe) são funções naturalmente longas; complexidade continua valendo.
    files: ["tests/**"],
    rules: {
      "max-lines-per-function": "off",
    },
  },
]);

export default eslintConfig;
