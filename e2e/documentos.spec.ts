import { test, expect } from "@playwright/test";
import {
  addAssessment,
  changeAppointmentStatus,
  completeAppointment,
  createAppointment,
  createCondition,
  createPatient,
  unique,
} from "./support/api";
import { slotForAttempt } from "./support/dates";
import { toApiDatetime } from "./support/iso-datetime";

test.describe("documentos imprimíveis", () => {
  test("declaração de comparecimento mostra os dados da consulta", async ({ page, request }) => {
    const patient = await createPatient(request, { fullName: `Paciente Atestado ${unique()}` });
    const procedure = `Troca de bolsa (documento) E2E ${unique()}`;
    const slot = slotForAttempt("documentos-atestado-1");
    const appointment = await createAppointment(request, {
      patientId: patient.id,
      startsAt: toApiDatetime(slot.startsAt),
      endsAt: toApiDatetime(slot.endsAt),
      procedure,
      priceCents: 10000,
    });
    // Atestado só é emitido para consulta com status "completed" (#63).
    await completeAppointment(request, appointment.id);

    const response = await page.goto(`/documentos/atestado/${appointment.id}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Declaração de Comparecimento" })).toBeVisible();
    await expect(page.getByText(patient.fullName)).toBeVisible();
    await expect(page.getByText(procedure)).toBeVisible();
  });

  test("declaração de comparecimento bloqueia consulta cancelada (#63)", async ({ page, request }) => {
    const patient = await createPatient(request, { fullName: `Paciente Atestado Cancelado ${unique()}` });
    const slot = slotForAttempt("documentos-atestado-2");
    const appointment = await createAppointment(request, {
      patientId: patient.id,
      startsAt: toApiDatetime(slot.startsAt),
      endsAt: toApiDatetime(slot.endsAt),
      procedure: `Troca de bolsa (cancelada) E2E ${unique()}`,
      priceCents: 10000,
    });
    await changeAppointmentStatus(request, appointment.id, "cancel");

    const response = await page.goto(`/documentos/atestado/${appointment.id}`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Declaração de Comparecimento" }),
    ).not.toBeVisible();
    await expect(page.getByText(/não é possível emitir declaração/i)).toBeVisible();
  });

  test("termo de consentimento mostra os dados do paciente", async ({ page, request }) => {
    const patient = await createPatient(request, { fullName: `Paciente Consentimento Doc ${unique()}` });

    const response = await page.goto(`/documentos/consentimento/${patient.id}`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Termo de Consentimento Livre e Esclarecido" }),
    ).toBeVisible();
    await expect(page.getByText(patient.fullName).first()).toBeVisible();
  });

  test("relatório de evolução mostra as avaliações da condição", async ({ page, request }) => {
    const patient = await createPatient(request, { fullName: `Paciente Relatório Doc ${unique()}` });
    const condition = await createCondition(request, patient.id, {
      kind: "wound",
      title: `Ferida documento E2E ${unique()}`,
    });
    await addAssessment(request, condition.id, { lengthMm: 25, widthMm: 12, depthMm: 3 });

    const response = await page.goto(`/documentos/relatorio/${condition.id}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Relatório de Evolução Clínica" })).toBeVisible();
    await expect(page.getByText(patient.fullName)).toBeVisible();
    await expect(page.getByText(condition.title)).toBeVisible();
    await expect(page.getByText("25×12×3")).toBeVisible();
  });

  test("declaração de consulta inexistente mostra mensagem de erro", async ({ page }) => {
    const response = await page.goto("/documentos/atestado/id-que-nao-existe");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Consulta não encontrada")).toBeVisible();
  });
});
