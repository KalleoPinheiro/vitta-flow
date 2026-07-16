import { describe, it, expect } from "vitest";
import { Invoice } from "@/domain/billing/invoice";
import { Money } from "@/domain/shared/money";
import { InvalidStatusTransitionError, ValidationError } from "@/domain/shared/errors";

const validProps = {
  patientId: "patient-1",
  description: "Consulta de estomaterapia",
  amount: Money.fromCents(25000),
};

describe("Feature: Faturamento (Invoice)", () => {
  describe("Cenário: emitir fatura", () => {
    it("Dado dados válidos, Quando emitir, Então fatura pendente com data de emissão", () => {
      const invoice = Invoice.create(validProps);

      expect(invoice.id).toBeTruthy();
      expect(invoice.status).toBe("pending");
      expect(invoice.issuedAt).toBeInstanceOf(Date);
      expect(invoice.paidAt).toBeNull();
    });

    it("Dado valor zero, Quando emitir, Então lança ValidationError", () => {
      expect(() => Invoice.create({ ...validProps, amount: Money.zero() })).toThrow(
        ValidationError,
      );
    });

    it("Dado descrição vazia, Quando emitir, Então lança ValidationError", () => {
      expect(() => Invoice.create({ ...validProps, description: " " })).toThrow(ValidationError);
    });

    it("Dado appointmentId, Quando emitir, Então fatura vinculada à consulta", () => {
      const invoice = Invoice.create({ ...validProps, appointmentId: "appt-1" });

      expect(invoice.appointmentId).toBe("appt-1");
    });
  });

  describe("Cenário: registrar pagamento", () => {
    it("Dado fatura pendente, Quando pagar via pix, Então status paid com método e data", () => {
      const paid = Invoice.create(validProps).markPaid("pix");

      expect(paid.status).toBe("paid");
      expect(paid.paymentMethod).toBe("pix");
      expect(paid.paidAt).toBeInstanceOf(Date);
    });

    it("Dado fatura já paga, Quando pagar de novo, Então lança InvalidStatusTransitionError", () => {
      const paid = Invoice.create(validProps).markPaid("cash");

      expect(() => paid.markPaid("pix")).toThrow(InvalidStatusTransitionError);
    });

    it("Dado fatura cancelada, Quando pagar, Então lança InvalidStatusTransitionError", () => {
      const cancelled = Invoice.create(validProps).cancel();

      expect(() => cancelled.markPaid("pix")).toThrow(InvalidStatusTransitionError);
    });
  });

  describe("Cenário: cancelar fatura", () => {
    it("Dado fatura pendente, Quando cancelar, Então status cancelled", () => {
      expect(Invoice.create(validProps).cancel().status).toBe("cancelled");
    });

    it("Dado fatura paga, Quando cancelar, Então lança InvalidStatusTransitionError", () => {
      const paid = Invoice.create(validProps).markPaid("pix");

      expect(() => paid.cancel()).toThrow(InvalidStatusTransitionError);
    });
  });
});
