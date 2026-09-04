import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/domain/shared/errors';
import { NocScale } from '@/domain/taxonomy/noc-scale';
import { NursingDiagnosis } from '@/domain/taxonomy/nursing-diagnosis';
import { NursingIntervention } from '@/domain/taxonomy/nursing-intervention';
import { NursingOutcome } from '@/domain/taxonomy/nursing-outcome';
import { TaxonomyLinkage } from '@/domain/taxonomy/taxonomy-linkage';
import { TAXONOMY_SYSTEMS } from '@/domain/taxonomy/taxonomy-system';

const validDiagnosis = {
  code: '00046',
  label: 'Integridade da pele prejudicada',
  domain: 'Domínio 11 — Segurança/proteção',
  class: 'Classe 2 — Lesão física',
  definition: 'Epiderme e/ou derme alteradas',
  edition: 'NANDA-I 2021-2023',
};

const validOutcome = {
  code: '1101',
  label: 'Integridade tissular: pele e mucosas',
  domain: 'Saúde fisiológica',
  class: 'Integridade tissular',
  edition: 'NOC 6ª ed.',
  scaleAnchors: [
    'Gravemente comprometido',
    'Substancialmente comprometido',
    'Moderadamente comprometido',
    'Levemente comprometido',
    'Não comprometido',
  ] as const,
};

const validIntervention = {
  code: '3660',
  label: 'Cuidados com lesões',
  domain: 'Fisiológico: básico',
  class: 'Controle de pele/lesão',
  edition: 'NIC 7ª ed.',
};

describe('Feature: Sistemas de taxonomia suportados', () => {
  it('Dado o conjunto de sistemas, Quando consultar, Então inclui nanda, noc e nic', () => {
    expect(TAXONOMY_SYSTEMS).toEqual(['nanda', 'noc', 'nic']);
  });
});

describe('Feature: Catálogo de diagnósticos NANDA-I', () => {
  describe('Cenário: criar diagnóstico válido', () => {
    it('Dado dados válidos, Quando criar, Então diagnóstico ativo com id gerado', () => {
      const diagnosis = NursingDiagnosis.create(validDiagnosis);

      expect(diagnosis.id).toBeTruthy();
      expect(diagnosis.code).toBe('00046');
      expect(diagnosis.label).toBe('Integridade da pele prejudicada');
      expect(diagnosis.isActive).toBe(true);
      expect(diagnosis.createdAt).toBeInstanceOf(Date);
    });

    it('Dado definição ausente, Quando criar, Então definição é null', () => {
      const diagnosis = NursingDiagnosis.create({
        ...validDiagnosis,
        definition: undefined,
      });

      expect(diagnosis.definition).toBeNull();
    });
  });

  describe('Cenário: rejeitar dados inválidos', () => {
    it('Dado código fora do padrão de 5 dígitos, Quando criar, Então lança ValidationError', () => {
      expect(() =>
        NursingDiagnosis.create({ ...validDiagnosis, code: '46' }),
      ).toThrow(ValidationError);
    });

    it('Dado rótulo vazio, Quando criar, Então lança ValidationError', () => {
      expect(() =>
        NursingDiagnosis.create({ ...validDiagnosis, label: '  ' }),
      ).toThrow(ValidationError);
    });

    it('Dado edição vazia, Quando criar, Então lança ValidationError', () => {
      expect(() =>
        NursingDiagnosis.create({ ...validDiagnosis, edition: '' }),
      ).toThrow(ValidationError);
    });
  });

  describe('Cenário: ativar e desativar', () => {
    it('Dado diagnóstico ativo, Quando desativar, Então isActive é falso e original preservado', () => {
      const diagnosis = NursingDiagnosis.create(validDiagnosis);

      const deactivated = diagnosis.deactivate();

      expect(deactivated.isActive).toBe(false);
      expect(diagnosis.isActive).toBe(true);
    });

    it('Dado diagnóstico inativo, Quando reativar, Então isActive é verdadeiro', () => {
      const diagnosis = NursingDiagnosis.create(validDiagnosis).deactivate();

      expect(diagnosis.reactivate().isActive).toBe(true);
    });
  });

  it('Dado restore, Quando reconstituir, Então mantém todos os campos', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const diagnosis = NursingDiagnosis.restore({
      id: 'd1',
      ...validDiagnosis,
      active: false,
      createdAt,
    });

    expect(diagnosis.id).toBe('d1');
    expect(diagnosis.isActive).toBe(false);
    expect(diagnosis.createdAt).toEqual(createdAt);
  });
});

