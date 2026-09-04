import { canProvision } from '@/domain/auth/role-hierarchy';
import {
  UserAccount,
  type UserAccountRepository,
} from '@/domain/auth/user-account';
import type { UserRole } from '@/domain/auth/user-role';
import {
  ProvisioningDeniedError,
  ValidationError,
} from '@/domain/shared/errors';

export interface CreateAccountActor {
  role: UserRole;
  /** `null` só para super_admin (cross-empresa). */
  clinicId: string | null;
}

export interface CreateAccountInput {
  email: string;
  /** Hash já calculado (`scrypt$...`) — o use-case nunca lida com senha em claro. */
  passwordHash: string;
  role: UserRole;
  /** Empresa-alvo da nova conta. Obrigatório mesmo para super_admin (ele escolhe a empresa). */
  clinicId: string;
  professionalId?: string | null;
}

/**
 * Cadastro de conta respeitando a hierarquia de provisionamento (RBAC-07..14,
 * ADR-003): valida quem pode criar quem, e que o alvo pertence à própria
 * empresa do ator — exceto super_admin, que pode escolher qualquer empresa.
 */
export class CreateAccount {
  constructor(private readonly accounts: UserAccountRepository) {}

  async execute(
    actor: CreateAccountActor,
    input: CreateAccountInput,
  ): Promise<UserAccount> {
    if (!canProvision(actor.role, input.role)) {
      throw new ProvisioningDeniedError(
        `Papel "${actor.role}" não pode cadastrar contas com papel "${input.role}"`,
      );
    }
    if (actor.role !== 'super_admin' && input.clinicId !== actor.clinicId) {
      throw new ProvisioningDeniedError(
        'Não é possível cadastrar conta em uma empresa diferente da própria',
      );
    }
    if (input.role === 'profissional' && !input.professionalId) {
      // Sem professionalId, a sessão nasce com vínculo nulo e o escopo
      // dinâmico (R4, professional-patient-scope.ts) nega acesso a todo
      // paciente — conta inutilizável por construção.
      throw new ValidationError(
        'professionalId é obrigatório para o papel profissional',
      );
    }

    const existing = await this.accounts.findByEmail(input.email);
    if (existing) {
      throw new ValidationError('Já existe conta com este email');
    }

    const account = UserAccount.create({
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      clinicId: input.clinicId,
      professionalId: input.professionalId ?? null,
    });
    await this.accounts.save(account);
    return account;
  }
}
