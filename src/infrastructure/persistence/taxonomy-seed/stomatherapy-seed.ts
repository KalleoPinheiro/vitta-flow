import type { NursingDiagnosisProps } from '@/domain/taxonomy/nursing-diagnosis';
import type { NursingInterventionProps } from '@/domain/taxonomy/nursing-intervention';
import type { NursingOutcomeProps } from '@/domain/taxonomy/nursing-outcome';
import type { TaxonomyLinkageProps } from '@/domain/taxonomy/taxonomy-linkage';

/**
 * Subset curado de NANDA-I/NOC/NIC voltado a estomaterapia (pele/tecido, eliminação,
 * dor, conhecimento e imagem corporal), para uso em desenvolvimento e CI.
 *
 * NANDA-I, NOC e NIC são obras protegidas (Thieme / Elsevier-Iowa). Este arquivo NÃO
 * reproduz o corpus das taxonomias — apenas um conjunto pequeno e ilustrativo de
 * código+rótulo, suficiente para exercitar o fluxo do sistema. Uma implantação real
 * importa o catálogo licenciado do cliente via `scripts/import-taxonomy.ts <arquivo>`.
 */

const EDITION_NANDA = 'NANDA-I 2021-2023 (subset ilustrativo)';
const EDITION_NOC = 'NOC 6ª ed. (subset ilustrativo)';
const EDITION_NIC = 'NIC 7ª ed. (subset ilustrativo)';

export const STOMATHERAPY_DIAGNOSES: NursingDiagnosisProps[] = [
  {
    code: '00046',
    label: 'Integridade da pele prejudicada',
    domain: 'Domínio 11 — Segurança/proteção',
    class: 'Classe 2 — Lesão física',
    edition: EDITION_NANDA,
  },
  {
    code: '00047',
    label: 'Risco de integridade da pele prejudicada',
    domain: 'Domínio 11 — Segurança/proteção',
    class: 'Classe 2 — Lesão física',
    edition: EDITION_NANDA,
  },
  {
    code: '00044',
    label: 'Integridade tissular prejudicada',
    domain: 'Domínio 11 — Segurança/proteção',
    class: 'Classe 2 — Lesão física',
    edition: EDITION_NANDA,
  },
  {
    code: '00249',
    label: 'Risco de lesão por pressão',
    domain: 'Domínio 11 — Segurança/proteção',
    class: 'Classe 2 — Lesão física',
    edition: EDITION_NANDA,
  },
  {
    code: '00132',
    label: 'Dor aguda',
    domain: 'Domínio 12 — Conforto',
    class: 'Classe 1 — Conforto físico',
    edition: EDITION_NANDA,
  },
  {
    code: '00016',
    label: 'Eliminação urinária prejudicada',
    domain: 'Domínio 3 — Eliminação e troca',
    class: 'Classe 1 — Função urinária',
    edition: EDITION_NANDA,
  },
  {
    code: '00011',
    label: 'Constipação',
    domain: 'Domínio 3 — Eliminação e troca',
    class: 'Classe 2 — Função gastrintestinal',
    edition: EDITION_NANDA,
  },
  {
    code: '00013',
    label: 'Diarreia',
    domain: 'Domínio 3 — Eliminação e troca',
    class: 'Classe 2 — Função gastrintestinal',
    edition: EDITION_NANDA,
  },
  {
    code: '00126',
    label: 'Conhecimento deficiente',
    domain: 'Domínio 5 — Percepção/cognição',
    class: 'Classe 4 — Cognição',
    edition: EDITION_NANDA,
  },
  {
    code: '00118',
    label: 'Distúrbio na imagem corporal',
    domain: 'Domínio 6 — Autopercepção',
    class: 'Classe 3 — Imagem corporal',
    edition: EDITION_NANDA,
  },
  {
    code: '00004',
    label: 'Risco de infecção',
    domain: 'Domínio 11 — Segurança/proteção',
    class: 'Classe 1 — Infecção',
    edition: EDITION_NANDA,
  },
  {
    code: '00162',
    label: 'Disposição para controle da saúde melhorado',
    domain: 'Domínio 1 — Promoção da saúde',
    class: 'Classe 2 — Controle da saúde',
    edition: EDITION_NANDA,
  },
];

