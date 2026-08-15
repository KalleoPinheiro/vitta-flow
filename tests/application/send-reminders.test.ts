import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPatientRepository } from "@/infrastructure/persistence/in-memory/in-memory-patient-repository";
import { InMemoryAppointmentRepository } from "@/infrastructure/persistence/in-memory/in-memory-appointment-repository";
import { InMemoryInvoiceRepository } from "@/infrastructure/persistence/in-memory/in-memory-invoice-repository";
import { InMemoryFollowUpRepository } from "@/infrastructure/persistence/in-memory/in-memory-inventory-repositories";
import { InMemoryReminderLogRepository } from "@/infrastructure/persistence/in-memory/in-memory-reminder-log-repository";
import { CreatePatient } from "@/application/patients/create-patient";
import { ScheduleAppointment } from "@/application/appointments/schedule-appointment";
import { CompleteAppointment } from "@/application/appointments/complete-appointment";
import { SendReminders } from "@/application/reminders/send-reminders";
import type { MessagingGateway } from "@/application/ports/messaging-gateway";
import { NullMessagingGateway } from "@/application/ports/messaging-gateway";
import { Appointment } from "@/domain/scheduling/appointment";
import { TimeSlot } from "@/domain/shared/time-slot";
import { Money } from "@/domain/shared/money";
import type { Patient } from "@/domain/patient/patient";

class FakeMessagingGateway implements MessagingGateway {
  readonly enabled = true;
  readonly sentMessages: Array<{ phone: string; message: string }> = [];
  failFor: string | null = null;

  async sendText(phone: string, message: string): Promise<void> {
    if (this.failFor && phone === this.failFor) {
      throw new Error("falha simulada de API");
    }
    this.sentMessages.push({ phone, message });
  }
}

// now fixo: quinta 2026-07-16 12:00 UTC; consulta amanhã (sexta 17), útil.
const NOW = new Date("2026-07-16T12:00:00Z");

