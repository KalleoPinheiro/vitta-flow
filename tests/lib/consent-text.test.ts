import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CONSENT_TEXT, CONSENT_TEXT_VERSION } from '@/lib/consent-text';

describe('Feature: Texto canônico do termo de consentimento', () => {
  it("Dado o texto do consentimento, Quando ler a versão, Então é 'v1'", () => {
    expect(CONSENT_TEXT_VERSION).toBe('v1');
  });

  it('Dado o texto do consentimento, Quando ler o conteúdo, Então inclui a versão no cabeçalho', () => {
    expect(CONSENT_TEXT).toContain(`(${CONSENT_TEXT_VERSION})`);
    expect(CONSENT_TEXT).toContain(
      'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO',
    );
  });

  it('Dado o texto do consentimento, Quando ler o conteúdo, Então menciona LGPD e registro fotográfico', () => {
    expect(CONSENT_TEXT).toContain('Lei Geral de Proteção de Dados');
    expect(CONSENT_TEXT).toContain('Lei nº 13.709/2018');
    expect(CONSENT_TEXT).toContain('registro fotográfico');
  });

  it('Dado o texto do consentimento, Quando calcular hash SHA-256, Então é estável (mesmo texto, mesmo hash)', () => {
    const hash1 = createHash('sha256').update(CONSENT_TEXT).digest('hex');
    const hash2 = createHash('sha256').update(CONSENT_TEXT).digest('hex');

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });
});
