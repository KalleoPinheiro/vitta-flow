import type { Clinic } from "./clinic";

export interface ClinicRepository {
  create(clinic: Clinic): Promise<void>;
  findById(id: string): Promise<Clinic | null>;
}
