import type { Professional } from './professional';

export interface ProfessionalRepository {
  save(professional: Professional): Promise<void>;
  findById(id: string): Promise<Professional | null>;
  findByIds(ids: string[]): Promise<Professional[]>;
  findAll(): Promise<Professional[]>;
}
