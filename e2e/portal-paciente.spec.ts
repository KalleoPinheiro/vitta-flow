import { test, expect } from "@playwright/test";
import { createAppointment, createCondition, createPatient, unique } from "./support/api";
import { slotFromSeed } from "./support/dates";
import { toApiDatetime } from "./support/iso-datetime";
import { sessionCookie } from "./support/session-token";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test.describe("portal do paciente", () => {
  test("paciente confirma presença, aceita o consentimento e envia foto de evolução", async ({
    page,
    context,
    request,
  }) => {
    const patient = await createPatient(request, { fullName: `Paciente Portal ${unique()}` });
    const procedure = `Curativo portal E2E ${unique()}`;
    const slot = slotFromSeed("portal-paciente-confirm");
    await createAppointment(request, {
      patientId: patient.id,
      startsAt: toApiDatetime(slot.startsAt),
      endsAt: toApiDatetime(slot.endsAt),
      procedure,
      priceCents: 12000,
    });
    const condition = await createCondition(request, patient.id, {
      kind: "wound",
      title: `Ferida portal E2E ${unique()}`,
    });

    await context.addCookies([sessionCookie(patient.email, "patient")]);
    await page.goto("/portal");

    await expect(
      page.getByRole("heading", { name: `Olá, ${patient.fullName.split(" ")[0]}!` }),
    ).toBeVisible();

    // Consentimento digital (LGPD).
    await expect(page.getByRole("heading", { name: "Termo de consentimento pendente" })).toBeVisible();
    await page.getByRole("button", { name: "Li e aceito o termo" }).click();
    await expect(page.getByText("✓ Termo de consentimento aceito")).toBeVisible();

    // Confirmação de presença.
    const appointmentItem = page.locator("li", { hasText: procedure });
    await expect(appointmentItem).toBeVisible();
    await appointmentItem.getByRole("button", { name: "Confirmar presença" }).click();
    await expect(appointmentItem.getByText("Confirmada")).toBeVisible();

    // Envio de foto de monitoramento remoto para a condição ativa.
    await expect(page.getByText(condition.title)).toBeVisible();
    await page
      .getByPlaceholder("Observação (opcional): dor, vazamento, vermelhidão…")
      .fill("Sinto um pouco de dor na região");
    await page.locator('input[type="file"]').setInputFiles({
      name: "evolucao-remota.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await expect(
      page.getByText("Foto enviada — a equipe vai avaliar e retorna se for preciso antecipar sua consulta."),
    ).toBeVisible();
  });

  test("paciente não consegue confirmar consulta de outro paciente", async ({
    page,
    context,
    request,
  }) => {
    const patientA = await createPatient(request, { fullName: `Paciente A Portal ${unique()}` });
    const patientB = await createPatient(request, { fullName: `Paciente B Portal ${unique()}` });
    const slot = slotFromSeed("portal-paciente-ownership");
    const appointmentA = await createAppointment(request, {
      patientId: patientA.id,
      startsAt: toApiDatetime(slot.startsAt),
      endsAt: toApiDatetime(slot.endsAt),
      procedure: `Consulta de A E2E ${unique()}`,
      priceCents: 10000,
    });

    await context.addCookies([sessionCookie(patientB.email, "patient")]);
    await page.goto("/portal");
    await expect(
      page.getByRole("heading", { name: `Olá, ${patientB.fullName.split(" ")[0]}!` }),
    ).toBeVisible();

    const response = await page.request.post(
      `/api/portal/patient/appointments/${appointmentA.id}/confirm`,
    );
    expect(response.ok()).toBe(false);
    const body = await response.json();
    expect(body.error).toContain("não encontrado");
  });
});
