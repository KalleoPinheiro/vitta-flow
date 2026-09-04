import { Invoice } from '@/domain/billing/invoice';
import type { InvoiceRepository } from '@/domain/billing/invoice-repository';
import type { SessionPackageRepository } from '@/domain/billing/package';
import { FollowUp } from '@/domain/followup/follow-up';
import type { FollowUpRepository } from '@/domain/followup/follow-up-repository';
import type { Appointment } from '@/domain/scheduling/appointment';
import type { AppointmentRepository } from '@/domain/scheduling/appointment-repository';
import { NotFoundError } from '@/domain/shared/errors';

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
    private readonly packages?: SessionPackageRepository,
  ) {}

  /**
   * Idempotente-reparador: sem transação distribuída entre consulta e fatura,
   * uma falha parcial poderia deixar a consulta concluída sem fatura, sem caminho
   * de recuperação (re-concluir daria erro de transição). Por isso, re-executar
   * sobre consulta já concluída não é erro: apenas garante que a fatura exista.
   */
  async execute(input: CompleteAppointmentInput): Promise<Appointment> {
    const appointment = await this.appointments.findById(input.id);
    if (!appointment) {
      throw new NotFoundError('Consulta', input.id);
    }

    const isRepairRun = appointment.status === 'completed';
    const completed = isRepairRun ? appointment : appointment.complete();
    if (!isRepairRun) {
      await this.appointments.save(completed);
    }

    // Pacote de sessões (O3.3): consome saldo em vez de faturar a consulta.
    // Consumo registrado por consulta (unique) → conclusão reparadora não
    // consome duas vezes nem fatura consulta já coberta por pacote.
    const coveredByPackage = await this.consumePackageIfAvailable(completed);

    const existingInvoice = await this.invoices.findByAppointmentId(
      completed.id,
    );
    if (!existingInvoice && !coveredByPackage) {
      const invoice = Invoice.create({
        patientId: completed.patientId,
        appointmentId: completed.id,
        description: completed.procedure,
        amount: completed.price,
      });
      await this.invoices.save(invoice);
    }

    // Retorno só na primeira conclusão — reparo não deve duplicar pendências.
    if (!isRepairRun && input.followUpInDays && this.followUps) {
      const followUp = FollowUp.create({
        patientId: completed.patientId,
        appointmentId: completed.id,
        dueDate: new Date(
          completed.slot.end.getTime() + input.followUpInDays * MS_PER_DAY,
        ),
        reason: `Retorno: ${completed.procedure}`,
      });
      await this.followUps.save(followUp);
    }

    return completed;
  }

  private async consumePackageIfAvailable(
    completed: Appointment,
  ): Promise<boolean> {
    if (!this.packages || !completed.procedureId) {
      return false;
    }
    if (await this.packages.wasConsumedBy(completed.id)) {
      return true;
    }
    const pkg = await this.packages.findUsable(
      completed.patientId,
      completed.procedureId,
    );
    if (!pkg) {
      return false;
    }
    await this.packages.save(pkg.consumeSession());
    await this.packages.recordConsumption(pkg.id, completed.id);
    return true;
  }
}
