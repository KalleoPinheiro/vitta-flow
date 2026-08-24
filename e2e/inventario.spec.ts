import { test, expect } from "@playwright/test";
import {
  apiGet,
  completeAppointment,
  createAppointment,
  createPatient,
  createSupply,
  unique,
  type ProcedureDto,
} from "./support/api";
import { slotForAttempt } from "./support/dates";
import { toApiDatetime } from "./support/iso-datetime";
import { literal, rx } from "./support/regexp";

test.describe("inventário", () => {
  test("cadastra insumo e procedimento com kit, e a conclusão da consulta baixa o estoque", async ({
    page,
    request,
  }) => {
    const supplyName = `Bolsa E2E ${unique()}`;
    const procedureName = `Troca de bolsa E2E ${unique()}`;

    // Cadastra o insumo pela UI.
    await page.goto("/materiais");
    await page.getByRole("button", { name: "+ Novo insumo" }).click();
    await page.getByLabel("Nome *").fill(supplyName);
    await page.getByLabel("Unidade *").fill("un");
    await page.getByLabel("Estoque mínimo *").fill("5");
    await page.getByLabel("Preço (R$) *").fill("35");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("heading", { name: "Novo insumo" })).not.toBeVisible();
    await expect(page.getByRole("cell", { name: supplyName })).toBeVisible();

    // Dá entrada de 10 unidades para ter saldo suficiente.
    await page
      .getByRole("row", { name: literal(supplyName) })
      .getByRole("button", { name: "Movimentar" })
      .click();
    await page.getByLabel("Quantidade *").fill("10");
    await page.getByLabel("Motivo *").fill("Compra inicial — E2E");
    await page.getByRole("button", { name: "Registrar movimentação" }).click();
    await expect(page.getByRole("heading", { name: /^Movimentar/ })).not.toBeVisible();
    await expect(
      page.getByRole("row", { name: literal(supplyName) }).getByText(/^10 un/),
    ).toBeVisible();

    // Cadastra o procedimento e vincula o insumo como kit padrão.
    await page.goto("/procedimentos");
    await page.getByRole("button", { name: "+ Novo procedimento" }).click();
    await page.getByLabel("Nome *").fill(procedureName);
    await page.getByLabel("Preço (R$) *").fill("150");
    await page.getByLabel("Duração (min) *").fill("40");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("heading", { name: "Novo procedimento" })).not.toBeVisible();

    const row = page.getByRole("row", { name: literal(procedureName) });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Kit" }).click();
    await expect(page.getByRole("heading", { name: `Kit de insumos — ${procedureName}` })).toBeVisible();
    await page.getByRole("button", { name: "+ Adicionar insumo" }).click();
    await page.locator("select").selectOption({ label: supplyName });
    await page.locator('input[type="number"]').fill("2");
    await page.getByRole("button", { name: "Salvar kit" }).click();
    await expect(page.getByRole("heading", { name: `Kit de insumos — ${procedureName}` })).not.toBeVisible();

    // Cria e conclui uma consulta vinculada ao procedimento com kit.
    const patient = await createPatient(request, { fullName: `Paciente Kit ${unique()}` });
    const procedures = await apiGet<ProcedureDto[]>(request, "/api/procedures");
    const procedure = procedures.find((p) => p.name === procedureName);
    expect(procedure).toBeTruthy();

    const slot = slotForAttempt("inventario-kit-dispensa");
    const appointment = await createAppointment(request, {
      patientId: patient.id,
      startsAt: toApiDatetime(slot.startsAt),
      endsAt: toApiDatetime(slot.endsAt),
      procedure: procedureName,
      priceCents: 15000,
      procedureId: procedure!.id,
    });
    await completeAppointment(request, appointment.id);

    // Estoque deve ter caído de 10 para 8 (kit consome 2 unidades por atendimento).
    await page.goto("/materiais");
    await expect(
      page.getByRole("row", { name: literal(supplyName) }).getByText(/^8 un/),
    ).toBeVisible();
  });

  test("insumo com estoque abaixo do mínimo aparece no alerta de estoque baixo", async ({
    page,
    request,
  }) => {
    const supplyName = `Gaze estéril E2E ${unique()}`;
    const supply = await createSupply(request, { name: supplyName, minQty: 10 });

    await page.goto("/materiais");
    const row = page.getByRole("row", { name: literal(supplyName) });
    await row.getByRole("button", { name: "Movimentar" }).click();
    await page.getByLabel("Quantidade *").fill("3");
    await page.getByLabel("Motivo *").fill("Compra pequena — E2E");
    await page.getByRole("button", { name: "Registrar movimentação" }).click();
    await expect(page.getByRole("heading", { name: /^Movimentar/ })).not.toBeVisible();

    await expect(
      page.getByText(/insumo(s)? est(á|ão) com estoque baixo/),
    ).toBeVisible();
    await expect(row.getByText("Estoque baixo")).toBeVisible();
    expect(supply.minQty).toBe(10);
  });

  test("bloqueia saída maior que o estoque disponível", async ({ page, request }) => {
    const supplyName = `Insumo sem saldo E2E ${unique()}`;
    await createSupply(request, { name: supplyName });

    await page.goto("/materiais");
    const row = page.getByRole("row", { name: literal(supplyName) });
    await row.getByRole("button", { name: "Movimentar" }).click();
    await page.getByLabel("Tipo *").selectOption({ label: "Saída (uso/perda)" });
    await page.getByLabel("Quantidade *").fill("1");
    await page.getByLabel("Motivo *").fill("Tentativa sem saldo — E2E");
    await page.getByRole("button", { name: "Registrar movimentação" }).click();

    await expect(page.getByText(/Estoque insuficiente/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Movimentar/ })).toBeVisible();
  });

  test("lote perto do vencimento aparece no alerta de vencimento", async ({ page, request }) => {
    const supplyName = `Curativo com lote E2E ${unique()}`;
    await createSupply(request, { name: supplyName });

    const soon = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10); // 10 dias — dentro da janela de 30 dias.
    const dateInput = soon.toISOString().slice(0, 10);

    await page.goto("/materiais");
    const row = page.getByRole("row", { name: literal(supplyName) });
    await row.getByRole("button", { name: "Movimentar" }).click();
    await page.getByLabel("Quantidade *").fill("20");
    await page.getByLabel("Motivo *").fill("Compra com validade — E2E");
    await page.getByLabel("Lote (opcional)").fill(`L-${unique()}`);
    await page.getByLabel("Validade (opcional)").fill(dateInput);
    await page.getByRole("button", { name: "Registrar movimentação" }).click();
    await expect(page.getByRole("heading", { name: /^Movimentar/ })).not.toBeVisible();

    await expect(
      page.getByText(rx`vence(m)? em até 30 dias.*${supplyName}`),
    ).toBeVisible();
  });
});
