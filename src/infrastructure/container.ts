import { getDb } from "./persistence/drizzle/db";
import { DrizzlePatientRepository } from "./persistence/drizzle/drizzle-patient-repository";
import { DrizzleAppointmentRepository } from "./persistence/drizzle/drizzle-appointment-repository";
import { DrizzleInvoiceRepository } from "./persistence/drizzle/drizzle-invoice-repository";
import {
  DrizzleAnamnesisRepository,
  DrizzleClinicalConditionRepository,
  DrizzleConditionAssessmentRepository,
  DrizzleEvolutionNoteRepository,
} from "./persistence/drizzle/drizzle-clinical-repositories";
import {
  DrizzleFollowUpRepository,
  DrizzleStockMovementRepository,
  DrizzleSupplyRepository,
} from "./persistence/drizzle/drizzle-inventory-repositories";
import {
  GoogleCalendarGateway,
  googleCalendarConfigFromEnv,
} from "./calendar/google-calendar-gateway";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { InvoiceRepository } from "@/domain/billing/invoice-repository";
import type {
  AnamnesisRepository,
  ClinicalConditionRepository,
  ConditionAssessmentRepository,
  EvolutionNoteRepository,
} from "@/domain/clinical/clinical-repositories";
import type {
  StockMovementRepository,
  SupplyRepository,
} from "@/domain/inventory/inventory-repositories";
import type { FollowUpRepository } from "@/domain/followup/follow-up-repository";
import {
  NullCalendarGateway,
  type CalendarGateway,
} from "@/application/ports/calendar-gateway";

export interface Services {
  patients: PatientRepository;
  appointments: AppointmentRepository;
  invoices: InvoiceRepository;
  anamneses: AnamnesisRepository;
  evolutions: EvolutionNoteRepository;
  conditions: ClinicalConditionRepository;
  assessments: ConditionAssessmentRepository;
  supplies: SupplyRepository;
  stockMovements: StockMovementRepository;
  followUps: FollowUpRepository;
  calendar: CalendarGateway;
}

function buildCalendarGateway(): CalendarGateway {
  const config = googleCalendarConfigFromEnv();
  return config ? new GoogleCalendarGateway(config) : new NullCalendarGateway();
}

const globalForServices = globalThis as unknown as { vittaCalendar?: CalendarGateway };

export async function getRepositories(): Promise<Services> {
  const db = await getDb();
  if (!globalForServices.vittaCalendar) {
    globalForServices.vittaCalendar = buildCalendarGateway();
  }
  return {
    patients: new DrizzlePatientRepository(db),
    appointments: new DrizzleAppointmentRepository(db),
    invoices: new DrizzleInvoiceRepository(db),
    anamneses: new DrizzleAnamnesisRepository(db),
    evolutions: new DrizzleEvolutionNoteRepository(db),
    conditions: new DrizzleClinicalConditionRepository(db),
    assessments: new DrizzleConditionAssessmentRepository(db),
    supplies: new DrizzleSupplyRepository(db),
    stockMovements: new DrizzleStockMovementRepository(db),
    followUps: new DrizzleFollowUpRepository(db),
    calendar: globalForServices.vittaCalendar,
  };
}
