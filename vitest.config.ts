import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Testes de API migram o PGlite completo no primeiro caso — precisa de folga.
    testTimeout: 20_000,
    // beforeAll de rotas API importa módulos + migra PGlite; sob paralelismo de
    // workers (vários arquivos migrando ao mesmo tempo) o default de 10s estoura.
    hookTimeout: 30_000,
    env: {
      TZ: "UTC",
      // As rotas exigem sessão (src/lib/auth/require-session.ts) — a suíte roda
      // com autenticação LIGADA e assina cookies com este segredo
      // (tests/support/session.ts), em vez de exercitar um caminho sem sessão
      // que não existe em produção. Testes que precisam do cenário "sem auth"
      // sobrescrevem/limpam estas variáveis localmente.
      AUTH_SECRET: "vitest-auth-secret-0000000000000000",
    },
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: [
        // Camada 1 de autorização (antigo middleware) — arquivo mais sensível do projeto.
        "src/proxy.ts",
        "src/domain/**",
        "src/application/**",
        "src/infrastructure/**",
        "src/lib/**",
        "src/app/**",
        "src/components/**",
      ],
      exclude: [
        // Composition root — apenas wiring de DI, sem lógica.
        "src/infrastructure/container.ts",
        // Bootstrap de conexão real (pg/pglite) — exercitado indiretamente pelos testes que usam pglite.
        "src/infrastructure/persistence/drizzle/db.ts",
        // Definição de tabelas Drizzle (schema puro, sem lógica) — wiring de FK via
        // closures `.references(() => ...)`, exigido pelo ORM para referências circulares.
        "src/infrastructure/persistence/drizzle/schema.ts",
        // Cliente Google Calendar real — chamada externa, sem valor em unit test.
        "src/infrastructure/calendar/**",
        // Cliente OAuth do Google — chamada HTTP externa real, coberto por E2E de login.
        "src/lib/auth/google-oauth-client.ts",
        // Layouts/loading do App Router — sem branches, cobertos visualmente por E2E.
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        // Páginas de impressão de documentos — renderização server pura, coberta por E2E.
        "src/app/documentos/**",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
