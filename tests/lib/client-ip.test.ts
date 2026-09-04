import { describe, expect, it } from 'vitest';
import { clientIpFromHeader } from '@/lib/auth/client-ip';

describe('Feature: IP do cliente por cadeia de proxy confiável (SEC1-10..12)', () => {
  it('Dado XFF com 3 IPs e 1 hop confiável, Quando derivar, Então usa o último da cadeia', () => {
    expect(clientIpFromHeader('203.0.113.7, 10.0.0.2, 172.16.0.1', 1)).toBe(
      '172.16.0.1',
    );
  });

  it('Dado XFF com 3 IPs e 2 hops confiáveis, Quando derivar, Então usa o penúltimo', () => {
    expect(clientIpFromHeader('203.0.113.7, 10.0.0.2, 172.16.0.1', 2)).toBe(
      '10.0.0.2',
    );
  });

  it("Dado header ausente, Quando derivar, Então 'unknown'", () => {
    expect(clientIpFromHeader(null, 1)).toBe('unknown');
  });

  it("Dado hops maior que a cadeia, Quando derivar, Então 'unknown'", () => {
    expect(clientIpFromHeader('203.0.113.7', 2)).toBe('unknown');
  });

  it("Dado header vazio ou só vírgulas, Quando derivar, Então 'unknown'", () => {
    expect(clientIpFromHeader('', 1)).toBe('unknown');
    expect(clientIpFromHeader(' , ', 1)).toBe('unknown');
  });

  it('Dado IPs com espaços, Quando derivar, Então valor aparado', () => {
    expect(clientIpFromHeader('  203.0.113.7 ,  10.0.0.2  ', 1)).toBe(
      '10.0.0.2',
    );
  });

  it('Dado hops inválido (0, negativo ou NaN), Quando derivar, Então usa default de 1 hop', () => {
    expect(clientIpFromHeader('203.0.113.7, 10.0.0.2', 0)).toBe('10.0.0.2');
    expect(clientIpFromHeader('203.0.113.7, 10.0.0.2', -1)).toBe('10.0.0.2');
    expect(clientIpFromHeader('203.0.113.7, 10.0.0.2', Number.NaN)).toBe(
      '10.0.0.2',
    );
  });
});
