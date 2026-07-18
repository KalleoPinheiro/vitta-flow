import type { Patient } from "@/domain/patient/patient";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import type { Appointment } from "@/domain/scheduling/appointment";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { ClinicalCondition } from "@/domain/clinical/clinical-condition";
import type { ConditionAssessment } from "@/domain/clinical/condition-assessment";
import type {
  ClinicalConditionRepository,
  ConditionAssessmentRepository,
} from "@/domain/clinical/clinical-repositories";
import type { Invoice } from "@/domain/billing/invoice";
import type { InvoiceRepository } from "@/domain/billing/invoice-repository";
import type { FollowUp } from "@/domain/followup/follow-up";
import type { FollowUpRepository } from "@/domain/followup/follow-up-repository";
import { NotFoundError } from "@/domain/shared/errors";

export interface ConditionWithAssessments {
  condition: ClinicalCondition;
  assessments: ConditionAssessment[];
}

export interface PatientPortalData {
  patient: Patient;
  appointments: Appointment[];
  conditions: ConditionWithAssessments[];
  invoices: Invoice[];
  followUps: FollowUp[];
}

const HISTORY_MONTHS = 24;

/** Dados do portal do paciente — sempre escopados ao email autenticado. */
export class GetPatientPortalData {
  constructor(
    private readonly patients: PatientRepository,
    private readonly appointments: AppointmentRepository,
    private readonly conditions: ClinicalConditionRepository,
    private readonly assessments: ConditionAssessmentRepository,
    private readonly invoices: InvoiceRepository,
    private readonly followUps: FollowUpRepository,
  ) {}

  async execute(input: { email: string }): Promise<PatientPortalData> {
    const patient = await this.patients.findByEmail(input.email);
    if (!patient || !patient.isActive) {
      throw new NotFoundError("Paciente", input.email);
    }

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - HISTORY_MONTHS);

    const [appointments, conditions, invoices, followUps] = await Promise.all([
      this.appointments.findByPatientId(patient.id, { endsAfter: cutoff }),
      this.conditions.findByPatientId(patient.id),
      this.invoices.findAll({ patientId: patient.id }),
      this.followUps.findAll({ patientId: patient.id, status: "pending" }),
    ]);

    // Uma query em lote para todas as avaliações (sem N+1 por condição).
    const allAssessments = await this.assessments.findByConditionIds(
      conditions.map((c) => c.id),
    );
    const assessmentsByCondition = new Map<string, typeof allAssessments>();
    for (const assessment of allAssessments) {
      const group = assessmentsByCondition.get(assessment.conditionId);
      if (group) {
        group.push(assessment);
      } else {
        assessmentsByCondition.set(assessment.conditionId, [assessment]);
      }
    }

    return {
      patient,
      appointments,
      conditions: conditions.map((condition) => ({
        condition,
        assessments: assessmentsByCondition.get(condition.id) ?? [],
      })),
      invoices,
      followUps,
    };
  }
}
