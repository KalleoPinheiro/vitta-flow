/**
 * Id da clínica legada criada pelo backfill da migração 0019 (fundação de multi-tenancy).
 * Repositórios ainda não migrados para receber `clinicId` da sessão (T7-T24) usam este
 * placeholder para satisfazer a coluna NOT NULL sem alterar comportamento observável —
 * o app roda em mono-tenant até cada entidade ganhar sua própria task de isolamento.
 */
export const LEGACY_CLINIC_ID = "legacy-clinic";
