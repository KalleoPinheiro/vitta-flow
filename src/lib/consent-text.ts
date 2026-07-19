/**
 * Texto canônico do termo de consentimento digital (O4.1).
 * O hash SHA-256 deste texto é gravado no aceite: qualquer alteração aqui
 * invalida aceites anteriores (paciente precisa aceitar de novo) — por isso
 * o texto é fixo, sem interpolação de dados variáveis.
 */
export const CONSENT_TEXT_VERSION = "v1";

export const CONSENT_TEXT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (${CONSENT_TEXT_VERSION})

Declaro que fui informado(a), de forma clara e compreensível, sobre a natureza, os
objetivos, os riscos e os benefícios dos procedimentos de estomaterapia propostos,
incluindo cuidados com estomias, tratamento de feridas e orientações correlatas.

Declaro que tive oportunidade de esclarecer todas as minhas dúvidas e que estou ciente
de que posso revogar este consentimento a qualquer momento, sem prejuízo do meu
atendimento.

Autorizo o registro fotográfico da evolução clínica — inclusive fotos enviadas por mim
pelo portal — exclusivamente para fins de acompanhamento terapêutico e documentação em
prontuário, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).`;
