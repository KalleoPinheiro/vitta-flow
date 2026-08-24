import { test, expect } from "@playwright/test";
import {
  completeAppointment,
  createAppointment,
  createPatient,
  createProcedure,
  createProfessional,
  unique,
} from "./support/api";
import { slotForAttempt } from "./support/dates";
import { toApiDatetime } from "./support/iso-datetime";
import { literal } from "./support/regexp";

const monthValue = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, "0")}`;

/** Mês âncora: garante que o `fill()` seguinte seja sempre mudança real de valor. */
const ANCHOR_MONTH = "2000-01";

/**
 * `<input type="month">` é controlado por estado React. `fill()` escreve direto no
 * DOM, e o value-tracker do React pode engolir o `onChange` — o input passa a
 * mostrar o mês novo enquanto o estado (e o fetch) continuam no mês antigo. Checar
 * `toHaveValue` não detecta isso: o `fill()` sempre satisfaz essa asserção.
 *
 * Por isso o critério de sucesso aqui é a REQUISIÇÃO do mês pedido, que só sai se
 * o estado do React realmente mudou. Cada tentativa passa pelo mês âncora antes,
 * senão um `fill()` repetido com o mesmo valor não dispararia busca nenhuma.
 */
async function setReportMonth(page: import("@playwright/test").Page, value: string): Promise<void> {
  const input = page.locator('input[type="month"]');
  await expect(async () => {
    const requested = page.waitForResponse(
      (response) => response.url().includes(`/api/reports?month=${value}`),
      { timeout: 5_000 },
    );
    await input.fill(ANCHOR_MONTH);
    await input.fill(value);
    await requested;
  }).toPass({ timeout: 20_000 });
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
    const slot = slotForAttempt("relatorios-margem-2");
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

    const row = page.getByRole("row", { name: literal(procedure.name) });
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
    const slot = slotForAttempt("relatorios-producao");
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

    const row = page.getByRole("row", { name: literal(professional.fullName) });
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
