import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryInvoiceRepository } from "@/infrastructure/persistence/in-memory/in-memory-invoice-repository";
import { InMemoryPatientRepository } from "@/infrastructure/persistence/in-memory/in-memory-patient-repository";
import { CreatePatient } from "@/application/patients/create-patient";
import { CreateInvoice } from "@/application/billing/create-invoice";
import { PayInvoice } from "@/application/billing/pay-invoice";
import { CancelInvoice } from "@/application/billing/cancel-invoice";
import { ListInvoices } from "@/application/billing/list-invoices";
import { GetBillingSummary } from "@/application/billing/get-billing-summary";
import type { Patient } from "@/domain/patient/patient";
import { NotFoundError } from "@/domain/shared/errors";

describe("Feature: Controle de faturamento", () => {
  let invoiceRepo: InMemoryInvoiceRepository;
  let patientRepo: InMemoryPatientRepository;
  let maria: Patient;

  beforeEach(async () => {
    invoiceRepo = new InMemoryInvoiceRepository();
    patientRepo = new InMemoryPatientRepository();
    maria = await new CreatePatient(patientRepo).execute({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
    });
  });

  const createInvoice = (amountCents = 25000) =>
    new CreateInvoice(invoiceRepo, patientRepo).execute({
      patientId: maria.id,
      description: "Consulta de estomaterapia",
      amountCents,
    });

  describe("Cenário: emitir fatura avulsa", () => {
    it("Dado paciente existente, Quando emitir, Então fatura pendente persistida", async () => {
      const invoice = await createInvoice();

      const stored = await invoiceRepo.findById(invoice.id);
      expect(stored?.status).toBe("pending");
    });

    it("Dado paciente inexistente, Quando emitir, Então lança NotFoundError", async () => {
      await expect(
        new CreateInvoice(invoiceRepo, patientRepo).execute({
          patientId: "ghost",
          description: "Consulta",
          amountCents: 100,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Cenário: receber pagamento", () => {
    it("Dado fatura pendente, Quando pagar via pix, Então status paid persistido", async () => {
      const invoice = await createInvoice();

      await new PayInvoice(invoiceRepo).execute({ id: invoice.id, method: "pix" });

      const stored = await invoiceRepo.findById(invoice.id);
      expect(stored?.status).toBe("paid");
      expect(stored?.paymentMethod).toBe("pix");
    });

    it("Dado fatura inexistente, Quando pagar, Então lança NotFoundError", async () => {
      await expect(
        new PayInvoice(invoiceRepo).execute({ id: "ghost", method: "pix" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Cenário: cancelar fatura", () => {
    it("Dado fatura pendente, Quando cancelar, Então status cancelled persistido", async () => {
      const invoice = await createInvoice();

      await new CancelInvoice(invoiceRepo).execute({ id: invoice.id });

      expect((await invoiceRepo.findById(invoice.id))?.status).toBe("cancelled");
    });
  });

  describe("Cenário: listar faturas com nome do paciente", () => {
    it("Dado faturas emitidas, Quando listar, Então retorna com patientName", async () => {
      await createInvoice();

      const result = await new ListInvoices(invoiceRepo, patientRepo).execute({});

      expect(result).toHaveLength(1);
      expect(result[0].patientName).toBe("Maria da Silva");
    });

    it("Dado filtro por status, Quando listar, Então retorna apenas do status", async () => {
      const a = await createInvoice();
      await createInvoice(10000);
      await new PayInvoice(invoiceRepo).execute({ id: a.id, method: "cash" });

      const paid = await new ListInvoices(invoiceRepo, patientRepo).execute({ status: "paid" });
      const pending = await new ListInvoices(invoiceRepo, patientRepo).execute({
        status: "pending",
      });

      expect(paid).toHaveLength(1);
      expect(pending).toHaveLength(1);
    });
  });

  describe("Cenário: resumo financeiro do período", () => {
    it("Dado faturas pagas, pendentes e canceladas, Quando resumir, Então totaliza corretamente", async () => {
      const a = await createInvoice(20000);
      await createInvoice(15000);
      const c = await createInvoice(5000);
      await new PayInvoice(invoiceRepo).execute({ id: a.id, method: "pix" });
      await new CancelInvoice(invoiceRepo).execute({ id: c.id });

      const summary = await new GetBillingSummary(invoiceRepo).execute({
        from: new Date(Date.now() - 86_400_000),
        to: new Date(Date.now() + 86_400_000),
      });

      expect(summary.paidCents).toBe(20000);
      expect(summary.pendingCents).toBe(15000);
      expect(summary.totalInvoices).toBe(3);
      expect(summary.paidCount).toBe(1);
      expect(summary.pendingCount).toBe(1);
    });
  });
});
