import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/infrastructure/persistence/drizzle/schema";
import type { AppDb } from "@/infrastructure/persistence/drizzle/db";
import { DrizzleAuthTokenRepository } from "@/infrastructure/persistence/drizzle/drizzle-auth-token-repository";
import { DrizzleUserAccountRepository } from "@/infrastructure/persistence/drizzle/drizzle-foundation-repositories";
import { AuthToken, hashAuthTokenSecret } from "@/domain/auth/auth-token";
import { UserAccount } from "@/domain/auth/user-account";
import { Clinic } from "@/domain/clinic/clinic";
import { DrizzleClinicRepository } from "@/infrastructure/persistence/drizzle/drizzle-clinic-repository";

const CLINIC_ID = "clinic-auth-tokens";
const NOW = new Date("2026-09-01T12:00:00.000Z").getTime();

/**
 * AUTH-03: token persistido guarda só o hash; expirado, usado ou inexistente
 * nunca sai do repositório como usável.
 */
describe("Feature: Persistência de tokens de ativação (Drizzle)", () => {
  let db: PgliteDatabase<typeof schema>;
  let appDb: AppDb;
  let tokens: DrizzleAuthTokenRepository;
  let accountId: string;

  beforeAll(async () => {
    const client = new PGlite({ extensions: { pg_trgm, btree_gist } });
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    appDb = db as unknown as AppDb;
    tokens = new DrizzleAuthTokenRepository(appDb);

    await new DrizzleClinicRepository(appDb).create(
      Clinic.restore({
        id: CLINIC_ID,
        name: "Clínica dos tokens",
        createdBy: "test",
        createdAt: new Date(NOW),
      }),
    );
    const account = UserAccount.create({
      email: "pessoa@clinica.com",
      passwordHash: "scrypt$16384$aa$bb",
      role: "company_admin",
      clinicId: CLINIC_ID,
    });
    await new DrizzleUserAccountRepository(appDb, CLINIC_ID).save(account);
    accountId = account.id;
  });

  beforeEach(async () => {
    await db.delete(schema.authTokens);
  });

  it("Dado um token salvo, Quando reivindicar pelo hash do segredo, Então devolve o token com os campos preservados e já marcado como usado", async () => {
    const { token, secret } = AuthToken.issue({ accountId, purpose: "invite", nowMs: NOW });
    await tokens.save(token);

    const found = await tokens.claimBySecretHash(hashAuthTokenSecret(secret), NOW + 1000);

    expect(found?.id).toBe(token.id);
    expect(found?.accountId).toBe(accountId);
    expect(found?.purpose).toBe("invite");
    expect(found?.expiresAt.getTime()).toBe(token.expiresAt.getTime());
    // A reivindicação queima o token no mesmo comando que o valida.
    expect(found?.usedAt?.getTime()).toBe(NOW + 1000);
  });

  it("Dado duas reivindicações do mesmo token, Quando concorrerem, Então só a primeira recebe a linha (uso único sob corrida)", async () => {
    const { token, secret } = AuthToken.issue({ accountId, purpose: "invite", nowMs: NOW });
    await tokens.save(token);
    const hash = hashAuthTokenSecret(secret);

    const [first, second] = await Promise.all([
      tokens.claimBySecretHash(hash, NOW + 1000),
      tokens.claimBySecretHash(hash, NOW + 1000),
    ]);

    // Exatamente uma das duas leva o token; a outra é tratada como link inválido.
    expect([first, second].filter((claim) => claim !== null)).toHaveLength(1);
  });

  it("Dado um hash que não existe, Quando buscar, Então devolve null", async () => {
    expect(await tokens.claimBySecretHash(hashAuthTokenSecret("nao-existe"), NOW)).toBeNull();
  });

  it("Dado um token expirado, Quando buscar, Então devolve null", async () => {
    const { token, secret } = AuthToken.issue({ accountId, purpose: "reset", nowMs: NOW });
    await tokens.save(token);

    const found = await tokens.claimBySecretHash(
      hashAuthTokenSecret(secret),
      NOW + 60 * 60 * 1000 + 1,
    );

    expect(found).toBeNull();
  });

  it("Dado um token já marcado como usado, Quando buscar, Então devolve null", async () => {
    const { token, secret } = AuthToken.issue({ accountId, purpose: "invite", nowMs: NOW });
    await tokens.save(token);
    await tokens.save(token.markUsed(new Date(NOW + 10)));

    expect(await tokens.claimBySecretHash(hashAuthTokenSecret(secret), NOW + 20)).toBeNull();
  });

  it("Dado tokens de dois propósitos, Quando invalidar em lote um propósito, Então só ele é invalidado", async () => {
    const invite = AuthToken.issue({ accountId, purpose: "invite", nowMs: NOW });
    const reset = AuthToken.issue({ accountId, purpose: "reset", nowMs: NOW });
    await tokens.save(invite.token);
    await tokens.save(reset.token);

    await tokens.markAllUnusedAsUsed(accountId, "invite", new Date(NOW + 5));

    expect(
      await tokens.claimBySecretHash(hashAuthTokenSecret(invite.secret), NOW + 10),
    ).toBeNull();
    expect(
      await tokens.claimBySecretHash(hashAuthTokenSecret(reset.secret), NOW + 10),
    ).not.toBeNull();
  });

  it("Dado tokens de outra conta, Quando invalidar em lote, Então os da outra conta continuam usáveis", async () => {
    const other = UserAccount.create({
      email: "outra@clinica.com",
      passwordHash: "scrypt$16384$aa$bb",
      role: "atendente",
      clinicId: CLINIC_ID,
    });
    await new DrizzleUserAccountRepository(appDb, CLINIC_ID).save(other);
    const mine = AuthToken.issue({ accountId, purpose: "reset", nowMs: NOW });
    const theirs = AuthToken.issue({ accountId: other.id, purpose: "reset", nowMs: NOW });
    await tokens.save(mine.token);
    await tokens.save(theirs.token);

    await tokens.markAllUnusedAsUsed(accountId, "reset", new Date(NOW + 5));

    expect(
      await tokens.claimBySecretHash(hashAuthTokenSecret(mine.secret), NOW + 10),
    ).toBeNull();
    expect(
      await tokens.claimBySecretHash(hashAuthTokenSecret(theirs.secret), NOW + 10),
    ).not.toBeNull();
  });
});