export const STOMATHERAPY_OUTCOMES: NursingOutcomeProps[] = [
  {
    code: '1101',
    label: 'Integridade tissular: pele e mucosas',
    domain: 'Saúde fisiológica',
    class: 'Integridade tissular',
    edition: EDITION_NOC,
    scaleAnchors: [
      'Gravemente comprometido',
      'Substancialmente comprometido',
      'Moderadamente comprometido',
      'Levemente comprometido',
      'Não comprometido',
    ],
  },
  {
    code: '1103',
    label: 'Cicatrização de feridas: segunda intenção',
    domain: 'Saúde fisiológica',
    class: 'Integridade tissular',
    edition: EDITION_NOC,
    scaleAnchors: ['Nenhum', 'Escasso', 'Moderado', 'Substancial', 'Extenso'],
  },
  {
    code: '2102',
    label: 'Nível de dor',
    domain: 'Saúde fisiológica',
    class: 'Sintomas de doença',
    edition: EDITION_NOC,
    scaleAnchors: ['Grave', 'Substancial', 'Moderado', 'Leve', 'Nenhum'],
  },
  {
    code: '0501',
    label: 'Eliminação intestinal',
    domain: 'Saúde fisiológica',
    class: 'Eliminação',
    edition: EDITION_NOC,
    scaleAnchors: [
      'Gravemente comprometido',
      'Substancialmente comprometido',
      'Moderadamente comprometido',
      'Levemente comprometido',
      'Não comprometido',
    ],
  },
  {
    code: '0503',
    label: 'Eliminação urinária',
    domain: 'Saúde fisiológica',
    class: 'Eliminação',
    edition: EDITION_NOC,
    scaleAnchors: [
      'Gravemente comprometido',
      'Substancialmente comprometido',
      'Moderadamente comprometido',
      'Levemente comprometido',
      'Não comprometido',
    ],
  },
  {
    code: '1813',
    label: 'Conhecimento: regime de tratamento',
    domain: 'Saúde psicossocial',
    class: 'Conhecimento de saúde',
    edition: EDITION_NOC,
    scaleAnchors: ['Nenhum', 'Limitado', 'Moderado', 'Substancial', 'Extenso'],
  },
  {
    code: '1824',
    label: 'Conhecimento: controle da doença',
    domain: 'Saúde psicossocial',
    class: 'Conhecimento de saúde',
    edition: EDITION_NOC,
    scaleAnchors: ['Nenhum', 'Limitado', 'Moderado', 'Substancial', 'Extenso'],
  },
  {
    code: '1200',
    label: 'Imagem corporal',
    domain: 'Saúde psicossocial',
    class: 'Adaptação psicossocial',
    edition: EDITION_NOC,
    scaleAnchors: [
      'Gravemente comprometido',
      'Substancialmente comprometido',
      'Moderadamente comprometido',
      'Levemente comprometido',
      'Não comprometido',
    ],
  },
  {
    code: '0703',
    label: 'Gravidade da infecção',
    domain: 'Saúde fisiológica',
    class: 'Controle de risco e segurança',
    edition: EDITION_NOC,
    scaleAnchors: ['Grave', 'Substancial', 'Moderado', 'Leve', 'Nenhum'],
  },
  {
    code: '1617',
    label: 'Autogestão: doença crônica',
    domain: 'Saúde psicossocial',
    class: 'Controle de risco e segurança',
    edition: EDITION_NOC,
    scaleAnchors: [
      'Nunca demonstrado',
      'Raramente demonstrado',
      'Às vezes demonstrado',
      'Frequentemente demonstrado',
      'Consistentemente demonstrado',
    ],
  },
];

