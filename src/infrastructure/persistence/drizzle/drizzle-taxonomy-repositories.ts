import { and, asc, eq, ilike, inArray, or } from 'drizzle-orm';
import { NocScale, type NocScaleAnchors } from '@/domain/taxonomy/noc-scale';
import { NursingDiagnosis } from '@/domain/taxonomy/nursing-diagnosis';
import { NursingIntervention } from '@/domain/taxonomy/nursing-intervention';
import { NursingOutcome } from '@/domain/taxonomy/nursing-outcome';
import {
  type LinkageRole,
  TaxonomyLinkage,
} from '@/domain/taxonomy/taxonomy-linkage';
import type {
  NursingDiagnosisRepository,
  NursingInterventionRepository,
  NursingOutcomeRepository,
  TaxonomyLinkageRepository,
} from '@/domain/taxonomy/taxonomy-repositories';
import type { AppDb } from './db';
import {
  nursingDiagnoses,
  nursingInterventions,
  nursingOutcomes,
  taxonomyLinkages,
} from './schema';

const DEFAULT_SEARCH_LIMIT = 20;

export class DrizzleNursingDiagnosisRepository
  implements NursingDiagnosisRepository
{
  constructor(private readonly db: AppDb) {}

  private toEntity(
    row: typeof nursingDiagnoses.$inferSelect,
  ): NursingDiagnosis {
    return NursingDiagnosis.restore(row);
  }

  async save(diagnosis: NursingDiagnosis): Promise<void> {
    const values = {
      id: diagnosis.id,
      code: diagnosis.code,
      label: diagnosis.label,
      domain: diagnosis.domain,
      class: diagnosis.class,
      definition: diagnosis.definition,
      edition: diagnosis.edition,
      active: diagnosis.isActive,
      createdAt: diagnosis.createdAt,
    };
    await this.db
      .insert(nursingDiagnoses)
      .values(values)
      .onConflictDoUpdate({ target: nursingDiagnoses.id, set: values });
  }

  async findByCode(code: string): Promise<NursingDiagnosis | null> {
    const rows = await this.db
      .select()
      .from(nursingDiagnoses)
      .where(eq(nursingDiagnoses.code, code))
      .limit(1);
    return rows[0] ? this.toEntity(rows[0]) : null;
  }

  async findByCodes(codes: string[]): Promise<NursingDiagnosis[]> {
    const unique = [...new Set(codes)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(nursingDiagnoses)
      .where(inArray(nursingDiagnoses.code, unique));
    return rows.map((row) => this.toEntity(row));
  }

  async search(
    term: string,
    options?: { limit?: number },
  ): Promise<NursingDiagnosis[]> {
    const rows = await this.db
      .select()
      .from(nursingDiagnoses)
      .where(
        or(
          ilike(nursingDiagnoses.label, `%${term}%`),
          ilike(nursingDiagnoses.code, `%${term}%`),
        ),
      )
      .orderBy(asc(nursingDiagnoses.label))
      .limit(options?.limit ?? DEFAULT_SEARCH_LIMIT);
    return rows.map((row) => this.toEntity(row));
  }
}

export class DrizzleNursingOutcomeRepository
  implements NursingOutcomeRepository
{
  constructor(private readonly db: AppDb) {}

  private toEntity(row: typeof nursingOutcomes.$inferSelect): NursingOutcome {
    const anchors: NocScaleAnchors = [
      row.scaleAnchor1,
      row.scaleAnchor2,
      row.scaleAnchor3,
      row.scaleAnchor4,
      row.scaleAnchor5,
    ];
    return NursingOutcome.restore({
      id: row.id,
      code: row.code,
      label: row.label,
      domain: row.domain,
      class: row.class,
      edition: row.edition,
      scale: NocScale.restore(anchors),
      active: row.active,
      createdAt: row.createdAt,
    });
  }

  async save(outcome: NursingOutcome): Promise<void> {
    const [a1, a2, a3, a4, a5] = outcome.scale.anchors;
    const values = {
      id: outcome.id,
      code: outcome.code,
      label: outcome.label,
      domain: outcome.domain,
      class: outcome.class,
      edition: outcome.edition,
      scaleAnchor1: a1,
      scaleAnchor2: a2,
      scaleAnchor3: a3,
      scaleAnchor4: a4,
      scaleAnchor5: a5,
      active: outcome.isActive,
      createdAt: outcome.createdAt,
    };
    await this.db
      .insert(nursingOutcomes)
      .values(values)
      .onConflictDoUpdate({ target: nursingOutcomes.id, set: values });
  }

  async findByCode(code: string): Promise<NursingOutcome | null> {
    const rows = await this.db
      .select()
      .from(nursingOutcomes)
      .where(eq(nursingOutcomes.code, code))
      .limit(1);
    return rows[0] ? this.toEntity(rows[0]) : null;
  }

  async findByCodes(codes: string[]): Promise<NursingOutcome[]> {
    const unique = [...new Set(codes)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(nursingOutcomes)
      .where(inArray(nursingOutcomes.code, unique));
    return rows.map((row) => this.toEntity(row));
  }

  async search(
    term: string,
    options?: { limit?: number },
  ): Promise<NursingOutcome[]> {
    const rows = await this.db
      .select()
      .from(nursingOutcomes)
      .where(
        or(
          ilike(nursingOutcomes.label, `%${term}%`),
          ilike(nursingOutcomes.code, `%${term}%`),
        ),
      )
      .orderBy(asc(nursingOutcomes.label))
      .limit(options?.limit ?? DEFAULT_SEARCH_LIMIT);
    return rows.map((row) => this.toEntity(row));
  }
}

export class DrizzleNursingInterventionRepository
  implements NursingInterventionRepository
{
  constructor(private readonly db: AppDb) {}

  private toEntity(
    row: typeof nursingInterventions.$inferSelect,
  ): NursingIntervention {
    return NursingIntervention.restore(row);
  }

  async save(intervention: NursingIntervention): Promise<void> {
    const values = {
      id: intervention.id,
      code: intervention.code,
      label: intervention.label,
      domain: intervention.domain,
      class: intervention.class,
      edition: intervention.edition,
      active: intervention.isActive,
      createdAt: intervention.createdAt,
    };
    await this.db
      .insert(nursingInterventions)
      .values(values)
      .onConflictDoUpdate({ target: nursingInterventions.id, set: values });
  }

  async findByCode(code: string): Promise<NursingIntervention | null> {
    const rows = await this.db
      .select()
      .from(nursingInterventions)
      .where(eq(nursingInterventions.code, code))
      .limit(1);
    return rows[0] ? this.toEntity(rows[0]) : null;
  }

  async findByCodes(codes: string[]): Promise<NursingIntervention[]> {
    const unique = [...new Set(codes)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(nursingInterventions)
      .where(inArray(nursingInterventions.code, unique));
    return rows.map((row) => this.toEntity(row));
  }

  async search(
    term: string,
    options?: { limit?: number },
  ): Promise<NursingIntervention[]> {
    const rows = await this.db
      .select()
      .from(nursingInterventions)
      .where(
        or(
          ilike(nursingInterventions.label, `%${term}%`),
          ilike(nursingInterventions.code, `%${term}%`),
        ),
      )
      .orderBy(asc(nursingInterventions.label))
      .limit(options?.limit ?? DEFAULT_SEARCH_LIMIT);
    return rows.map((row) => this.toEntity(row));
  }
}

export class DrizzleTaxonomyLinkageRepository
  implements TaxonomyLinkageRepository
{
  constructor(private readonly db: AppDb) {}

  async save(linkage: TaxonomyLinkage): Promise<void> {
    await this.db
      .insert(taxonomyLinkages)
      .values({
        diagnosisCode: linkage.diagnosisCode,
        role: linkage.role,
        targetCode: linkage.targetCode,
      })
      .onConflictDoNothing();
  }

  async findByDiagnosisCode(
    diagnosisCode: string,
    role?: LinkageRole,
  ): Promise<TaxonomyLinkage[]> {
    const rows = await this.db
      .select()
      .from(taxonomyLinkages)
      .where(
        role
          ? and(
              eq(taxonomyLinkages.diagnosisCode, diagnosisCode),
              eq(taxonomyLinkages.role, role),
            )
          : eq(taxonomyLinkages.diagnosisCode, diagnosisCode),
      );
    return rows.map((row) =>
      TaxonomyLinkage.create({
        diagnosisCode: row.diagnosisCode,
        role: row.role as LinkageRole,
        targetCode: row.targetCode,
      }),
    );
  }
}
