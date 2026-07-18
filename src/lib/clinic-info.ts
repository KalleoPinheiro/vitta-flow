export interface ClinicInfo {
  name: string;
  cnpj: string | null;
  address: string | null;
  professionalName: string | null;
  professionalRegistry: string | null;
  city: string | null;
}

/** Dados da clínica para cabeçalho/rodapé de documentos — via env, com defaults neutros. */
export function getClinicInfo(): ClinicInfo {
  return {
    name: process.env.CLINIC_NAME || "VittaFlow — Clínica de Estomaterapia",
    cnpj: process.env.CLINIC_CNPJ || null,
    address: process.env.CLINIC_ADDRESS || null,
    professionalName: process.env.CLINIC_PROFESSIONAL_NAME || null,
    professionalRegistry: process.env.CLINIC_PROFESSIONAL_REGISTRY || null,
    city: process.env.CLINIC_CITY || null,
  };
}
