import { ValidationError } from '../shared/errors';

export const LINKAGE_ROLES = ['outcome', 'intervention'] as const;
export type LinkageRole = (typeof LINKAGE_ROLES)[number];

export interface TaxonomyLinkageProps {
  diagnosisCode: string;
  role: LinkageRole;
  targetCode: string;
}

/** Ligação sugerida NANDA→NOC/NIC — prioriza o subset curado na busca, nunca restringe. */
export class TaxonomyLinkage {
  private constructor(
    readonly diagnosisCode: string,
    readonly role: LinkageRole,
    readonly targetCode: string,
  ) {}

  static create(props: TaxonomyLinkageProps): TaxonomyLinkage {
    if (
      props.diagnosisCode.trim().length === 0 ||
      props.targetCode.trim().length === 0
    ) {
      throw new ValidationError(
        'Ligação exige diagnóstico e código de destino',
      );
    }
    if (!LINKAGE_ROLES.includes(props.role)) {
      throw new ValidationError('Papel da ligação inválido');
    }
    return new TaxonomyLinkage(
      props.diagnosisCode.trim(),
      props.role,
      props.targetCode.trim(),
    );
  }
}
