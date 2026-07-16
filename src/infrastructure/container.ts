import { getDb } from "./persistence/sqlite/db";
import { SqlitePatientRepository } from "./persistence/sqlite/sqlite-patient-repository";
import { SqliteAppointmentRepository } from "./persistence/sqlite/sqlite-appointment-repository";
import { SqliteInvoiceRepository } from "./persistence/sqlite/sqlite-invoice-repository";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { InvoiceRepository } from "@/domain/billing/invoice-repository";

export interface Repositories {
  patients: PatientRepository;
  appointments: AppointmentRepository;
  invoices: InvoiceRepository;
}

export function getRepositories(): Repositories {
  const db = getDb();
  return {
    patients: new SqlitePatientRepository(db),
    appointments: new SqliteAppointmentRepository(db),
    invoices: new SqliteInvoiceRepository(db),
  };
}
