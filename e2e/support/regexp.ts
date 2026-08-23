/**
 * Escapa um valor para uso literal dentro de `new RegExp(...)`.
 *
 * Os seletores da suíte montam padrões a partir de nomes de fixture (paciente,
 * insumo, procedimento). Sem escape, um nome com `.`, `(`, `+` etc. é interpretado
 * como padrão: casa a linha errada ou quebra com erro de sintaxe — e é o que a regra
 * Semgrep `detect-non-literal-regexp` aponta.
 */
export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
