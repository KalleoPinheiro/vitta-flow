import type { Patient } from "./patient";

export interface PatientPage {
  limit?: number;
  /** Cursor opaco (issue #75) — retoma após o último item da página anterior. */
  cursor?: string;
  /** Restringe a listagem a este subconjunto de IDs (escopo dinâmico do Profissional, R4). */
  ids?: string[];
}

export interface PatientRepository {
  save(patient: Patient): Promise<void>;
  findById(id: string): Promise<Patient | null>;
  findByEmail(email: string): Promise<Patient | null>;
  findByIds(ids: string[]): Promise<Patient[]>;
  findByReferrer(partnerId: string): Promise<Patient[]>;
  findAll(search?: string, page?: PatientPage): Promise<Patient[]>;
  /** Empresa dona do registro — usado pelo acesso cross-empresa do papel de sistema para auditar. */
  findClinicIdById(id: string): Promise<string | null>;
  /**
   * Conta pacientes com este e-mail em QUALQUER empresa — usado só para detectar
   * ambiguidade cross-empresa no login Google (MT-26), nunca para servir dados.
   */
  countByEmail(email: string): Promise<number>;
}
