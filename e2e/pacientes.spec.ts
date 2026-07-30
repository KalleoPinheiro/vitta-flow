import { test, expect } from "@playwright/test";
import { createPatient, unique } from "./support/api";

test.describe("pacientes", () => {
  test("cria um paciente pela UI", async ({ page }) => {
    const name = `Paciente Criado UI ${unique()}`;
    await page.goto("/pacientes");
    await page.getByRole("button", { name: "+ Novo paciente" }).click();
    await page.getByLabel("Nome completo *").fill(name);
    await page.getByLabel("Email *").fill(`${unique()}@e2e.vittaflow.test`);
    await page.getByLabel("Telefone *").fill("11977776666");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByRole("heading", { name: "Novo paciente" })).not.toBeVisible();
    await expect(page.getByRole("cell", { name })).toBeVisible();
  });

  test("edita um paciente existente", async ({ page, request }) => {
    const patient = await createPatient(request);
    const newName = `${patient.fullName} (editado)`;

    await page.goto("/pacientes");
    await page.getByPlaceholder("Buscar por nome, email ou telefone…").fill(patient.fullName);
    await expect(page.getByRole("cell", { name: patient.fullName })).toBeVisible();

    await page
      .getByRole("row", { name: new RegExp(patient.fullName) })
      .getByRole("button", { name: "Editar" })
      .click();
    await page.getByLabel("Nome completo *").fill(newName);
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByRole("heading", { name: "Editar paciente" })).not.toBeVisible();
    await page.getByPlaceholder("Buscar por nome, email ou telefone…").fill(newName);
    await expect(page.getByRole("cell", { name: newName })).toBeVisible();
  });

  test("inativa um paciente e bloqueia novo agendamento para ele", async ({ page, request }) => {
    const patient = await createPatient(request);

    await page.goto("/pacientes");
    await page.getByPlaceholder("Buscar por nome, email ou telefone…").fill(patient.fullName);
    await page
      .getByRole("row", { name: new RegExp(patient.fullName) })
      .getByRole("button", { name: "Desativar" })
      .click();
    await expect(
      page.getByRole("row", { name: new RegExp(patient.fullName) }).getByText("Inativo"),
    ).toBeVisible();

    // Paciente inativo não aparece no seletor de novo agendamento.
    await page.goto("/agenda");
    await page.getByRole("button", { name: "+ Nova consulta" }).click();
    await expect(
      page.getByLabel("Paciente *").locator("option", { hasText: patient.fullName }),
    ).toHaveCount(0);

    // Defesa em profundidade: a API também recusa agendar para paciente inativo.
    const response = await request.post("/api/appointments", {
      data: {
        patientId: patient.id,
        startsAt: "2027-03-01T15:00:00.000Z",
        endsAt: "2027-03-01T16:00:00.000Z",
        procedure: "Tentativa bloqueada",
        priceCents: 1000,
      },
    });
    expect(response.ok()).toBe(false);
    const body = await response.json();
    expect(body.error).toContain("inativo");
  });

  test("busca pacientes por nome", async ({ page, request }) => {
    const target = await createPatient(request, { fullName: `Busca Alvo ${unique()}` });
    await createPatient(request, { fullName: `Outro Paciente ${unique()}` });

    await page.goto("/pacientes");
    await page.getByPlaceholder("Buscar por nome, email ou telefone…").fill(target.fullName);

    await expect(page.getByRole("cell", { name: target.fullName })).toBeVisible();
  });

  test("abre o prontuário do paciente", async ({ page, request }) => {
    const patient = await createPatient(request);

    await page.goto("/pacientes");
    await page.getByPlaceholder("Buscar por nome, email ou telefone…").fill(patient.fullName);
    await page
      .getByRole("row", { name: new RegExp(patient.fullName) })
      .getByRole("link", { name: "Prontuário" })
      .click();

    await expect(page).toHaveURL(new RegExp(`/pacientes/${patient.id}`));
    await expect(page.getByRole("heading", { name: patient.fullName })).toBeVisible();
    await expect(page.getByRole("button", { name: "Anamnese", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Estomias e feridas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Evoluções (SOAP)" })).toBeVisible();
  });
});
