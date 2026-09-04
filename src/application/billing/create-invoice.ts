import { Invoice } from '@/domain/billing/invoice';
import type { InvoiceRepository } from '@/domain/billing/invoice-repository';
import type { PatientRepository } from '@/domain/patient/patient-repository';
import { NotFoundError } from '@/domain/shared/errors';
import { Money } from '@/domain/shared/money';

export interface CreateInvoiceInput {
  patientId: string;
  description: string;
  amountCents: number;
  appointmentId?: string | null;
  dueDate?: Date | null;
}

export class CreateInvoice {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly patients: PatientRepository,
  ) {}

  async execute(input: CreateInvoiceInput): Promise<Invoice> {
    const patient = await this.patients.findById(input.patientId);
    if (!patient) {
      throw new NotFoundError('Paciente', input.patientId);
    }
    const invoice = Invoice.create({
      patientId: input.patientId,
      description: input.description,
      amount: Money.fromCents(input.amountCents),
      appointmentId: input.appointmentId,
      dueDate: input.dueDate,
    });
    await this.invoices.save(invoice);
    return invoice;
  }
}
