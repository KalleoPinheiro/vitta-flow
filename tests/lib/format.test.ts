import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
  APPOINTMENT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  STOMA_TYPE_LABELS,
  CONDITION_KIND_LABELS,
  EXUDATE_LABELS,
  FOLLOW_UP_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/format";

describe("Feature: Formatação de moeda (pt-BR)", () => {
  it("Dado valor positivo em centavos, Quando formatCurrency, Então formata em BRL", () => {
    expect(formatCurrency(150_00)).toBe("R$ 150,00");
  });

  it("Dado zero, Quando formatCurrency, Então R$ 0,00", () => {
    expect(formatCurrency(0)).toBe("R$ 0,00");
  });

  it("Dado valor negativo, Quando formatCurrency, Então mantém o sinal", () => {
    expect(formatCurrency(-500)).toBe("-R$ 5,00");
  });

  it("Dado centavos fracionários de real, Quando formatCurrency, Então arredonda para 2 casas", () => {
    expect(formatCurrency(1)).toBe("R$ 0,01");
  });
});

describe("Feature: Formatação de data e hora (pt-BR)", () => {
  const iso = "2026-03-15T14:30:00.000Z";

  it("Dado ISO string, Quando formatDate, Então formata dd/mm/aaaa", () => {
    expect(formatDate(iso)).toBe(new Date(iso).toLocaleDateString("pt-BR"));
  });

  it("Dado ISO string, Quando formatTime, Então formata hh:mm", () => {
    expect(formatTime(iso)).toBe(
      new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    );
  });

  it("Dado ISO string, Quando formatDateTime, Então concatena data e hora", () => {
    expect(formatDateTime(iso)).toBe(`${formatDate(iso)} ${formatTime(iso)}`);
  });
});

describe("Feature: Mapas de rótulos em pt-BR", () => {
  it("Dado status de consulta, Quando consultar o label, Então retorna o texto em pt-BR", () => {
    expect(APPOINTMENT_STATUS_LABELS.scheduled).toBe("Agendada");
    expect(APPOINTMENT_STATUS_LABELS.confirmed).toBe("Confirmada");
    expect(APPOINTMENT_STATUS_LABELS.completed).toBe("Concluída");
    expect(APPOINTMENT_STATUS_LABELS.cancelled).toBe("Cancelada");
    expect(APPOINTMENT_STATUS_LABELS.no_show).toBe("Faltou");
  });

  it("Dado status de fatura, Quando consultar o label, Então retorna o texto em pt-BR", () => {
    expect(INVOICE_STATUS_LABELS.pending).toBe("Pendente");
    expect(INVOICE_STATUS_LABELS.paid).toBe("Paga");
    expect(INVOICE_STATUS_LABELS.cancelled).toBe("Cancelada");
  });

  it("Dado tipo de estomia, Quando consultar o label, Então retorna o texto em pt-BR", () => {
    expect(STOMA_TYPE_LABELS.colostomia).toBe("Colostomia");
    expect(STOMA_TYPE_LABELS.ileostomia).toBe("Ileostomia");
    expect(STOMA_TYPE_LABELS.urostomia).toBe("Urostomia");
  });

  it("Dado tipo de condição, Quando consultar o label, Então retorna o texto em pt-BR", () => {
    expect(CONDITION_KIND_LABELS.stoma).toBe("Estomia");
    expect(CONDITION_KIND_LABELS.wound).toBe("Ferida");
  });

  it("Dado nível de exsudato, Quando consultar o label, Então retorna o texto em pt-BR", () => {
    expect(EXUDATE_LABELS.none).toBe("Nenhum");
    expect(EXUDATE_LABELS.low).toBe("Baixo");
    expect(EXUDATE_LABELS.moderate).toBe("Moderado");
    expect(EXUDATE_LABELS.high).toBe("Alto");
  });

  it("Dado status de retorno, Quando consultar o label, Então retorna o texto em pt-BR", () => {
    expect(FOLLOW_UP_STATUS_LABELS.pending).toBe("Pendente");
    expect(FOLLOW_UP_STATUS_LABELS.done).toBe("Concluído");
    expect(FOLLOW_UP_STATUS_LABELS.cancelled).toBe("Cancelado");
  });

  it("Dado método de pagamento, Quando consultar o label, Então retorna o texto em pt-BR", () => {
    expect(PAYMENT_METHOD_LABELS.pix).toBe("Pix");
    expect(PAYMENT_METHOD_LABELS.cash).toBe("Dinheiro");
    expect(PAYMENT_METHOD_LABELS.credit_card).toBe("Cartão de crédito");
    expect(PAYMENT_METHOD_LABELS.debit_card).toBe("Cartão de débito");
    expect(PAYMENT_METHOD_LABELS.insurance).toBe("Convênio");
    expect(PAYMENT_METHOD_LABELS.transfer).toBe("Transferência");
  });
});
