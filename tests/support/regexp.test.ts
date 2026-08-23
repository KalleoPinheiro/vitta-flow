import { describe, it, expect } from "vitest";
import { escapeRegExp } from "../../e2e/support/regexp";

/**
 * O helper existe porque a suíte E2E monta seletores com `new RegExp(nome)` a partir
 * de nomes de fixture. Sem escape, um nome com metacaractere vira padrão (Semgrep
 * detect-non-literal-regexp) — casando linhas erradas ou explodindo em erro de sintaxe.
 */
describe("Feature: Escape de valor dinâmico usado em RegExp", () => {
  it("Dado nome com metacaracteres, Quando construir RegExp, Então casa literalmente", () => {
    const name = "Dr. Ana (Cardio) [1+1] {x} ^fim$ a|b *";

    expect(new RegExp(escapeRegExp(name)).test(name)).toBe(true);
  });

  it("Dado ponto no nome, Quando construir RegExp, Então não funciona como curinga", () => {
    // Sem escape, "Dr. Ana" casaria com "DrXAna" — linha de outra fixture.
    expect(new RegExp(escapeRegExp("Dr. Ana")).test("DrXAna")).toBe(false);
    expect(new RegExp(escapeRegExp("Dr. Ana")).test("Dr. Ana")).toBe(true);
  });

  it("Dado nome com parêntese não balanceado, Quando construir RegExp, Então não lança erro de sintaxe", () => {
    expect(() => new RegExp(escapeRegExp("Bolsa (200ml"))).not.toThrow();
    expect(new RegExp(escapeRegExp("Bolsa (200ml")).test("Bolsa (200ml")).toBe(true);
  });

  it("Dado nome sem metacaracteres, Quando escapar, Então valor é preservado", () => {
    expect(escapeRegExp("Paciente E2E ab12cd34")).toBe("Paciente E2E ab12cd34");
  });
});
