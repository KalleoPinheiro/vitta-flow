import type { Patient } from "@/domain/patient/patient";
import type { Appointment } from "@/domain/scheduling/appointment";
import type { Invoice } from "@/domain/billing/invoice";

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
