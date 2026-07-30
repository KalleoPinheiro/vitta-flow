import { test, expect } from "@playwright/test";
import { createCondition, createPatient, unique } from "./support/api";

test.describe("auditoria de prontuário", () => {
  test("criação de condição clínica gera evento de auditoria visível na trilha", async ({
    page,
    request,
  }) => {
    const patient = await createPatient(request, { fullName: `Paciente Auditoria ${unique()}` });
    await createCondition(request, patient.id, {
      kind: "wound",
      title: `Ferida auditada E2E ${unique()}`,
    });

    await page.goto("/auditoria");
    await expect(page.getByRole("heading", { name: "Auditoria de prontuário" })).toBeVisible();

    // Filtra pelo paciente para achar o evento de forma determinística.
    await page.getByRole("combobox").selectOption({ label: patient.fullName });

    const row = page.getByRole("row", { name: /Criação/ }).filter({ hasText: "Condição" });
    await expect(row).toBeVisible();
    await expect(row.getByText("admin")).toBeVisible();
    await expect(row.getByText(patient.fullName)).toBeVisible();
  });

  test("filtro por paciente esconde eventos de outros pacientes", async ({ page, request }) => {
    const target = await createPatient(request, { fullName: `Paciente Alvo Auditoria ${unique()}` });
    const other = await createPatient(request, { fullName: `Paciente Outro Auditoria ${unique()}` });
    await createCondition(request, target.id, { kind: "wound", title: `Ferida alvo ${unique()}` });
    await createCondition(request, other.id, { kind: "wound", title: `Ferida outra ${unique()}` });

    await page.goto("/auditoria");
    await page.getByRole("combobox").selectOption({ label: target.fullName });

    await expect(page.getByRole("cell", { name: target.fullName })).toBeVisible();
    await expect(page.getByRole("cell", { name: other.fullName })).toHaveCount(0);
  });
});
