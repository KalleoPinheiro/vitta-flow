import { describe, it, expect, beforeEach } from "vitest";
import { Procedure } from "@/domain/catalog/procedure";
import { UserAccount } from "@/domain/auth/user-account";
import {
  DEFAULT_SCHEDULE_CONFIG,
  validateScheduleConfig,
} from "@/domain/scheduling/schedule-config";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  InMemoryProcedureRepository,
  InMemoryScheduleConfigRepository,
} from "@/infrastructure/persistence/in-memory/in-memory-foundation-repositories";
import { InMemoryPatientRepository } from "@/infrastructure/persistence/in-memory/in-memory-patient-repository";
import { InMemoryAppointmentRepository } from "@/infrastructure/persistence/in-memory/in-memory-appointment-repository";
import { CreatePatient } from "@/application/patients/create-patient";
import { ScheduleAppointment } from "@/application/appointments/schedule-appointment";
import { ValidationError } from "@/domain/shared/errors";
import type { Patient } from "@/domain/patient/patient";

describe("Feature O1.1: Catálogo de procedimentos", () => {
  let repo: InMemoryProcedureRepository;

  beforeEach(() => {
    repo = new InMemoryProcedureRepository();
  });

  it("Dado procedimento válido, Quando criar, Então persiste com preço e duração", async () => {
    const procedure = Procedure.create({
      name: "Troca de bolsa",
      priceCents: 25000,
      durationMinutes: 60,
    });
    await repo.save(procedure);

    expect(await repo.findByName("TROCA DE BOLSA")).not.toBeNull();
  });

  it("Dado nome vazio ou duração inválida, Quando criar, Então ValidationError", () => {
    expect(() =>
      Procedure.create({ name: " ", priceCents: 100, durationMinutes: 60 }),
    ).toThrow(ValidationError);
    expect(() =>
      Procedure.create({ name: "X", priceCents: 100, durationMinutes: 0 }),
    ).toThrow(ValidationError);
    expect(() =>
      Procedure.create({ name: "X", priceCents: -1, durationMinutes: 60 }),
    ).toThrow(ValidationError);
  });

  it("Dado procedimento desativado, Quando reativar, Então volta ao catálogo", () => {
    const procedure = Procedure.create({ name: "X", priceCents: 0, durationMinutes: 30 });
    expect(procedure.deactivate().isActive).toBe(false);
    expect(procedure.deactivate().reactivate().isActive).toBe(true);
  });
});

describe("Feature O1.2: Contas individuais (senha scrypt)", () => {
  it("Dado senha, Quando hashear, Então verifica a correta e rejeita a errada", async () => {
    const hash = await hashPassword("senha-secreta-123");

    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain("senha-secreta-123");
    expect(await verifyPassword("senha-secreta-123", hash)).toBe(true);
    expect(await verifyPassword("senha-errada", hash)).toBe(false);
  });

  it("Dado hash em formato inválido, Quando verificar, Então retorna false sem lançar", async () => {
    expect(await verifyPassword("x", "texto-qualquer")).toBe(false);
    expect(await verifyPassword("x", "scrypt$abc$def")).toBe(false);
  });

  it("Dado email inválido ou hash cru, Quando criar conta, Então ValidationError", async () => {
    const hash = await hashPassword("12345678");
    expect(() => UserAccount.create({ email: "sem-arroba", passwordHash: hash })).toThrow(
      ValidationError,
    );
    expect(() =>
      UserAccount.create({ email: "a@b.com", passwordHash: "senha-em-claro" }),
    ).toThrow(ValidationError);
  });

  it("Dado email com maiúsculas, Quando criar, Então normaliza para minúsculas", async () => {
    const account = UserAccount.create({
      email: "Ana.Costa@Clinica.COM",
      passwordHash: await hashPassword("12345678"),
    });
    expect(account.email).toBe("ana.costa@clinica.com");
  });
});

describe("Feature O1.3: Grade de horários configurável", () => {
  let patientRepo: InMemoryPatientRepository;
  let appointmentRepo: InMemoryAppointmentRepository;
  let configRepo: InMemoryScheduleConfigRepository;
  let maria: Patient;

  beforeEach(async () => {
    patientRepo = new InMemoryPatientRepository();
    appointmentRepo = new InMemoryAppointmentRepository();
    configRepo = new InMemoryScheduleConfigRepository();
    maria = await new CreatePatient(patientRepo).execute({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
    });
  });

  // 2026-07-25 é sábado (TZ=UTC nos testes).
  const scheduleSaturday = () =>
    new ScheduleAppointment(appointmentRepo, patientRepo, configRepo).execute({
      patientId: maria.id,
      startsAt: new Date("2026-07-25T09:00:00Z"),
      endsAt: new Date("2026-07-25T10:00:00Z"),
      procedure: "Curativo",
      priceCents: 10000,
    });

  it("Dado grade padrão, Quando agendar sábado, Então ValidationError", async () => {
    await expect(scheduleSaturday()).rejects.toThrow(ValidationError);
  });

  it("Dado grade com sábado habilitado, Quando agendar sábado, Então agenda", async () => {
    await configRepo.save(
      validateScheduleConfig({ ...DEFAULT_SCHEDULE_CONFIG, weekdays: [1, 2, 3, 4, 5, 6] }),
    );

    await expect(scheduleSaturday()).resolves.toBeTruthy();
  });

  it("Dado configuração inválida, Quando validar, Então ValidationError", () => {
    expect(() => validateScheduleConfig({ ...DEFAULT_SCHEDULE_CONFIG, weekdays: [] })).toThrow(
      ValidationError,
    );
    expect(() =>
      validateScheduleConfig({ ...DEFAULT_SCHEDULE_CONFIG, startHour: 18, endHour: 8 }),
    ).toThrow(ValidationError);
    expect(() =>
      validateScheduleConfig({ ...DEFAULT_SCHEDULE_CONFIG, minGapMinutes: 5 }),
    ).toThrow(ValidationError);
  });
});