export const STOMATHERAPY_INTERVENTIONS: NursingInterventionProps[] = [
  {
    code: '3660',
    label: 'Cuidados com lesões',
    domain: 'Fisiológico: básico',
    class: 'Controle de pele/lesão',
    edition: EDITION_NIC,
  },
  {
    code: '3520',
    label: 'Cuidados com a pele: tratamento tópico',
    domain: 'Fisiológico: básico',
    class: 'Controle de pele/lesão',
    edition: EDITION_NIC,
  },
  {
    code: '0470',
    label: 'Cuidados com ostomia',
    domain: 'Fisiológico: básico',
    class: 'Controle de eliminação',
    edition: EDITION_NIC,
  },
  {
    code: '1400',
    label: 'Controle da dor',
    domain: 'Fisiológico: básico',
    class: 'Promoção do conforto físico',
    edition: EDITION_NIC,
  },
  {
    code: '0450',
    label: 'Controle do intestino',
    domain: 'Fisiológico: básico',
    class: 'Controle de eliminação',
    edition: EDITION_NIC,
  },
  {
    code: '0590',
    label: 'Controle da eliminação urinária',
    domain: 'Fisiológico: básico',
    class: 'Controle de eliminação',
    edition: EDITION_NIC,
  },
  {
    code: '5510',
    label: 'Educação em saúde',
    domain: 'Comportamental',
    class: 'Educação dos pacientes',
    edition: EDITION_NIC,
  },
  {
    code: '5602',
    label: 'Ensino: processo de doença',
    domain: 'Comportamental',
    class: 'Educação dos pacientes',
    edition: EDITION_NIC,
  },
  {
    code: '5230',
    label: 'Melhora do enfrentamento',
    domain: 'Comportamental',
    class: 'Terapia comportamental',
    edition: EDITION_NIC,
  },
  {
    code: '6540',
    label: 'Controle de infecção',
    domain: 'Fisiológico: complexo',
    class: 'Controle de risco',
    edition: EDITION_NIC,
  },
  {
    code: '6550',
    label: 'Proteção contra infecção',
    domain: 'Fisiológico: complexo',
    class: 'Controle de risco',
    edition: EDITION_NIC,
  },
  {
    code: '1750',
    label: 'Cuidado perineal',
    domain: 'Fisiológico: básico',
    class: 'Controle de eliminação',
    edition: EDITION_NIC,
  },
];

export const STOMATHERAPY_LINKAGES: TaxonomyLinkageProps[] = [
  { diagnosisCode: '00046', role: 'outcome', targetCode: '1101' },
  { diagnosisCode: '00046', role: 'outcome', targetCode: '1103' },
  { diagnosisCode: '00046', role: 'intervention', targetCode: '3660' },
  { diagnosisCode: '00046', role: 'intervention', targetCode: '3520' },

  { diagnosisCode: '00047', role: 'outcome', targetCode: '1101' },
  { diagnosisCode: '00047', role: 'intervention', targetCode: '3520' },
  { diagnosisCode: '00047', role: 'intervention', targetCode: '6550' },

  { diagnosisCode: '00044', role: 'outcome', targetCode: '1103' },
  { diagnosisCode: '00044', role: 'intervention', targetCode: '3660' },

  { diagnosisCode: '00249', role: 'outcome', targetCode: '1101' },
  { diagnosisCode: '00249', role: 'intervention', targetCode: '3520' },

  { diagnosisCode: '00132', role: 'outcome', targetCode: '2102' },
  { diagnosisCode: '00132', role: 'intervention', targetCode: '1400' },

  { diagnosisCode: '00016', role: 'outcome', targetCode: '0503' },
  { diagnosisCode: '00016', role: 'intervention', targetCode: '0470' },
  { diagnosisCode: '00016', role: 'intervention', targetCode: '0590' },

  { diagnosisCode: '00011', role: 'outcome', targetCode: '0501' },
  { diagnosisCode: '00011', role: 'intervention', targetCode: '0450' },

  { diagnosisCode: '00013', role: 'outcome', targetCode: '0501' },
  { diagnosisCode: '00013', role: 'intervention', targetCode: '0450' },
  { diagnosisCode: '00013', role: 'intervention', targetCode: '1750' },

  { diagnosisCode: '00126', role: 'outcome', targetCode: '1813' },
  { diagnosisCode: '00126', role: 'outcome', targetCode: '1824' },
  { diagnosisCode: '00126', role: 'intervention', targetCode: '5510' },
  { diagnosisCode: '00126', role: 'intervention', targetCode: '5602' },

  { diagnosisCode: '00118', role: 'outcome', targetCode: '1200' },
  { diagnosisCode: '00118', role: 'intervention', targetCode: '5230' },

  { diagnosisCode: '00004', role: 'outcome', targetCode: '0703' },
  { diagnosisCode: '00004', role: 'intervention', targetCode: '6540' },
  { diagnosisCode: '00004', role: 'intervention', targetCode: '6550' },

  { diagnosisCode: '00162', role: 'outcome', targetCode: '1617' },
  { diagnosisCode: '00162', role: 'intervention', targetCode: '5510' },
];
