import { describe, expect, it } from 'vitest';
import { literal, rx } from '../../e2e/support/regexp';

/**
 * A suíte E2E monta seletores a partir de nomes de fixture. Sem escape, um nome com
 * metacaractere vira padrão: casa a linha errada ou explode em erro de sintaxe.
 *
 * O helper resolve isso por construção — o chamador não escapa nada, e por isso não
 * tem como esquecer. `new RegExp` existe em um único ponto do repositório (dentro de
 * `rx`), o que também zera o ruído da regra Semgrep `detect-non-literal-regexp`.
 * Estes testes não usam `new RegExp`: usá-lo aqui reintroduziria o padrão removido.
 */
describe('Feature: Construção de RegExp a partir de valor dinâmico', () => {
  describe('literal — valor inteiro tratado como texto', () => {
    it('Dado nome com metacaracteres, Quando casar, Então casa o literal e só ele', () => {
      const name = 'Dr. Ana (Cardio) [1+1] {x} ^fim$ a|b *';

      expect(literal(name).test(name)).toBe(true);
      // Sem escape, o `|` viraria alternação e o padrão casaria pelo ramo "b *" —
      // qualquer texto contendo um "b" bastaria.
      expect(literal(name).test('outra fixture com b e espaco')).toBe(false);
    });

    it('Dado ponto no nome, Quando casar, Então não funciona como curinga', () => {
      // Sem escape, o "." é curinga e "Dr. Ana" casaria com "DrX Ana" — outra fixture.
      expect(literal('Dr. Ana').test('DrX Ana')).toBe(false);
      expect(literal('Dr. Ana').test('Dr. Ana')).toBe(true);
    });

    it('Dado parêntese não balanceado, Quando construir, Então não lança erro de sintaxe', () => {
      expect(() => literal('Bolsa (200ml')).not.toThrow();
      expect(literal('Bolsa (200ml').test('Bolsa (200ml')).toBe(true);
    });

    it('Dado nome sem metacaracteres, Quando casar dentro de uma linha, Então encontra', () => {
      expect(
        literal('Paciente E2E ab12cd34').test('Paciente E2E ab12cd34 | Ativo'),
      ).toBe(true);
    });
  });

  describe('rx — parte estática é padrão, valor interpolado é texto', () => {
    it('Dado padrão na parte estática, Quando casar, Então a parte estática continua padrão', () => {
      const pattern = rx`vence(m)? em até 30 dias.*${'Soro 0.9% (500ml)'}`;

      // Se `rx` escapasse também a parte estática, `(m)?` viraria texto e nenhuma
      // das duas frases casaria.
      expect(
        pattern.test('2 itens vencem em até 30 dias — Soro 0.9% (500ml)'),
      ).toBe(true);
      expect(
        pattern.test('1 item vence em até 30 dias — Soro 0.9% (500ml)'),
      ).toBe(true);
    });

    it('Dado metacaractere no valor interpolado, Quando casar, Então é tratado como texto', () => {
      const pattern = rx`Retorno antecipado: foto de ${'Ferida (t.1)'}`;

      expect(pattern.test('Retorno antecipado: foto de Ferida (t.1)')).toBe(
        true,
      );
      // Sem escape do valor, o "." casaria o "X" e esta outra fixture passaria.
      expect(pattern.test('Retorno antecipado: foto de Ferida (tX1)')).toBe(
        false,
      );
    });

    it('Dado dois valores interpolados, Quando casar, Então cada um fica na sua posição', () => {
      const pattern = rx`followUpId=${'f.1'}.*patientId=${'p+2'}`;

      expect(pattern.test('?followUpId=f.1&origem=sms&patientId=p+2')).toBe(
        true,
      );
      // Ordem trocada não casa.
      expect(pattern.test('?followUpId=p+2&origem=sms&patientId=f.1')).toBe(
        false,
      );
      // Valor escapado: "fX1" não é "f.1".
      expect(pattern.test('?followUpId=fX1&origem=sms&patientId=p+2')).toBe(
        false,
      );
    });

    it('Dado escape de regex na parte estática, Quando casar, Então chega intacto ao padrão', () => {
      // A forma cozida do template literal descartaria a barra: `\d` viraria `d`, e o
      // padrão passaria a casar "dd un" em vez de "10 un". Por isso `rx` lê `parts.raw`.
      expect(rx`\d+ un`.test('10 un')).toBe(true);
      expect(rx`\d+ un`.test('dd un')).toBe(false);
    });

    it('Dado template sem interpolação, Quando casar, Então vale como padrão puro', () => {
      expect(rx`^10 un`.test('10 unidades')).toBe(true);
      expect(rx`^10 un`.test('de 10 unidades')).toBe(false);
    });
  });
});
