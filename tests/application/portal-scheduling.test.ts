import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPatientRepository } from "@/infrastructure/persistence/in-memory/in-memory-patient-repository";
import { InMemoryAppointmentRepository } from "@/infrastructure/persistence/in-memory/in-memory-appointment-repository";
import { InMemoryProcedureRepository } from "@/infrastructure/persistence/in-memory/in-memory-foundation-repositories";
import { CreatePatient } from "@/application/patients/create-patient";
import { ScheduleAppointment } from "@/application/appointments/schedule-appointment";
import { ListAvailableSlots } from "@/application/portal/list-available-slots";
import { Procedure } from "@/domain/catalog/procedure";
import type { Patient } from "@/domain/patient/patient";
import { NotFoundError } from "@/domain/shared/errors";

// 2026-07-20 = segunda; 2026-07-25 = sábado. Testes rodam com TZ=UTC.
describe("Feature: Horários disponíveis para o paciente agendar (PORT4-01..03)", () => {
  let patientRepo: InMemoryPatientRepository;
  let appointmentRepo: InMemoryAppointmentRepository;
  let procedureRepo: InMemoryProcedureRepository;
  let maria: Patient;
  let curativo: Procedure;
  const now = new Date("2026-07-19T12:00:00Z");

  beforeEach(async () => {
    patientRepo = new InMemoryPatientRepository();
    appointmentRepo = new InMemoryAppointmentRepository();
    procedureRepo = new InMemoryProcedureRepository();
    maria = await new CreatePatient(patientRepo).execute({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
    });
    // 60 min → slots de hora em hora entre 08:00 e 18:00 (grade padrão).
    curativo = Procedure.create({ name: "Curativo", priceCents: 15000, durationMinutes: 60 });
    await procedureRepo.save(curativo);
  });

  const listSlots = (date: string, email = "maria@example.com", procedureId = curativo.id) =>
    new ListAvailableSlots(patientRepo, appointmentRepo, procedureRepo).execute({
      email,
      procedureId,
      date,
      now,
    });

  it("Dado dia útil livre, Quando listar, Então oferta slots da grade do primeiro ao último horário", async () => {
    const slots = await listSlots("2026-07-20");

    expect(slots).toHaveLength(10);
    expect(slots[0].startsAt.toISOString()).toBe("2026-07-20T08:00:00.000Z");
    expect(slots[0].endsAt.toISOString()).toBe("2026-07-20T09:00:00.000Z");
    expect(slots[slots.length - 1].startsAt.toISOString()).toBe("2026-07-20T17:00:00.000Z");
    expect(slots[slots.length - 1].endsAt.toISOString()).toBe("2026-07-20T18:00:00.000Z");
  });

  it("Dado consulta existente, Quando listar, Então o horário ocupado e o vizinho sem folga somem (PORT4-01)", async () => {
    await new ScheduleAppointment(appointmentRepo, patientRepo).execute({
      patientId: maria.id,
      startsAt: new Date("2026-07-20T10:00:00Z"),
      endsAt: new Date("2026-07-20T11:00:00Z"),
      procedure: "Troca de bolsa",
      priceCents: 25000,
    });

    const starts = (await listSlots("2026-07-20")).map((s) => s.startsAt.toISOString());

    // 10:00 ocupado; 09:00 e 11:00 encostam sem a folga mínima de 15 min.
    expect(starts).not.toContain("2026-07-20T10:00:00.000Z");
    expect(starts).not.toContain("2026-07-20T09:00:00.000Z");
    expect(starts).not.toContain("2026-07-20T11:00:00.000Z");
    expect(starts).toContain("2026-07-20T08:00:00.000Z");
    expect(starts).toContain("2026-07-20T12:00:00.000Z");
  });

  it("Dado sábado (fora da grade), Quando listar, Então lista vazia (PORT4-02)", async () => {
    expect(await listSlots("2026-07-25")).toEqual([]);
  });

  it("Dado data em formato inválido, Quando listar, Então lista vazia", async () => {
    expect(await listSlots("25/07/2026")).toEqual([]);
  });

  it("Dado procedimento inativo, Quando listar, Então NotFoundError (PORT4-03)", async () => {
    const inativo = Procedure.create({
      name: "Descontinuado",
      priceCents: 1000,
      durationMinutes: 30,
    });
    await procedureRepo.save(inativo.deactivate());

    await expect(listSlots("2026-07-20", "maria@example.com", inativo.id)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("Dado procedimento inexistente, Quando listar, Então NotFoundError (PORT4-03)", async () => {
    await expect(listSlots("2026-07-20", "maria@example.com", "nao-existe")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("Dado email sem paciente ativo, Quando listar, Então NotFoundError (escopo da sessão)", async () => {
    await expect(listSlots("2026-07-20", "estranho@example.com")).rejects.toThrow(NotFoundError);

    await patientRepo.save(maria.deactivate());
    await expect(listSlots("2026-07-20")).rejects.toThrow(NotFoundError);
  });

  it("Dado dia corrente com horários já passados, Quando listar, Então só oferta o futuro (edge case)", async () => {
    const slots = await new ListAvailableSlots(
      patientRepo,
      appointmentRepo,
      procedureRepo,
    ).execute({
      email: "maria@example.com",
      procedureId: curativo.id,
      date: "2026-07-20",
      now: new Date("2026-07-20T13:30:00Z"),
    });

    expect(slots[0].startsAt.toISOString()).toBe("2026-07-20T14:00:00.000Z");
    expect(slots.map((s) => s.startsAt.toISOString())).not.toContain("2026-07-20T08:00:00.000Z");
  });

  it("Dado procedimento de 30 min, Quando listar, Então o passo acompanha a duração do catálogo", async () => {
    const rapido = Procedure.create({
      name: "Avaliação rápida",
      priceCents: 8000,
      durationMinutes: 30,
    });
    await procedureRepo.save(rapido);

    const slots = await listSlots("2026-07-20", "maria@example.com", rapido.id);

    expect(slots).toHaveLength(20);
    expect(slots[1].startsAt.toISOString()).toBe("2026-07-20T08:30:00.000Z");
  });
});
