import { test, expect } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, OPEN_MODE_BASE_URL } from "./support/constants";

// Sobrescreve o storageState admin padrão (playwright.config.ts) — estes specs
// precisam começar deslogados para exercitar o próprio fluxo de login.
test.use({ storageState: { cookies: [], origins: [] } });

const signIn = async (
  page: import("@playwright/test").Page,
  email: string,
  password: string,
): Promise<void> => {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
};

test.describe("login por e-mail e senha", () => {
  test("redireciona para /login quando não autenticado", async ({ page }) => {
    await page.goto("/agenda");
    await expect(page).toHaveURL(/\/login/);
  });

  test("não oferece mais login com Google", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByText("Entrar com Google")).toHaveCount(0);
  });

  test("mostra erro com senha incorreta", async ({ page }) => {
    await page.goto("/login");
    await signIn(page, E2E_ADMIN_EMAIL, "senha-totalmente-errada");
    await expect(page.getByText("Email ou senha incorretos")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("loga com a conta do Super Admin e navega para o dashboard", async ({ page }) => {
    await page.goto("/login");
    await signIn(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page).toHaveURL("/");
  });

  test("sai da sessão e volta para o login", async ({ page }) => {
    await page.goto("/login");
    await signIn(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login/);

    // Sessão realmente encerrada — voltar para uma rota protegida reabre o login.
    await page.goto("/agenda");
    await expect(page).toHaveURL(/\/login/);
  });

  test("oferece o fluxo de recuperação de senha sem revelar se a conta existe", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await expect(page).toHaveURL(/\/esqueci-senha/);

    await page.getByLabel("E-mail", { exact: true }).fill("nao-existe@vitta.test");
    await page.getByRole("button", { name: "Enviar link" }).click();

    await expect(
      page.getByText("Se houver uma conta com este e-mail, enviamos um link para redefinir a senha."),
    ).toBeVisible();
  });
});

test.describe("modo aberto (AUTH_SECRET não configurado)", () => {
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
