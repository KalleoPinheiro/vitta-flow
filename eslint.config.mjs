import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-open-mode/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
  {
    // Qualidade estrutural: complexidade ciclomática baixa imposta em todo o código.
    rules: {
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
