import type { UserRole } from '@/domain/auth/user-role';

/** Os 4 papéis de equipe (excluem os portais Patient/Partner). */
export const STAFF_ROLES: readonly UserRole[] = [
  'super_admin',
  'company_admin',
  'atendente',
  'profissional',
];

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}
