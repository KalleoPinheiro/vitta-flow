import type { PartnerRepository } from '@/domain/partner/partner-repository';
import { ValidationError } from '@/domain/shared/errors';

/** Indicação só é aceita para parceiro cadastrado e ativo. */
export async function assertValidReferrer(
  partners: PartnerRepository | undefined,
  referredByPartnerId: string | null | undefined,
): Promise<void> {
  if (!referredByPartnerId || !partners) {
    return;
  }
  const partner = await partners.findById(referredByPartnerId);
  if (!partner?.isActive) {
    throw new ValidationError(
      'Parceiro da indicação não encontrado ou inativo',
    );
  }
}
