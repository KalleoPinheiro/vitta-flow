import type { Patient } from "@/domain/patient/patient";
import type { Appointment } from "@/domain/scheduling/appointment";
import type { Invoice } from "@/domain/billing/invoice";
import type { Anamnesis } from "@/domain/clinical/anamnesis";
import type { EvolutionNote } from "@/domain/clinical/evolution-note";
import type { ClinicalCondition } from "@/domain/clinical/clinical-condition";
import type { ConditionAssessment } from "@/domain/clinical/condition-assessment";
import type { Supply } from "@/domain/inventory/supply";
import type { StockMovement } from "@/domain/inventory/stock-movement";
import type { FollowUp } from "@/domain/followup/follow-up";

export interface PatientDto {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
}

export const toPatientDto = (patient: Patient): PatientDto => ({
  id: patient.id,
  fullName: patient.fullName,
  email: patient.email,
  phone: patient.phone,
  birthDate: patient.birthDate?.toISOString() ?? null,
  notes: patient.notes,
  active: patient.isActive,
  createdAt: patient.createdAt.toISOString(),
});

export interface AppointmentDto {
  id: string;
  patientId: string;
  patientName?: string;
  startsAt: string;
  endsAt: string;
  procedure: string;
  priceCents: number;
  notes: string | null;
  status: string;
}

export const toAppointmentDto = (
  appointment: Appointment,
  patientName?: string,
): AppointmentDto => ({
  id: appointment.id,
  patientId: appointment.patientId,
  patientName,
  startsAt: appointment.slot.start.toISOString(),
  endsAt: appointment.slot.end.toISOString(),
  procedure: appointment.procedure,
  priceCents: appointment.price.cents,
  notes: appointment.notes,
  status: appointment.status,
});

export interface InvoiceDto {
  id: string;
  patientId: string;
  patientName?: string;
  appointmentId: string | null;
  description: string;
  amountCents: number;
  status: string;
  issuedAt: string;
  dueDate: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
}

export interface AnamnesisDto {
  patientId: string;
  comorbidities: string;
  allergies: string;
  medications: string;
  surgicalHistory: string;
  notes: string;
  updatedAt: string;
}

export const toAnamnesisDto = (anamnesis: Anamnesis): AnamnesisDto => ({
  patientId: anamnesis.patientId,
  comorbidities: anamnesis.comorbidities,
  allergies: anamnesis.allergies,
  medications: anamnesis.medications,
  surgicalHistory: anamnesis.surgicalHistory,
  notes: anamnesis.notes,
  updatedAt: anamnesis.updatedAt.toISOString(),
});

export interface EvolutionNoteDto {
  id: string;
  patientId: string;
  appointmentId: string | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  createdAt: string;
}

export const toEvolutionNoteDto = (note: EvolutionNote): EvolutionNoteDto => ({
  id: note.id,
  patientId: note.patientId,
  appointmentId: note.appointmentId,
  subjective: note.subjective,
  objective: note.objective,
  assessment: note.assessment,
  plan: note.plan,
  createdAt: note.createdAt.toISOString(),
});

export interface ConditionDto {
  id: string;
  patientId: string;
  kind: string;
  title: string;
  stomaType: string | null;
  startedAt: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

export const toConditionDto = (condition: ClinicalCondition): ConditionDto => ({
  id: condition.id,
  patientId: condition.patientId,
  kind: condition.kind,
  title: condition.title,
  stomaType: condition.stomaType,
  startedAt: condition.startedAt?.toISOString() ?? null,
  notes: condition.notes,
  status: condition.status,
  createdAt: condition.createdAt.toISOString(),
});

export interface AssessmentDto {
  id: string;
  conditionId: string;
  lengthMm: number | null;
  widthMm: number | null;
  depthMm: number | null;
  areaMm2: number | null;
  tissueType: string | null;
  exudate: string | null;
  painScale: number | null;
  skinCondition: string | null;
  complications: string | null;
  notes: string | null;
  createdAt: string;
}

export const toAssessmentDto = (assessment: ConditionAssessment): AssessmentDto => ({
  id: assessment.id,
  conditionId: assessment.conditionId,
  lengthMm: assessment.lengthMm,
  widthMm: assessment.widthMm,
  depthMm: assessment.depthMm,
  areaMm2: assessment.areaMm2,
  tissueType: assessment.tissueType,
  exudate: assessment.exudate,
  painScale: assessment.painScale,
  skinCondition: assessment.skinCondition,
  complications: assessment.complications,
  notes: assessment.notes,
  createdAt: assessment.createdAt.toISOString(),
});

export interface SupplyDto {
  id: string;
  name: string;
  unit: string;
  minQty: number;
  priceCents: number;
  stockQty: number;
  isLowStock: boolean;
  active: boolean;
}

export const toSupplyDto = (supply: Supply): SupplyDto => ({
  id: supply.id,
  name: supply.name,
  unit: supply.unit,
  minQty: supply.minQty,
  priceCents: supply.priceCents,
  stockQty: supply.stockQty,
  isLowStock: supply.isLowStock,
  active: supply.isActive,
});

export interface StockMovementDto {
  id: string;
  supplyId: string;
  type: string;
  quantity: number;
  reason: string;
  createdAt: string;
}

export const toStockMovementDto = (movement: StockMovement): StockMovementDto => ({
  id: movement.id,
  supplyId: movement.supplyId,
  type: movement.type,
  quantity: movement.quantity,
  reason: movement.reason,
  createdAt: movement.createdAt.toISOString(),
});

export interface FollowUpDto {
  id: string;
  patientId: string;
  patientName?: string;
  appointmentId: string | null;
  dueDate: string;
  reason: string;
  status: string;
  isOverdue?: boolean;
}

export const toFollowUpDto = (
  followUp: FollowUp,
  patientName?: string,
  isOverdue?: boolean,
): FollowUpDto => ({
  id: followUp.id,
  patientId: followUp.patientId,
  patientName,
  appointmentId: followUp.appointmentId,
  dueDate: followUp.dueDate.toISOString(),
  reason: followUp.reason,
  status: followUp.status,
  isOverdue,
});

export const toInvoiceDto = (invoice: Invoice, patientName?: string): InvoiceDto => ({
  id: invoice.id,
  patientId: invoice.patientId,
  patientName,
  appointmentId: invoice.appointmentId,
  description: invoice.description,
  amountCents: invoice.amount.cents,
  status: invoice.status,
  issuedAt: invoice.issuedAt.toISOString(),
  dueDate: invoice.dueDate?.toISOString() ?? null,
  paidAt: invoice.paidAt?.toISOString() ?? null,
  paymentMethod: invoice.paymentMethod,
});
