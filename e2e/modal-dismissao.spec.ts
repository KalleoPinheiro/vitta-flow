import { test, expect } from "@playwright/test";

/**
 * Dismissão do modal por interação fora do diálogo.
 *
 * Vive em E2E, e não em teste unitário, porque o `Dialog` do Still Void (Radix
 * por baixo) implementa isso ouvindo `pointerdown` no documento. O jsdom não
 * implementa `PointerEvent` — nem com polyfill o handler da Radix dispara — então
 * a garantia só é assertável onde existe browser de verdade.
 *
 * As outras garantias do diálogo (role, aria-modal, Escape, focus trap,
 * restauração de foco) continuam cobertas em tests/components/modal.test.tsx.
 */
test.describe("modal — dismissão por interação fora", () => {
  test("clique fora do diálogo fecha o modal; clique dentro mantém aberto", async ({ page }) => {
    await page.goto("/procedimentos");

    await page.getByRole("button", { name: "+ Novo procedimento" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Clique dentro do diálogo não fecha.
    await dialog.getByRole("heading", { name: "Novo procedimento" }).click();
    await expect(dialog).toBeVisible();

    // Clique no overlay, fora do diálogo, fecha.
    await page.mouse.click(5, 5);
    await expect(dialog).not.toBeVisible();
  });

  test("Escape fecha o modal", async ({ page }) => {
    await page.goto("/procedimentos");

    await page.getByRole("button", { name: "+ Novo procedimento" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});
