import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPatientRepository } from "@/infrastructure/persistence/in-memory/in-memory-patient-repository";
import { InMemoryAppointmentRepository } from "@/infrastructure/persistence/in-memory/in-memory-appointment-repository";
import { InMemoryProfessionalRepository } from "@/infrastructure/persistence/in-memory/in-memory-professional-repository";
import { InMemoryEvolutionNoteRepository } from "@/infrastructure/persistence/in-memory/in-memory-clinical-repositories";
import { CreatePatient } from "@/application/patients/create-patient";
import { ScheduleAppointment } from "@/application/appointments/schedule-appointment";
import { ListAppointments } from "@/application/appointments/list-appointments";
import { AddEvolutionNote } from "@/application/clinical/add-evolution-note";
import { Professional } from "@/domain/professional/professional";
import { ValidationError } from "@/domain/shared/errors";
import type { Patient } from "@/domain/patient/patient";

// 2026-07-20 é segunda-feira; horários em UTC (testes rodam com TZ=UTC).
describe("Feature: Multi-profissional — atribuição em consultas e autoria em evoluções", () => {
  let patientRepo: InMemoryPatientRepository;
  let appointmentRepo: InMemoryAppointmentRepository;
  let professionalRepo: InMemoryProfessionalRepository;
  let maria: Patient;
  let ana: Professional;

  beforeEach(async () => {
    patientRepo = new InMemoryPatientRepository();
    appointmentRepo = new InMemoryAppointmentRepository();
    professionalRepo = new InMemoryProfessionalRepository();
    maria = await new CreatePatient(patientRepo).execute({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
    });
    ana = Professional.create({ fullName: "Enf. Ana Costa", registry: "COREN-SP 123456" });
    await professionalRepo.save(ana);
  });

  const schedule = (hour: number, professionalId: string | null) =>
    new ScheduleAppointment(appointmentRepo, patientRepo).execute({
      patientId: maria.id,
      startsAt: new Date(`2026-07-20T${String(hour).padStart(2, "0")}:00:00Z`),
      endsAt: new Date(`2026-07-20T${String(hour + 1).padStart(2, "0")}:00:00Z`),
      procedure: "Troca de bolsa",
      priceCents: 25000,
      professionalId,
    });

  it("Dado agendamento com profissional, Quando salvar, Então atribuição persiste", async () => {
    const appointment = await schedule(9, ana.id);

    const stored = await appointmentRepo.findById(appointment.id);
    expect(stored?.professionalId).toBe(ana.id);
  });

  it("Dado agendamento sem profissional, Quando salvar, Então continua válido (retrocompatível)", async () => {
    const appointment = await schedule(9, null);
    expect(appointment.professionalId).toBeNull();
  });

  it("Dado consultas de dois profissionais, Quando filtrar agenda, Então retorna só as do filtro", async () => {
    const bruno = Professional.create({ fullName: "Enf. Bruno Lima" });
    await professionalRepo.save(bruno);
    await schedule(9, ana.id);
    await schedule(11, bruno.id);
    await schedule(14, null);

    const result = await new ListAppointments(appointmentRepo, patientRepo).execute({
      from: new Date("2026-07-20T00:00:00Z"),
      to: new Date("2026-07-21T00:00:00Z"),
      professionalId: ana.id,
    });

    expect(result).toHaveLength(1);
    expect(result[0].appointment.professionalId).toBe(ana.id);
  });

  it("Dado evolução com autor, Quando registrar, Então autoria persiste (imutável)", async () => {
    const evolutionRepo = new InMemoryEvolutionNoteRepository();
    const note = await new AddEvolutionNote(evolutionRepo, patientRepo).execute({
      patientId: maria.id,
      professionalId: ana.id,
      subjective: "Paciente refere melhora",
      objective: "",
      assessment: "",
      plan: "",
    });

    expect(note.professionalId).toBe(ana.id);
  });

  it("Dado nome vazio, Quando criar profissional, Então ValidationError", () => {
    expect(() => Professional.create({ fullName: "  " })).toThrow(ValidationError);
  });

  it("Dado profissional desativado, Quando reativar, Então volta a ativo", () => {
    const inactive = ana.deactivate();
    expect(inactive.isActive).toBe(false);
    expect(inactive.reactivate().isActive).toBe(true);
  });
});