describe('Feature: Catálogo de resultados NOC', () => {
  describe('Cenário: criar resultado válido', () => {
    it('Dado dados válidos, Quando criar, Então resultado ativo com escala de 5 âncoras', () => {
      const outcome = NursingOutcome.create(validOutcome);

      expect(outcome.code).toBe('1101');
      expect(outcome.label).toBe(validOutcome.label);
      expect(outcome.domain).toBe(validOutcome.domain);
      expect(outcome.class).toBe(validOutcome.class);
      expect(outcome.edition).toBe(validOutcome.edition);
      expect(outcome.scale.labelFor(1)).toBe('Gravemente comprometido');
      expect(outcome.scale.labelFor(5)).toBe('Não comprometido');
      expect(outcome.isActive).toBe(true);
      expect(outcome.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Cenário: ativar e desativar', () => {
    it('Dado resultado ativo, Quando desativar, Então isActive é falso; reativar volta a verdadeiro', () => {
      const outcome = NursingOutcome.create(validOutcome);

      const deactivated = outcome.deactivate();

      expect(deactivated.isActive).toBe(false);
      expect(deactivated.reactivate().isActive).toBe(true);
    });
  });

  it('Dado restore, Quando reconstituir, Então mantém id, escala e createdAt', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const scale = NocScale.create(validOutcome.scaleAnchors);
    const outcome = NursingOutcome.restore({
      id: 'o1',
      code: '1101',
      label: validOutcome.label,
      domain: validOutcome.domain,
      class: validOutcome.class,
      edition: validOutcome.edition,
      scale,
      active: true,
      createdAt,
    });

    expect(outcome.id).toBe('o1');
    expect(outcome.scale).toBe(scale);
    expect(outcome.createdAt).toEqual(createdAt);
  });

  describe('Cenário: rejeitar dados inválidos', () => {
    it('Dado código fora do padrão de 4 dígitos, Quando criar, Então lança ValidationError', () => {
      expect(() =>
        NursingOutcome.create({ ...validOutcome, code: '11011' }),
      ).toThrow(ValidationError);
    });

    it('Dado escala com menos de 5 âncoras, Quando criar, Então lança ValidationError', () => {
      expect(() =>
        NursingOutcome.create({
          ...validOutcome,
          scaleAnchors: [
            'a',
            'b',
            'c',
            'd',
          ] as unknown as typeof validOutcome.scaleAnchors,
        }),
      ).toThrow(ValidationError);
    });

    it('Dado âncora com rótulo vazio, Quando criar, Então lança ValidationError', () => {
      expect(() =>
        NursingOutcome.create({
          ...validOutcome,
          scaleAnchors: ['a', 'b', '', 'd', 'e'] as const,
        }),
      ).toThrow(ValidationError);
    });
  });
});

describe('Feature: Escala NOC (NocScale)', () => {
  it('Dado 5 âncoras válidas, Quando criar, Então labelFor retorna o rótulo de cada pontuação', () => {
    const scale = NocScale.create(['1', '2', '3', '4', '5']);

    expect(scale.labelFor(1)).toBe('1');
    expect(scale.labelFor(5)).toBe('5');
  });

  it('Dado pontuação fora de 1–5, Quando labelFor, Então lança ValidationError', () => {
    const scale = NocScale.create(['1', '2', '3', '4', '5']);

    expect(() => scale.labelFor(0)).toThrow(ValidationError);
    expect(() => scale.labelFor(6)).toThrow(ValidationError);
    expect(() => scale.labelFor(2.5)).toThrow(ValidationError);
  });

  it('Dado diferente de 5 âncoras, Quando criar, Então lança ValidationError', () => {
    expect(() =>
      NocScale.create(['1', '2', '3', '4'] as unknown as never),
    ).toThrow(ValidationError);
  });
});

describe('Feature: Catálogo de intervenções NIC', () => {
  describe('Cenário: criar intervenção válida', () => {
    it('Dado dados válidos, Quando criar, Então intervenção ativa com id gerado', () => {
      const intervention = NursingIntervention.create(validIntervention);

      expect(intervention.code).toBe('3660');
      expect(intervention.isActive).toBe(true);
    });
  });

  describe('Cenário: rejeitar dados inválidos', () => {
    it('Dado código fora do padrão de 4 dígitos, Quando criar, Então lança ValidationError', () => {
      expect(() =>
        NursingIntervention.create({ ...validIntervention, code: '366' }),
      ).toThrow(ValidationError);
    });

    it('Dado classe vazia, Quando criar, Então lança ValidationError', () => {
      expect(() =>
        NursingIntervention.create({ ...validIntervention, class: ' ' }),
      ).toThrow(ValidationError);
    });
  });

  describe('Cenário: ativar e desativar', () => {
    it('Dado intervenção ativa, Quando desativar, Então isActive é falso; reativar volta a verdadeiro', () => {
      const intervention = NursingIntervention.create(validIntervention);

      const deactivated = intervention.deactivate();

      expect(deactivated.isActive).toBe(false);
      expect(deactivated.reactivate().isActive).toBe(true);
    });
  });

  it('Dado restore, Quando reconstituir, Então mantém todos os campos', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const intervention = NursingIntervention.restore({
      id: 'i1',
      ...validIntervention,
      active: false,
      createdAt,
    });

    expect(intervention.id).toBe('i1');
    expect(intervention.domain).toBe(validIntervention.domain);
    expect(intervention.class).toBe(validIntervention.class);
    expect(intervention.edition).toBe(validIntervention.edition);
    expect(intervention.isActive).toBe(false);
    expect(intervention.createdAt).toEqual(createdAt);
  });
});

describe('Feature: Ligação NANDA→NOC/NIC (TaxonomyLinkage)', () => {
  it('Dado diagnóstico e código de destino, Quando criar, Então ligação com papel definido', () => {
    const linkage = TaxonomyLinkage.create({
      diagnosisCode: '00046',
      role: 'outcome',
      targetCode: '1101',
    });

    expect(linkage.diagnosisCode).toBe('00046');
    expect(linkage.role).toBe('outcome');
    expect(linkage.targetCode).toBe('1101');
  });

  it('Dado código de destino vazio, Quando criar, Então lança ValidationError', () => {
    expect(() =>
      TaxonomyLinkage.create({
        diagnosisCode: '00046',
        role: 'intervention',
        targetCode: ' ',
      }),
    ).toThrow(ValidationError);
  });

  it('Dado diagnosisCode vazio, Quando criar, Então lança ValidationError', () => {
    expect(() =>
      TaxonomyLinkage.create({
        diagnosisCode: ' ',
        role: 'outcome',
        targetCode: '1101',
      }),
    ).toThrow(ValidationError);
  });

  it('Dado papel inválido, Quando criar, Então lança ValidationError', () => {
    expect(() =>
      TaxonomyLinkage.create({
        diagnosisCode: '00046',
        role: 'diagnosis' as unknown as 'outcome',
        targetCode: '1101',
      }),
    ).toThrow(ValidationError);
  });
});
