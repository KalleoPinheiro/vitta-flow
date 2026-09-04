import type { Professional } from '@/domain/professional/professional';
import type { ProfessionalRepository } from '@/domain/professional/professional-repository';

export class InMemoryProfessionalRepository implements ProfessionalRepository {
  private readonly items = new Map<string, Professional>();

  async save(professional: Professional): Promise<void> {
    this.items.set(professional.id, professional);
  }

  async findById(id: string): Promise<Professional | null> {
    return this.items.get(id) ?? null;
  }

  async findByIds(ids: string[]): Promise<Professional[]> {
    const unique = [...new Set(ids)];
    return unique.flatMap((id) => {
      const professional = this.items.get(id);
      return professional ? [professional] : [];
    });
  }

  async findAll(): Promise<Professional[]> {
    return [...this.items.values()].sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    );
  }
}
