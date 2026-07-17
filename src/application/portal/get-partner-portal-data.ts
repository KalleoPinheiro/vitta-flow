import type { Partner } from "@/domain/partner/partner";
import type { PartnerRepository } from "@/domain/partner/partner-repository";
import type { Patient } from "@/domain/patient/patient";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import type { Appointment } from "@/domain/scheduling/appointment";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type {
  ClinicalConditionRepository,
  ConditionAssessmentRepository,
} from "@/domain/clinical/clinical-repositories";
import { NotFoundError } from "@/domain/shared/errors";
import type { ConditionWithAssessments } from "./get-patient-portal-data";

export interface ReferredPatientData {
  patient: Patient;
  appointments: Appointment[];
  conditions: ConditionWithAssessments[];
}

export interface PartnerPortalData {
  partner: Partner;
  referredPatients: ReferredPatientData[];
}

/**
 * Dados do portal do médico parceiro — apenas pacientes indicados por ele.
 * Sem dados financeiros e sem anamnese: o parceiro acompanha a evolução clínica da indicação.
 */
export class GetPartnerPortalData {
  constructor(
    private readonly partners: PartnerRepository,
    private readonly patients: PatientRepository,
    private readonly appointments: AppointmentRepository,
    private readonly conditions: ClinicalConditionRepository,
    private readonly assessments: ConditionAssessmentRepository,
  ) {}

  async execute(input: { email: string }): Promise<PartnerPortalData> {
    const partner = await this.partners.findByEmail(input.email);
    if (!partner || !partner.isActive) {
      throw new NotFoundError("Parceiro", input.email);
    }

    const referred = await this.patients.findByReferrer(partner.id);
    const referredPatients = await Promise.all(
      referred.map(async (patient) => {
        const [appointments, conditions] = await Promise.all([
          this.appointments.findByPatientId(patient.id),
          this.conditions.findByPatientId(patient.id),
        ]);
        const conditionsWithAssessments = await Promise.all(
          conditions.map(async (condition) => ({
            condition,
            assessments: await this.assessments.findByConditionId(condition.id),
          })),
        );
        return { patient, appointments, conditions: conditionsWithAssessments };
      }),
    );

    return { partner, referredPatients };
  }
}
