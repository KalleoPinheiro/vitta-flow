import type { Appointment } from "@/domain/scheduling/appointment";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { InvoiceRepository } from "@/domain/billing/invoice-repository";
import { Invoice } from "@/domain/billing/invoice";
import { FollowUp } from "@/domain/followup/follow-up";
import type { FollowUpRepository } from "@/domain/followup/follow-up-repository";
import { NotFoundError } from "@/domain/shared/errors";

const MS_PER_DAY = 86_400_000;

export interface CompleteAppointmentInput {
  id: string;
  followUpInDays?: number | null;
}

export class CompleteAppointment {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly invoices: InvoiceRepository,
    private readonly followUps?: FollowUpRepository,
  ) {}

  async execute(input: CompleteAppointmentInput): Promise<Appointment> {
    const appointment = await this.appointments.findById(input.id);
    if (!appointment) {
      throw new NotFoundError("Consulta", input.id);
    }

    const completed = appointment.complete();
    await this.appointments.save(completed);

    const existingInvoice = await this.invoices.findByAppointmentId(completed.id);
    if (!existingInvoice) {
      const invoice = Invoice.create({
        patientId: completed.patientId,
        appointmentId: completed.id,
        description: completed.procedure,
        amount: completed.price,
      });
      await this.invoices.save(invoice);
    }

    if (input.followUpInDays && this.followUps) {
      const followUp = FollowUp.create({
        patientId: completed.patientId,
        appointmentId: completed.id,
        dueDate: new Date(completed.slot.end.getTime() + input.followUpInDays * MS_PER_DAY),
        reason: `Retorno: ${completed.procedure}`,
      });
      await this.followUps.save(followUp);
    }

    return completed;
  }
}
