import type { Appointment } from "@/domain/scheduling/appointment";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { InvoiceRepository } from "@/domain/billing/invoice-repository";
import { Invoice } from "@/domain/billing/invoice";
import { NotFoundError } from "@/domain/shared/errors";

export class CompleteAppointment {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly invoices: InvoiceRepository,
  ) {}

  async execute(input: { id: string }): Promise<Appointment> {
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

    return completed;
  }
}
