import { test, expect } from "@playwright/test";
import { E2E_AUTH_PASSWORD, OPEN_MODE_BASE_URL } from "./support/constants";

// Sobrescreve o storageState admin padrão (playwright.config.ts) — estes specs
// precisam começar deslogados para exercitar o próprio fluxo de login.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("login por senha", () => {
  test("redireciona para /login quando não autenticado", async ({ page }) => {
    await page.goto("/agenda");
    await expect(page).toHaveURL(/\/login/);
  });

  test("mostra erro com senha incorreta", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Senha", { exact: true }).fill("senha-totalmente-errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Senha incorreta")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("loga com a senha mestre e navega para o dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Senha", { exact: true }).fill(E2E_AUTH_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page).toHaveURL("/");
  });

  test("sai da sessão e volta para o login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Senha", { exact: true }).fill(E2E_AUTH_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login/);

    // Sessão realmente encerrada — voltar para uma rota protegida reabre o login.
    await page.goto("/agenda");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("modo aberto (AUTH_SECRET/AUTH_PASSWORD não configurados)", () => {
  // Servidor isolado na porta 3100 (ver playwright.config.ts) — sem auth configurada,
  // o proxy deixa passar direto (comportamento só permitido fora de produção).
  test.use({ baseURL: OPEN_MODE_BASE_URL, storageState: { cookies: [], origins: [] } });

  test("acessa o dashboard sem login quando a autenticação não está configurada", async ({
    page,
  }) => {
    await page.goto("/");
    // timeout maior — primeiro acesso ao servidor "modo aberto" (porta isolada,
    // distDir isolado) ainda pode estar compilando a rota/terminando a migração pglite.
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("acessa a agenda diretamente, sem redirecionar para /login", async ({ page }) => {
    await page.goto("/agenda");
    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
  });
});
