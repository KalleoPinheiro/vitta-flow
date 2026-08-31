import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { patients } from "@/infrastructure/persistence/drizzle/schema";
import { withTenant } from "@/infrastructure/persistence/drizzle/tenant-scope";

const dialect = new PgDialect();
const render = (query: ReturnType<typeof withTenant>) =>
  query ? dialect.sqlToQuery(query).sql : undefined;

describe("Feature: Escopo por tenant (withTenant)", () => {
  it("Dado clinicId string, Quando sem extra, Então filtra só por clinic_id", () => {
    const result = withTenant(patients, "clinic-a");

    expect(render(result)).toBe('"patients"."clinic_id" = $1');
  });

  it("Dado clinicId string, Quando com extra, Então compõe clinic_id AND extra", () => {
    const extra = eq(patients.id, "patient-1");

    const result = withTenant(patients, "clinic-a", extra);

    expect(render(result)).toBe('("patients"."clinic_id" = $1 and "patients"."id" = $2)');
  });

  it("Dado clinicId null (papel de sistema), Quando sem extra, Então não filtra nada", () => {
    const result = withTenant(patients, null);

    expect(result).toBeUndefined();
  });

  it("Dado clinicId null (papel de sistema), Quando com extra, Então retorna só o extra sem filtro de clínica", () => {
    const extra = eq(patients.id, "patient-1");

    const result = withTenant(patients, null, extra);

    expect(render(result)).toBe('"patients"."id" = $1');
    expect(render(result)).not.toContain("clinic_id");
  });
});
