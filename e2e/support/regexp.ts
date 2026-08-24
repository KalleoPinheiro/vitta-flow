/**
 * Construção de RegExp a partir de valores dinâmicos (nomes de fixture: paciente,
 * insumo, procedimento, profissional).
 *
 * O escape é por construção: quem chama não escapa nada e, por isso, não tem como
 * esquecer. Um nome com `.`, `(`, `+` etc. seria interpretado como padrão — casaria a
 * linha errada ou quebraria com erro de sintaxe.
 *
 * `new RegExp` existe em um único ponto do repositório, aqui dentro. Isso zera o ruído
 * da regra Semgrep `detect-non-literal-regexp`, que dispara no formato da chamada e não
 * reconhece o escape: com os 28 call sites anteriores ela rendia 18 findings por scan,
 * o bastante para mascarar um achado real. Ver
 * `.specs/features/ruido-scanners-seguranca/spec.md` (B8, FR-001).
 */

/** Metacaracteres que precisam virar texto literal dentro de um padrão. */
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Tagged template: as partes estáticas são **fonte de regex**, os valores interpolados
 * são **texto literal**.
 *
 * ```ts
 * rx`vence(m)? em até 30 dias.*${supplyName}`
 * ```
 *
 * Usa `parts.raw` para que uma barra invertida escrita no template (`\d`) chegue
 * intacta ao padrão — a forma cozida do template literal a descartaria.
 */
export const rx = (parts: TemplateStringsArray, ...values: readonly string[]): RegExp => {
  let source = parts.raw[0] ?? "";
  for (let index = 0; index < values.length; index += 1) {
    source += escapeRegExp(values[index] ?? "") + (parts.raw[index + 1] ?? "");
  }
  // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  return new RegExp(source);
};

/** Casa o valor inteiro como texto literal. Atalho de `rx` sem parte estática. */
export const literal = (value: string): RegExp => rx`${value}`;
