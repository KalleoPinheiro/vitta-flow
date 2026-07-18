import { getDb } from "./persistence/drizzle/db";
import { DrizzlePatientRepository } from "./persistence/drizzle/drizzle-patient-repository";
import { DrizzleAppointmentRepository } from "./persistence/drizzle/drizzle-appointment-repository";
import { DrizzleInvoiceRepository } from "./persistence/drizzle/drizzle-invoice-repository";
import {
  DrizzleAnamnesisRepository,
  DrizzleClinicalConditionRepository,
  DrizzleConditionAssessmentRepository,
  DrizzleConditionPhotoRepository,
  DrizzleEvolutionNoteRepository,
} from "./persistence/drizzle/drizzle-clinical-repositories";
import {
  DrizzleFollowUpRepository,
  DrizzleStockMovementRepository,
  DrizzleSupplyBatchRepository,
  DrizzleSupplyRepository,
} from "./persistence/drizzle/drizzle-inventory-repositories";
import {
  GoogleCalendarGateway,
  googleCalendarConfigFromEnv,
} from "./calendar/google-calendar-gateway";
import { DrizzleGoogleAccountRepository } from "./persistence/drizzle/drizzle-google-account-repository";
import { DrizzlePartnerRepository } from "./persistence/drizzle/drizzle-partner-repository";
import { DrizzleAuditEventRepository } from "./persistence/drizzle/drizzle-audit-event-repository";
import { LocalPhotoStorage } from "./storage/local-photo-storage";
import { DrizzleReminderLogRepository } from "./persistence/drizzle/drizzle-reminder-log-repository";
import {
  MetaWhatsAppGateway,
  metaWhatsAppConfigFromEnv,
} from "./messaging/meta-whatsapp-gateway";
import {
  NullMessagingGateway,
  type MessagingGateway,
} from "@/application/ports/messaging-gateway";
import type { ReminderLogRepository } from "@/domain/messaging/reminder-log";
import { DrizzleProfessionalRepository } from "./persistence/drizzle/drizzle-professional-repository";
import type { ProfessionalRepository } from "@/domain/professional/professional-repository";
import type { PhotoStorage } from "@/application/ports/photo-storage";
import type { AuditEventRepository } from "@/domain/audit/audit-event-repository";
import type { PartnerRepository } from "@/domain/partner/partner-repository";
import { googleOAuthConfigFromEnv } from "@/lib/auth/google-oauth";
import { getAuthConfig } from "@/lib/auth/session";
import { decryptSecret } from "@/lib/auth/crypto";
import type { AppDb } from "./persistence/drizzle/db";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { InvoiceRepository } from "@/domain/billing/invoice-repository";
import type {
  AnamnesisRepository,
  ClinicalConditionRepository,
  ConditionAssessmentRepository,
  ConditionPhotoRepository,
  EvolutionNoteRepository,
} from "@/domain/clinical/clinical-repositories";
import type {
  StockMovementRepository,
  SupplyBatchRepository,
  SupplyRepository,
} from "@/domain/inventory/inventory-repositories";
import type { FollowUpRepository } from "@/domain/followup/follow-up-repository";
import {
  NullCalendarGateway,
  type CalendarGateway,
} from "@/application/ports/calendar-gateway";

export interface Services {
  patients: PatientRepository;
  partners: PartnerRepository;
  professionals: ProfessionalRepository;
  googleAccounts: DrizzleGoogleAccountRepository;
  appointments: AppointmentRepository;
  invoices: InvoiceRepository;
  anamneses: AnamnesisRepository;
  evolutions: EvolutionNoteRepository;
  conditions: ClinicalConditionRepository;
  assessments: ConditionAssessmentRepository;
  conditionPhotos: ConditionPhotoRepository;
  photoStorage: PhotoStorage;
  supplies: SupplyRepository;
  stockMovements: StockMovementRepository;
  supplyBatches: SupplyBatchRepository;
  followUps: FollowUpRepository;
  auditEvents: AuditEventRepository;
  reminderLog: ReminderLogRepository;
  calendar: CalendarGateway;
  messaging: MessagingGateway;
}

const globalForServices = globalThis as unknown as {
  vittaCalendar?: { key: string; gateway: CalendarGateway };
};

async function oauthCalendarGateway(db: AppDb): Promise<{ key: string; gateway: CalendarGateway } | null> {
  const oauthConfig = googleOAuthConfigFromEnv();
  const auth = getAuthConfig();
  if (!oauthConfig || !auth) {
    return null;
  }
  const account = await new DrizzleGoogleAccountRepository(db).findMostRecent();
  if (!account) {
    return null;
  }
  try {
    const refreshToken = decryptSecret(account.encryptedRefreshToken, auth.secret);
    return {
      key: `oauth:${account.email}:${account.connectedAt.getTime()}`,
      gateway: GoogleCalendarGateway.withOAuth({
        clientId: oauthConfig.clientId,
        clientSecret: oauthConfig.clientSecret,
        refreshToken,
        calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      }),
    };
  } catch (error) {
    console.error("Google Calendar: falha ao decifrar credencial OAuth", error);
    return null;
  }
}

/**
 * Prioridade: conta Google logada (OAuth) → service account → desativado.
 * Cache global por credencial para reaproveitar o access token do googleapis.
 */
async function buildCalendarGateway(db: AppDb): Promise<CalendarGateway> {
  const oauth = await oauthCalendarGateway(db);
  const serviceConfig = oauth ? null : googleCalendarConfigFromEnv();
  const next = oauth ?? {
    key: serviceConfig ? "service-account" : "null",
    gateway: serviceConfig
      ? GoogleCalendarGateway.withServiceAccount(serviceConfig)
      : new NullCalendarGateway(),
  };

  if (globalForServices.vittaCalendar?.key === next.key) {
    return globalForServices.vittaCalendar.gateway;
  }
  globalForServices.vittaCalendar = next;
  return next.gateway;
}

function buildMessagingGateway(): MessagingGateway {
  const config = metaWhatsAppConfigFromEnv();
  return config ? new MetaWhatsAppGateway(config) : new NullMessagingGateway();
}

export async function getRepositories(): Promise<Services> {
  const db = await getDb();
  const calendar = await buildCalendarGateway(db);
  return {
    patients: new DrizzlePatientRepository(db),
    partners: new DrizzlePartnerRepository(db),
    professionals: new DrizzleProfessionalRepository(db),
    googleAccounts: new DrizzleGoogleAccountRepository(db),
    appointments: new DrizzleAppointmentRepository(db),
    invoices: new DrizzleInvoiceRepository(db),
    anamneses: new DrizzleAnamnesisRepository(db),
    evolutions: new DrizzleEvolutionNoteRepository(db),
    conditions: new DrizzleClinicalConditionRepository(db),
    assessments: new DrizzleConditionAssessmentRepository(db),
    conditionPhotos: new DrizzleConditionPhotoRepository(db),
    photoStorage: new LocalPhotoStorage(),
    supplies: new DrizzleSupplyRepository(db),
    stockMovements: new DrizzleStockMovementRepository(db),
    supplyBatches: new DrizzleSupplyBatchRepository(db),
    followUps: new DrizzleFollowUpRepository(db),
    auditEvents: new DrizzleAuditEventRepository(db),
    reminderLog: new DrizzleReminderLogRepository(db),
    calendar,
    messaging: buildMessagingGateway(),
  };
}
