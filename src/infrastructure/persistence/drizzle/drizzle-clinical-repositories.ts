import { desc, eq, inArray } from "drizzle-orm";
import { Anamnesis } from "@/domain/clinical/anamnesis";
import { EvolutionNote } from "@/domain/clinical/evolution-note";
import {
  ClinicalCondition,
  type ConditionKind,
  type ConditionStatus,
  type StomaType,
} from "@/domain/clinical/clinical-condition";
import {
  ConditionAssessment,
  type ExudateLevel,
} from "@/domain/clinical/condition-assessment";
import type {
  AnamnesisRepository,
  ClinicalConditionRepository,
  ConditionAssessmentRepository,
  ConditionPhotoRepository,
  EvolutionNoteRepository,
} from "@/domain/clinical/clinical-repositories";
import {
  ConditionPhoto,
  type PhotoContentType,
} from "@/domain/clinical/condition-photo";
import type { AppDb } from "./db";
import {
  anamneses,
  clinicalConditions,
  conditionAssessments,
  conditionPhotos,
  evolutionNotes,
} from "./schema";

export class DrizzleAnamnesisRepository implements AnamnesisRepository {
  constructor(private readonly db: AppDb) {}

  async save(anamnesis: Anamnesis): Promise<void> {
    const values = {
      patientId: anamnesis.patientId,
      comorbidities: anamnesis.comorbidities,
      allergies: anamnesis.allergies,
      medications: anamnesis.medications,
      surgicalHistory: anamnesis.surgicalHistory,
      notes: anamnesis.notes,
      updatedAt: anamnesis.updatedAt,
    };
    await this.db
      .insert(anamneses)
      .values(values)
      .onConflictDoUpdate({ target: anamneses.patientId, set: values });
  }

  async findByPatientId(patientId: string): Promise<Anamnesis | null> {
    const rows = await this.db
      .select()
      .from(anamneses)
      .where(eq(anamneses.patientId, patientId))
      .limit(1);
    return rows[0] ? Anamnesis.restore(rows[0]) : null;
  }
}

export class DrizzleEvolutionNoteRepository implements EvolutionNoteRepository {
  constructor(private readonly db: AppDb) {}

  async save(note: EvolutionNote): Promise<void> {
    await this.db.insert(evolutionNotes).values({
      id: note.id,
      patientId: note.patientId,
      appointmentId: note.appointmentId,
      professionalId: note.professionalId,
      subjective: note.subjective,
      objective: note.objective,
      assessment: note.assessment,
      plan: note.plan,
      createdAt: note.createdAt,
    });
  }

  async findByPatientId(patientId: string): Promise<EvolutionNote[]> {
    const rows = await this.db
      .select()
      .from(evolutionNotes)
      .where(eq(evolutionNotes.patientId, patientId))
      .orderBy(desc(evolutionNotes.createdAt), desc(evolutionNotes.id));
    return rows.map((row) => EvolutionNote.restore(row));
  }
}

export class DrizzleClinicalConditionRepository implements ClinicalConditionRepository {
  constructor(private readonly db: AppDb) {}

  private toEntity(row: typeof clinicalConditions.$inferSelect): ClinicalCondition {
    return ClinicalCondition.restore({
      ...row,
      kind: row.kind as ConditionKind,
      stomaType: row.stomaType as StomaType | null,
      status: row.status as ConditionStatus,
    });
  }

  async save(condition: ClinicalCondition): Promise<void> {
    const values = {
      id: condition.id,
      patientId: condition.patientId,
      kind: condition.kind,
      title: condition.title,
      stomaType: condition.stomaType,
      startedAt: condition.startedAt,
      notes: condition.notes,
      status: condition.status,
      createdAt: condition.createdAt,
    };
    await this.db
      .insert(clinicalConditions)
      .values(values)
      .onConflictDoUpdate({ target: clinicalConditions.id, set: values });
  }

  async findById(id: string): Promise<ClinicalCondition | null> {
    const rows = await this.db
      .select()
      .from(clinicalConditions)
      .where(eq(clinicalConditions.id, id))
      .limit(1);
    return rows[0] ? this.toEntity(rows[0]) : null;
  }