describe("Feature: Lembretes de confirmação (D-1) e recall de retornos", () => {
  let patientRepo: InMemoryPatientRepository;
  let appointmentRepo: InMemoryAppointmentRepository;
  let followUpRepo: InMemoryFollowUpRepository;
  let reminderLog: InMemoryReminderLogRepository;
  let gateway: FakeMessagingGateway;
  let maria: Patient;

  beforeEach(async () => {
    patientRepo = new InMemoryPatientRepository();
    appointmentRepo = new InMemoryAppointmentRepository();
    followUpRepo = new InMemoryFollowUpRepository();
    reminderLog = new InMemoryReminderLogRepository();
    gateway = new FakeMessagingGateway();
    maria = await new CreatePatient(patientRepo).execute({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
    });
  });

  const run = (messaging: MessagingGateway = gateway) =>
    new SendReminders(
      appointmentRepo,
      followUpRepo,
      patientRepo,
      reminderLog,
      messaging,
    ).execute(NOW);

  const scheduleTomorrow = () =>
    new ScheduleAppointment(appointmentRepo, patientRepo).execute({
      patientId: maria.id,
      startsAt: new Date("2026-07-17T09:00:00Z"),
      endsAt: new Date("2026-07-17T10:00:00Z"),
      procedure: "Troca de bolsa",
      priceCents: 25000,
    });

  it("Dado consulta amanhã scheduled, Quando rodar, Então envia lembrete de confirmação", async () => {
    await scheduleTomorrow();

    const summary = await run();

    expect(summary.sent).toBe(1);
    expect(gateway.sentMessages[0].message).toContain("amanhã");
  });

  it("Dado job rodado duas vezes no dia, Quando repetir, Então segundo envio é pulado", async () => {
    await scheduleTomorrow();

    await run();
    const second = await run();

    expect(second.sent).toBe(0);
    expect(second.skipped).toBe(1);
    expect(gateway.sentMessages).toHaveLength(1);
  });

  it("Dado retorno vencido, Quando rodar, Então envia recall", async () => {
    const invoiceRepo = new InMemoryInvoiceRepository();
    const past = await new ScheduleAppointment(appointmentRepo, patientRepo).execute({
      patientId: maria.id,
      startsAt: new Date("2026-06-01T09:00:00Z"),
      endsAt: new Date("2026-06-01T10:00:00Z"),
      procedure: "Curativo",
      priceCents: 15000,
    });
    // Conclui com retorno em 7 dias → vencido em 2026-06-08 (antes de NOW).
    await new CompleteAppointment(appointmentRepo, invoiceRepo, followUpRepo).execute({
      id: past.id,
      followUpInDays: 7,
    });

    const summary = await run();

    expect(summary.sent).toBe(1);
    expect(gateway.sentMessages[0].message).toContain("retorno");
  });

  it("Dado APP_URL configurada, Quando enviar recall, Então a mensagem aponta para o portal (PORT4-09)", async () => {
    const savedAppUrl = process.env.APP_URL;
    process.env.APP_URL = "https://clinica.example.com/";
    const invoiceRepo = new InMemoryInvoiceRepository();
    const past = await new ScheduleAppointment(appointmentRepo, patientRepo).execute({
      patientId: maria.id,
      startsAt: new Date("2026-06-01T09:00:00Z"),
      endsAt: new Date("2026-06-01T10:00:00Z"),
      procedure: "Curativo",
      priceCents: 15000,
    });
    await new CompleteAppointment(appointmentRepo, invoiceRepo, followUpRepo).execute({
      id: past.id,
      followUpInDays: 7,
    });

    await run();

    expect(gateway.sentMessages[0].message).toContain(
      "Agende seu retorno no portal: https://clinica.example.com/portal.",
    );
    expect(gateway.sentMessages[0].message).not.toContain("Entre em contato com a clínica");
    if (savedAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = savedAppUrl;
    }
  });

  it("Dado APP_URL ausente, Quando enviar recall, Então mantém a orientação de contato (PORT4-09)", async () => {
    const savedAppUrl = process.env.APP_URL;
    delete process.env.APP_URL;
    const invoiceRepo = new InMemoryInvoiceRepository();
    const past = await new ScheduleAppointment(appointmentRepo, patientRepo).execute({
      patientId: maria.id,
      startsAt: new Date("2026-06-01T09:00:00Z"),
      endsAt: new Date("2026-06-01T10:00:00Z"),
      procedure: "Curativo",
      priceCents: 15000,
    });
    await new CompleteAppointment(appointmentRepo, invoiceRepo, followUpRepo).execute({
      id: past.id,
      followUpInDays: 7,
    });

    await run();

    expect(gateway.sentMessages[0].message).toContain("Entre em contato com a clínica para agendar.");
    if (savedAppUrl !== undefined) {
      process.env.APP_URL = savedAppUrl;
    }
  });

  it("Dado falha de envio em um lembrete, Quando rodar, Então lote continua e conta failed", async () => {
    await scheduleTomorrow();
    gateway.failFor = "11999990000";

    const summary = await run();

    expect(summary.failed).toBe(1);
    expect(summary.sent).toBe(0);
    // Falha não marca como enviado — próxima rodada tenta de novo.
    const retryGateway = new FakeMessagingGateway();
    const retry = await run(retryGateway);
    expect(retry.sent).toBe(1);
  });

  it("Dado canal desativado (Null), Quando rodar, Então dry-run: nada enviado, tudo pulado", async () => {
    await scheduleTomorrow();

    const summary = await run(new NullMessagingGateway());

    expect(summary.channelEnabled).toBe(false);
    expect(summary.sent).toBe(0);
    expect(summary.skipped).toBe(1);
  });

  it("Dado paciente desativado com consulta amanhã, Quando rodar, Então pula sem enviar", async () => {
    await scheduleTomorrow();
    await patientRepo.save(maria.deactivate());

    const summary = await run();

    expect(summary.sent).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(gateway.sentMessages).toHaveLength(0);
  });

  it("Dado consulta órfã (paciente removido do cadastro), Quando rodar, Então pula sem enviar", async () => {
    const orphan = Appointment.create({
      patientId: "paciente-removido",
      slot: TimeSlot.create(
        new Date("2026-07-17T09:00:00Z"),
        new Date("2026-07-17T10:00:00Z"),
      ),
      procedure: "Troca de bolsa",
      price: Money.fromCents(25000),
    });
    await appointmentRepo.save(orphan);

    const summary = await run();

    expect(summary.sent).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(gateway.sentMessages).toHaveLength(0);
  });
});
