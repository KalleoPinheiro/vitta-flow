import { describe, it, expect } from "vitest";
import { escapeRegExp } from "../../e2e/support/regexp";

/**
 * O helper existe porque a suíte E2E monta seletores com `new RegExp(nome)` a partir
 * de nomes de fixture. Sem escape, um nome com metacaractere vira padrão (Semgrep
 * detect-non-literal-regexp) — casando linhas erradas ou explodindo em erro de sintaxe.
 */
describe("Feature: Escape de valor dinâmico usado em RegExp", () => {
  it("Dado nome com metacaracteres, Quando construir RegExp, Então casa o literal e só ele", () => {
    const name = "Dr. Ana (Cardio) [1+1] {x} ^fim$ a|b *";
    const pattern = new RegExp(escapeRegExp(name));

    expect(pattern.test(name)).toBe(true);
    // Sem escape, o `|` viraria alternação e o padrão casaria pelo ramo "b *" —
    // qualquer texto contendo um "b" bastaria.
    expect(pattern.test("outra fixture com b e espaco")).toBe(false);
  });

  it("Dado ponto no nome, Quando construir RegExp, Então não funciona como curinga", () => {
    // Sem escape, o "." é curinga e "Dr. Ana" casaria com "DrX Ana" — outra fixture.
    expect(new RegExp(escapeRegExp("Dr. Ana")).test("DrX Ana")).toBe(false);
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
