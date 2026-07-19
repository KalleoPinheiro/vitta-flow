import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/infrastructure/persistence/drizzle/schema";
import type { AppDb } from "@/infrastructure/persistence/drizzle/db";
import { DrizzlePatientRepository } from "@/infrastructure/persistence/drizzle/drizzle-patient-repository";
import { DrizzleAppointmentRepository } from "@/infrastructure/persistence/drizzle/drizzle-appointment-repository";
import { DrizzleInvoiceRepository } from "@/infrastructure/persistence/drizzle/drizzle-invoice-repository";
import { Patient } from "@/domain/patient/patient";
import { Appointment } from "@/domain/scheduling/appointment";
import { Invoice } from "@/domain/billing/invoice";
import { Money } from "@/domain/shared/money";
import { TimeSlot } from "@/domain/shared/time-slot";
import { SchedulingConflictError } from "@/domain/shared/errors";

const slot = (startIso: string, endIso: string) =>
  TimeSlot.create(new Date(startIso), new Date(endIso));

describe("Feature: Persistência PostgreSQL (Drizzle)", () => {
  let db: PgliteDatabase<typeof schema>;
  let patientRepo: DrizzlePatientRepository;
  let appointmentRepo: DrizzleAppointmentRepository;
  let invoiceRepo: DrizzleInvoiceRepository;

  beforeAll(async () => {
    const client = new PGlite({ extensions: { pg_trgm, btree_gist } });
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    const appDb = db as unknown as AppDb;
    patientRepo = new DrizzlePatientRepository(appDb);
    appointmentRepo = new DrizzleAppointmentRepository(appDb);
    invoiceRepo = new DrizzleInvoiceRepository(appDb);
  });

  beforeEach(async () => {
    await db.delete(schema.invoices);
    await db.delete(schema.appointments);
    await db.delete(schema.patients);
  });

  const savedPatient = async () => {
    const patient = Patient.create({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
      birthDate: new Date("1980-03-10T00:00:00Z"),
      notes: "Colostomia desde 2024",
    });
    await patientRepo.save(patient);
    return patient;
  };

  describe("Cenário: paciente ida e volta (roundtrip)", () => {
    it("Dado paciente salvo, Quando buscar por id, Então todos os campos preservados", async () => {
      const patient = await savedPatient();

      const stored = await patientRepo.findById(patient.id);

      expect(stored?.fullName).toBe("Maria da Silva");
      expect(stored?.email).toBe("maria@example.com");
      expect(stored?.birthDate).toEqual(new Date("1980-03-10T00:00:00Z"));
      expect(stored?.notes).toBe("Colostomia desde 2024");
      expect(stored?.isActive).toBe(true);
    });

    it("Dado paciente atualizado, Quando salvar de novo, Então sobrescreve (upsert)", async () => {
      const patient = await savedPatient();

      await patientRepo.save(patient.update({ phone: "11700001111" }).deactivate());

      const stored = await patientRepo.findById(patient.id);
      expect(stored?.phone).toBe("11700001111");
      expect(stored?.isActive).toBe(false);
    });

    it("Dado busca por email e por termo, Quando consultar, Então encontra", async () => {
      await savedPatient();

      expect(await patientRepo.findByEmail("maria@example.com")).not.toBeNull();
      expect(await patientRepo.findAll("mari")).toHaveLength(1);
      expect(await patientRepo.findAll("inexistente")).toHaveLength(0);
    });
  });

  describe("Cenário: consulta ida e volta com conflitos e googleEventId", () => {
    it("Dado consulta salva com googleEventId, Quando buscar, Então campos preservados", async () => {
      const patient = await savedPatient();
      const appointment = Appointment.create({
        patientId: patient.id,
        slot: slot("2026-07-20T09:00:00Z", "2026-07-20T10:00:00Z"),
        procedure: "Troca de bolsa",
        price: Money.fromCents(25000),
      })
        .confirm()
        .withGoogleEventId("gcal-123");
      await appointmentRepo.save(appointment);

      const stored = await appointmentRepo.findById(appointment.id);

      expect(stored?.status).toBe("confirmed");
      expect(stored?.price.cents).toBe(25000);
      expect(stored?.googleEventId).toBe("gcal-123");
      expect(stored?.slot.start).toEqual(new Date("2026-07-20T09:00:00Z"));
    });

    it("Dado consultas no banco, Quando buscar conflito, Então respeita status e exclusão", async () => {
      const patient = await savedPatient();
      const appointment = Appointment.create({
        patientId: patient.id,
        slot: slot("2026-07-20T09:00:00Z", "2026-07-20T10:00:00Z"),
        procedure: "Troca de bolsa",
        price: Money.fromCents(25000),
      });
      await appointmentRepo.save(appointment);

      const overlapping = slot("2026-07-20T09:30:00Z", "2026-07-20T10:30:00Z");
      expect(await appointmentRepo.findConflicting(overlapping)).toHaveLength(1);
      expect(await appointmentRepo.findConflicting(overlapping, appointment.id)).toHaveLength(0);

      await appointmentRepo.save(appointment.cancel());
      expect(await appointmentRepo.findConflicting(overlapping)).toHaveLength(0);
    });

    it("Dado consultas em datas distintas, Quando buscar por período, Então filtra corretamente", async () => {
      const patient = await savedPatient();
      const july = Appointment.create({
        patientId: patient.id,
        slot: slot("2026-07-20T09:00:00Z", "2026-07-20T10:00:00Z"),
        procedure: "Troca de bolsa",
        price: Money.fromCents(25000),
      });
      const august = Appointment.create({
        patientId: patient.id,
        slot: slot("2026-08-05T09:00:00Z", "2026-08-05T10:00:00Z"),
        procedure: "Avaliação",
        price: Money.fromCents(20000),
      });
      await appointmentRepo.save(july);
      await appointmentRepo.save(august);

      const result = await appointmentRepo.findInRange(
        new Date("2026-07-01T00:00:00Z"),
        new Date("2026-08-01T00:00:00Z"),
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(july.id);
      expect(await appointmentRepo.findByPatientId(patient.id)).toHaveLength(2);
    });
  });

  describe("Cenário: constraint do banco impede double-booking (TOCTOU)", () => {
    const makeAppointment = (patientId: string, startIso: string, endIso: string) =>
      Appointment.create({
        patientId,
        slot: slot(startIso, endIso),
        procedure: "Troca de bolsa",
        price: Money.fromCents(25000),
      });

    it("Dado consulta ativa, Quando inserir sobreposta direto no banco, Então SchedulingConflictError", async () => {
      const patient = await savedPatient();
      await appointmentRepo.save(
        makeAppointment(patient.id, "2026-07-20T09:00:00Z", "2026-07-20T10:00:00Z"),
      );

      await expect(
        appointmentRepo.save(
          makeAppointment(patient.id, "2026-07-20T09:30:00Z", "2026-07-20T10:30:00Z"),
        ),
      ).rejects.toThrow(SchedulingConflictError);
    });

    it("Dado consulta ativa, Quando inserir com folga de 10min, Então banco rejeita; com 15min, aceita", async () => {
      const patient = await savedPatient();
      await appointmentRepo.save(
        makeAppointment(patient.id, "2026-07-20T09:00:00Z", "2026-07-20T10:00:00Z"),
      );

      await expect(
        appointmentRepo.save(
          makeAppointment(patient.id, "2026-07-20T10:10:00Z", "2026-07-20T11:00:00Z"),
        ),
      ).rejects.toThrow(SchedulingConflictError);
      await expect(
        appointmentRepo.save(
          makeAppointment(patient.id, "2026-07-20T10:15:00Z", "2026-07-20T11:00:00Z"),
        ),
      ).resolves.toBeUndefined();
    });

    it("Dado consulta cancelada no horário, Quando inserir sobreposta, Então banco aceita", async () => {
      const patient = await savedPatient();
      await appointmentRepo.save(
        makeAppointment(patient.id, "2026-07-20T09:00:00Z", "2026-07-20T10:00:00Z").cancel(),
      );

      await expect(
        appointmentRepo.save(
          makeAppointment(patient.id, "2026-07-20T09:00:00Z", "2026-07-20T10:00:00Z"),
        ),
      ).resolves.toBeUndefined();
    });

    it("Dado a própria consulta, Quando atualizar (upsert) mesmo horário, Então não conflita consigo", async () => {
      const patient = await savedPatient();
      const appointment = makeAppointment(
        patient.id,
        "2026-07-20T09:00:00Z",
        "2026-07-20T10:00:00Z",
      );
      await appointmentRepo.save(appointment);

      await expect(appointmentRepo.save(appointment.confirm())).resolves.toBeUndefined();
    });
  });

  describe("Cenário: fatura ida e volta com filtros", () => {
    it("Dado fatura paga salva, Quando buscar, Então método e data de pagamento preservados", async () => {
      const patient = await savedPatient();
      const invoice = Invoice.create({
        patientId: patient.id,
        description: "Consulta",
        amount: Money.fromCents(25000),
        appointmentId: "appt-1",
      }).markPaid("pix", new Date("2026-07-15T12:00:00Z"));
      await invoiceRepo.save(invoice);

      const stored = await invoiceRepo.findById(invoice.id);

      expect(stored?.status).toBe("paid");
      expect(stored?.paymentMethod).toBe("pix");
      expect(stored?.paidAt).toEqual(new Date("2026-07-15T12:00:00Z"));
      expect(await invoiceRepo.findByAppointmentId("appt-1")).not.toBeNull();
    });

    it("Dado faturas variadas, Quando filtrar por status e período, Então retorna subconjunto", async () => {
      const patient = await savedPatient();
      const pending = Invoice.create({
        patientId: patient.id,
        description: "A",
        amount: Money.fromCents(10000),
      });
      const paid = Invoice.create({
        patientId: patient.id,
        description: "B",
        amount: Money.fromCents(20000),
      }).markPaid("cash");
      await invoiceRepo.save(pending);
      await invoiceRepo.save(paid);

      expect(await invoiceRepo.findAll({ status: "paid" })).toHaveLength(1);
      expect(await invoiceRepo.findAll({ patientId: patient.id })).toHaveLength(2);
      expect(
        await invoiceRepo.findAll({ from: new Date(Date.now() + 86_400_000) }),
      ).toHaveLength(0);
    });
  });
});