  async findByPatientId(patientId: string): Promise<ClinicalCondition[]> {
    const rows = await this.db
      .select()
      .from(clinicalConditions)
      .where(eq(clinicalConditions.patientId, patientId))
      .orderBy(desc(clinicalConditions.createdAt));
    return rows.map((row) => this.toEntity(row));
  }

  async findByPatientIds(patientIds: string[]): Promise<ClinicalCondition[]> {
    const unique = [...new Set(patientIds)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(clinicalConditions)
      .where(inArray(clinicalConditions.patientId, unique))
      .orderBy(desc(clinicalConditions.createdAt));
    return rows.map((row) => this.toEntity(row));
  }
}

export class DrizzleConditionAssessmentRepository implements ConditionAssessmentRepository {
  constructor(private readonly db: AppDb) {}

  async save(assessment: ConditionAssessment): Promise<void> {
    await this.db.insert(conditionAssessments).values({
      id: assessment.id,
      conditionId: assessment.conditionId,
      lengthMm: assessment.lengthMm,
      widthMm: assessment.widthMm,
      depthMm: assessment.depthMm,
      tissueType: assessment.tissueType,
      exudate: assessment.exudate,
      painScale: assessment.painScale,
      skinCondition: assessment.skinCondition,
      complications: assessment.complications,
      notes: assessment.notes,
      createdAt: assessment.createdAt,
    });
  }

  async findByConditionId(conditionId: string): Promise<ConditionAssessment[]> {
    const rows = await this.db
      .select()
      .from(conditionAssessments)
      .where(eq(conditionAssessments.conditionId, conditionId))
      .orderBy(desc(conditionAssessments.createdAt), desc(conditionAssessments.id));
    return rows.map((row) =>
      ConditionAssessment.restore({ ...row, exudate: row.exudate as ExudateLevel | null }),
    );
  }

  async findByConditionIds(conditionIds: string[]): Promise<ConditionAssessment[]> {
    const unique = [...new Set(conditionIds)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(conditionAssessments)
      .where(inArray(conditionAssessments.conditionId, unique))
      .orderBy(desc(conditionAssessments.createdAt), desc(conditionAssessments.id));
    return rows.map((row) =>
      ConditionAssessment.restore({ ...row, exudate: row.exudate as ExudateLevel | null }),
    );
  }
}

export class DrizzleConditionPhotoRepository implements ConditionPhotoRepository {
  constructor(private readonly db: AppDb) {}

  private toEntity(row: typeof conditionPhotos.$inferSelect): ConditionPhoto {
    return ConditionPhoto.restore({
      ...row,
      contentType: row.contentType as PhotoContentType,
    });
  }

  async save(photo: ConditionPhoto): Promise<void> {
    await this.db.insert(conditionPhotos).values({
      id: photo.id,
      conditionId: photo.conditionId,
      assessmentId: photo.assessmentId,
      contentType: photo.contentType,
      sizeBytes: photo.sizeBytes,
      createdAt: photo.createdAt,
    });
  }

  async findById(id: string): Promise<ConditionPhoto | null> {
    const rows = await this.db
      .select()
      .from(conditionPhotos)
      .where(eq(conditionPhotos.id, id))
      .limit(1);
    return rows[0] ? this.toEntity(rows[0]) : null;
  }

  async findByConditionId(conditionId: string): Promise<ConditionPhoto[]> {
    const rows = await this.db
      .select()
      .from(conditionPhotos)
      .where(eq(conditionPhotos.conditionId, conditionId))
      .orderBy(desc(conditionPhotos.createdAt), desc(conditionPhotos.id));
    return rows.map((row) => this.toEntity(row));
  }

  async findByConditionIds(conditionIds: string[]): Promise<ConditionPhoto[]> {
    const unique = [...new Set(conditionIds)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(conditionPhotos)
      .where(inArray(conditionPhotos.conditionId, unique))
      .orderBy(desc(conditionPhotos.createdAt), desc(conditionPhotos.id));
    return rows.map((row) => this.toEntity(row));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(conditionPhotos).where(eq(conditionPhotos.id, id));
  }
}
