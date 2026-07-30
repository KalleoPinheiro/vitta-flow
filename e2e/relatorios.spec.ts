import { test, expect } from "@playwright/test";
import {
  completeAppointment,
  createAppointment,
  createPatient,
  createProcedure,
  createProfessional,
  unique,
} from "./support/api";
import { slotFromSeed } from "./support/dates";
import { toApiDatetime } from "./support/iso-datetime";

const monthValue = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, "0")}`;

/**
 * `<input type="month">` é controlado por estado React — em raras execuções o
 * primeiro `fill()` corre com o fetch inicial (mês atual) e o valor não gruda.
 * Reforça preenchendo de novo até o filtro realmente disparar a busca do mês certo.
 */
async function setReportMonth(page: import("@playwright/test").Page, value: string): Promise<void> {
  const input = page.locator('input[type="month"]');
  await expect(async () => {
    await input.fill(value);
    await expect(input).toHaveValue(value);
  }).toPass({ timeout: 10_000 });
}

test.describe("relatório gerencial", () => {
  test("consulta concluída aparece na receita e margem por procedimento do mês", async ({
    page,
    request,
  }) => {
    const patient = await createPatient(request, { fullName: `Paciente Relatório ${unique()}` });
    const procedure = await createProcedure(request, {
      name: `Procedimento Relatório E2E ${unique()}`,
      priceCents: 22000,
      durationMinutes: 45,
    });
    const slot = slotFromSeed("relatorios-margem-2");
    const appointment = await createAppointment(request, {
      patientId: patient.id,
      startsAt: toApiDatetime(slot.startsAt),
      endsAt: toApiDatetime(slot.endsAt),
      procedure: procedure.name,
      priceCents: procedure.priceCents,
      procedureId: procedure.id,
    });
    await completeAppointment(request, appointment.id);

    await page.goto("/relatorios");
    await setReportMonth(page, monthValue(slot.ymd.year, slot.ymd.month));

    const row = page.getByRole("row", { name: new RegExp(procedure.name) });
    await expect(row).toBeVisible();
    await expect(row.getByText("R$ 220,00").first()).toBeVisible();
  });

  test("produção por profissional soma consultas concluídas vinculadas", async ({
    page,
    request,
  }) => {
    const professional = await createProfessional(request, {
      fullName: `Enf. Relatório E2E ${unique()}`,
    });
    const patient = await createPatient(request, { fullName: `Paciente Produção ${unique()}` });
    const slot = slotFromSeed("relatorios-producao");
    const appointment = await createAppointment(request, {
      patientId: patient.id,
      startsAt: toApiDatetime(slot.startsAt),
      endsAt: toApiDatetime(slot.endsAt),
      procedure: `Sessão com profissional E2E ${unique()}`,
      priceCents: 9000,
      professionalId: professional.id,
    });
    await completeAppointment(request, appointment.id);

    await page.goto("/relatorios");
    await setReportMonth(page, monthValue(slot.ymd.year, slot.ymd.month));

    const row = page.getByRole("row", { name: new RegExp(professional.fullName) });
    await expect(row).toBeVisible();
    await expect(row.getByText("R$ 90,00")).toBeVisible();
  });

  test("mês sem consultas concluídas mostra estado vazio", async ({ page }) => {
    const future = new Date();
    future.setMonth(future.getMonth() + 37);

    await page.goto("/relatorios");
    await setReportMonth(page, monthValue(future.getFullYear(), future.getMonth() + 1));

    await expect(page.getByText("Nenhuma consulta concluída no mês.")).toBeVisible();
    await expect(page.getByText("Consultas no mês")).toBeVisible();
  });
});
