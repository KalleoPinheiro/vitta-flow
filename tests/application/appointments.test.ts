import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPatientRepository } from "@/infrastructure/persistence/in-memory/in-memory-patient-repository";
import { InMemoryAppointmentRepository } from "@/infrastructure/persistence/in-memory/in-memory-appointment-repository";
import { InMemoryInvoiceRepository } from "@/infrastructure/persistence/in-memory/in-memory-invoice-repository";
import { CreatePatient } from "@/application/patients/create-patient";
import { ScheduleAppointment } from "@/application/appointments/schedule-appointment";
import { RescheduleAppointment } from "@/application/appointments/reschedule-appointment";
import { ChangeAppointmentStatus } from "@/application/appointments/change-appointment-status";
import { CompleteAppointment } from "@/application/appointments/complete-appointment";
import { ListAppointments } from "@/application/appointments/list-appointments";
import type { Patient } from "@/domain/patient/patient";
import {
  NotFoundError,
  SchedulingConflictError,
  ValidationError,
} from "@/domain/shared/errors";

describe("Feature: Agendamento de consultas com controle de conflitos", () => {
  let patientRepo: InMemoryPatientRepository;
  let appointmentRepo: InMemoryAppointmentRepository;
  let invoiceRepo: InMemoryInvoiceRepository;
  let maria: Patient;

  beforeEach(async () => {
    patientRepo = new InMemoryPatientRepository();
    appointmentRepo = new InMemoryAppointmentRepository();
    invoiceRepo = new InMemoryInvoiceRepository();
    maria = await new CreatePatient(patientRepo).execute({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
    });
  });

  const schedule = (overrides?: Partial<Parameters<ScheduleAppointment["execute"]>[0]>) =>
    new ScheduleAppointment(appointmentRepo, patientRepo).execute({
      patientId: maria.id,
      startsAt: new Date("2026-07-20T09:00:00Z"),
      endsAt: new Date("2026-07-20T10:00:00Z"),
      procedure: "Troca de bolsa de colostomia",
      priceCents: 25000,
      ...overrides,
    });

  describe("Cenário: agendar consulta", () => {
    it("Dado paciente ativo e horário livre, Quando agendar, Então consulta persistida", async () => {
      const appointment = await schedule();

      const stored = await appointmentRepo.findById(appointment.id);
      expect(stored?.status).toBe("scheduled");
    });

    it("Dado paciente inexistente, Quando agendar, Então lança NotFoundError", async () => {
      await expect(schedule({ patientId: "ghost" })).rejects.toThrow(NotFoundError);
    });

    it("Dado paciente inativo, Quando agendar, Então lança ValidationError", async () => {
      await patientRepo.save(maria.deactivate());

      await expect(schedule()).rejects.toThrow(ValidationError);
    });

    it("Dado horário ocupado, Quando agendar sobreposto, Então lança SchedulingConflictError", async () => {
      await schedule();

      await expect(
        schedule({
          startsAt: new Date("2026-07-20T09:30:00Z"),
          endsAt: new Date("2026-07-20T10:30:00Z"),
        }),
      ).rejects.toThrow(SchedulingConflictError);
    });

    it("Dado horário ocupado por consulta cancelada, Quando agendar, Então permite", async () => {
      const first = await schedule();
      await new ChangeAppointmentStatus(appointmentRepo).execute({
        id: first.id,
        action: "cancel",
      });

      await expect(schedule()).resolves.toBeTruthy();
    });
  });

  describe("Cenário: remarcar consulta", () => {
    it("Dado consulta agendada e horário livre, Quando remarcar, Então novo horário persiste", async () => {
      const appointment = await schedule();

      await new RescheduleAppointment(appointmentRepo).execute({
        id: appointment.id,
        startsAt: new Date("2026-07-21T14:00:00Z"),
        endsAt: new Date("2026-07-21T15:00:00Z"),
      });

      const stored = await appointmentRepo.findById(appointment.id);
      expect(stored?.slot.start).toEqual(new Date("2026-07-21T14:00:00Z"));
    });

    it("Dado novo horário em conflito com outra consulta, Quando remarcar, Então lança SchedulingConflictError", async () => {
      const appointment = await schedule();
      await schedule({
        startsAt: new Date("2026-07-20T11:00:00Z"),
        endsAt: new Date("2026-07-20T12:00:00Z"),
      });

      await expect(
        new RescheduleAppointment(appointmentRepo).execute({
          id: appointment.id,
          startsAt: new Date("2026-07-20T11:30:00Z"),
          endsAt: new Date("2026-07-20T12:30:00Z"),
        }),
      ).rejects.toThrow(SchedulingConflictError);
    });

    it("Dado remarcação para o mesmo horário, Quando remarcar, Então não conflita consigo mesma", async () => {
      const appointment = await schedule();

      await expect(
        new RescheduleAppointment(appointmentRepo).execute({
          id: appointment.id,
          startsAt: new Date("2026-07-20T09:15:00Z"),
          endsAt: new Date("2026-07-20T10:15:00Z"),
        }),
      ).resolves.toBeTruthy();
    });
  });

  describe("Cenário: confirmar, cancelar e registrar falta", () => {
    it("Dado consulta agendada, Quando confirmar, Então status confirmed", async () => {
      const appointment = await schedule();

      await new ChangeAppointmentStatus(appointmentRepo).execute({
        id: appointment.id,
        action: "confirm",
      });

      expect((await appointmentRepo.findById(appointment.id))?.status).toBe("confirmed");
    });

    it("Dado consulta confirmada, Quando marcar falta, Então status no_show", async () => {
      const appointment = await schedule();
      const useCase = new ChangeAppointmentStatus(appointmentRepo);
      await useCase.execute({ id: appointment.id, action: "confirm" });

      await useCase.execute({ id: appointment.id, action: "no_show" });

      expect((await appointmentRepo.findById(appointment.id))?.status).toBe("no_show");
    });

    it("Dado id inexistente, Quando mudar status, Então lança NotFoundError", async () => {
      await expect(
        new ChangeAppointmentStatus(appointmentRepo).execute({ id: "ghost", action: "cancel" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Cenário: concluir consulta gera fatura automaticamente", () => {
    it("Dado consulta confirmada, Quando concluir, Então consulta completed e fatura pendente criada", async () => {
      const appointment = await schedule();

      await new CompleteAppointment(appointmentRepo, invoiceRepo).execute({
        id: appointment.id,
      });

      const stored = await appointmentRepo.findById(appointment.id);
      expect(stored?.status).toBe("completed");

      const invoice = await invoiceRepo.findByAppointmentId(appointment.id);
      expect(invoice?.status).toBe("pending");
      expect(invoice?.amount.cents).toBe(25000);
      expect(invoice?.patientId).toBe(maria.id);
    });

    it("Dado consulta já com fatura, Quando concluir de novo após restaurar, Então não duplica fatura", async () => {
      const appointment = await schedule();
      const useCase = new CompleteAppointment(appointmentRepo, invoiceRepo);
      await useCase.execute({ id: appointment.id });

      const all = await invoiceRepo.findAll();
      expect(all).toHaveLength(1);
    });

    it("Dado consulta concluída SEM fatura (falha parcial anterior), Quando concluir de novo, Então repara criando a fatura", async () => {
      const appointment = await schedule();
      // Simula falha parcial: consulta ficou completed mas a fatura nunca foi criada.
      await appointmentRepo.save(appointment.complete());

      const useCase = new CompleteAppointment(appointmentRepo, invoiceRepo);
      await useCase.execute({ id: appointment.id });

      const invoices = await invoiceRepo.findAll();
      expect(invoices).toHaveLength(1);
      expect(invoices[0].appointmentId).toBe(appointment.id);

      // Idempotente: repetir não duplica.
      await useCase.execute({ id: appointment.id });
      expect(await invoiceRepo.findAll()).toHaveLength(1);
    });

    it("Dado consulta cancelada, Quando concluir, Então segue rejeitando (não é reparo)", async () => {
      const appointment = await schedule();
      await new ChangeAppointmentStatus(appointmentRepo).execute({
        id: appointment.id,
        action: "cancel",
      });

      await expect(
        new CompleteAppointment(appointmentRepo, invoiceRepo).execute({ id: appointment.id }),
      ).rejects.toThrow();
    });
  });

  describe("Cenário: listar agenda por período", () => {
    it("Dado consultas no mês, Quando listar período, Então retorna com nome do paciente", async () => {
      await schedule();
      await schedule({
        startsAt: new Date("2026-08-05T09:00:00Z"),
        endsAt: new Date("2026-08-05T10:00:00Z"),
      });

      const result = await new ListAppointments(appointmentRepo, patientRepo).execute({
        from: new Date("2026-07-01T00:00:00Z"),
        to: new Date("2026-08-01T00:00:00Z"),
      });

      expect(result).toHaveLength(1);
      expect(result[0].patientName).toBe("Maria da Silva");
      expect(result[0].appointment.procedure).toBe("Troca de bolsa de colostomia");
    });
  });
});
