import type { Anamnesis } from "@/domain/clinical/anamnesis";
import type { EvolutionNote } from "@/domain/clinical/evolution-note";
import type { ClinicalCondition } from "@/domain/clinical/clinical-condition";
import type { ConditionAssessment } from "@/domain/clinical/condition-assessment";
import type {
  AnamnesisRepository,
  ClinicalConditionRepository,
  ConditionAssessmentRepository,
  EvolutionNoteRepository,
} from "@/domain/clinical/clinical-repositories";

export class InMemoryAnamnesisRepository implements AnamnesisRepository {
  private readonly items = new Map<string, Anamnesis>();

  async save(anamnesis: Anamnesis): Promise<void> {
    this.items.set(anamnesis.patientId, anamnesis);
  }

  async findByPatientId(patientId: string): Promise<Anamnesis | null> {
    return this.items.get(patientId) ?? null;
  }
}

export class InMemoryEvolutionNoteRepository implements EvolutionNoteRepository {
  private readonly items = new Map<string, EvolutionNote>();
  private readonly insertionOrder = new Map<string, number>();
  private sequence = 0;

  async save(note: EvolutionNote): Promise<void> {
    this.items.set(note.id, note);
    if (!this.insertionOrder.has(note.id)) {
      this.insertionOrder.set(note.id, (this.sequence += 1));
    }
  }

  async findByPatientId(patientId: string): Promise<EvolutionNote[]> {
    return [...this.items.values()]
      .filter((n) => n.patientId === patientId)
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          (this.insertionOrder.get(b.id) ?? 0) - (this.insertionOrder.get(a.id) ?? 0),
      );
  }
}

export class InMemoryClinicalConditionRepository implements ClinicalConditionRepository {
  private readonly items = new Map<string, ClinicalCondition>();

  async save(condition: ClinicalCondition): Promise<void> {
    this.items.set(condition.id, condition);
  }

  async findById(id: string): Promise<ClinicalCondition | null> {
    return this.items.get(id) ?? null;
  }

  async findByPatientId(patientId: string): Promise<ClinicalCondition[]> {
    return [...this.items.values()]
      .filter((c) => c.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export class InMemoryConditionAssessmentRepository implements ConditionAssessmentRepository {
  private readonly items = new Map<string, ConditionAssessment>();

  async save(assessment: ConditionAssessment): Promise<void> {
    this.items.set(assessment.id, assessment);
  }

  async findByConditionId(conditionId: string): Promise<ConditionAssessment[]> {
    return [...this.items.values()]
      .filter((a) => a.conditionId === conditionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
