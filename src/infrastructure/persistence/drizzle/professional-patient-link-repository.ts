import { and, eq } from 'drizzle-orm';
import type { ProfessionalPatientLinkRepository } from '@/domain/clinical/professional-patient-link';
import { newId } from '@/domain/shared/id';
import type { AppDb } from './db';
import { professionalPatientLinks } from './schema';
import { withTenant } from './tenant-scope';

export class DrizzleProfessionalPatientLinkRepository
  implements ProfessionalPatientLinkRepository
{
  constructor(
    private readonly db: AppDb,
    private readonly clinicId: string | null,
  ) {}

  async ensureLink(professionalId: string, patientId: string): Promise<void> {
    if (this.clinicId === null) {
      throw new Error(
        'Papel de sistema não pode criar vínculo profissional-paciente',
      );
    }
    await this.db
      .insert(professionalPatientLinks)
      .values({
        id: newId(),
        clinicId: this.clinicId,
        professionalId,
        patientId,
        createdAt: new Date(),
      })
      .onConflictDoNothing({
        target: [
          professionalPatientLinks.professionalId,
          professionalPatientLinks.patientId,
        ],
      });
  }

  async hasLink(professionalId: string, patientId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: professionalPatientLinks.id })
      .from(professionalPatientLinks)
      .where(
        withTenant(
          professionalPatientLinks,
          this.clinicId,
          and(
            eq(professionalPatientLinks.professionalId, professionalId),
            eq(professionalPatientLinks.patientId, patientId),
          ),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async findLinkedPatientIds(professionalId: string): Promise<string[]> {
    const rows = await this.db
      .select({ patientId: professionalPatientLinks.patientId })
      .from(professionalPatientLinks)
      .where(
        withTenant(
          professionalPatientLinks,
          this.clinicId,
          eq(professionalPatientLinks.professionalId, professionalId),
        ),
      );
    return rows.map((r) => r.patientId);
  }
}
