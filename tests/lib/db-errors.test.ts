import { describe, it, expect } from "vitest";
import { isUniqueViolation } from "@/lib/db-errors";

describe("Feature: isUniqueViolation", () => {
  it("Dado um erro com code 23505 na raiz, Quando checar, Então true", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("Dado um DrizzleQueryError com code 23505 em .cause, Quando checar, Então true", () => {
    const cause = { code: "23505" };
    const error = new Error("query failed", { cause });
    expect(isUniqueViolation(error)).toBe(true);
  });

  it("Dado um erro sem relação com unicidade, Quando checar, Então false", () => {
    expect(isUniqueViolation(new Error("outra coisa"))).toBe(false);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});
