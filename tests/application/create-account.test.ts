import { describe, it, expect } from "vitest";
import { CreateAccount } from "@/application/auth/create-account";
import { InMemoryUserAccountRepository } from "@/infrastructure/persistence/in-memory/in-memory-foundation-repositories";
import { ProvisioningDeniedError, ValidationError } from "@/domain/shared/errors";

const HASH = "scrypt$16384$salt$hash";

describe("Feature: Cadastro de conta respeitando a hierarquia (RBAC-11..14)", () => {
  describe("Cenário: super_admin cadastra qualquer papel em qualquer empresa", () => {
    it("Dado super_admin, Quando cadastrar company_admin em empresa X, Então aceita", async () => {
      const repo = new InMemoryUserAccountRepository();
      const useCase = new CreateAccount(repo);

      const account = await useCase.execute(
        { role: "super_admin", clinicId: null },
        { email: "novo@x.com", passwordHash: HASH, role: "company_admin", clinicId: "clinic-x" },
      );

      expect(account.role).toBe("company_admin");
      expect(account.clinicId).toBe("clinic-x");
    });

    it("Dado super_admin, Quando cadastrar outro super_admin, Então aceita", async () => {
      const repo = new InMemoryUserAccountRepository();
      const useCase = new CreateAccount(repo);

      const account = await useCase.execute(
        { role: "super_admin", clinicId: null },
        { email: "outro-sa@x.com", passwordHash: HASH, role: "super_admin", clinicId: "clinic-x" },
      );

      expect(account.role).toBe("super_admin");
    });
  });

  describe("Cenário: company_admin cadastra dentro da própria empresa", () => {
    it.each(["profissional", "atendente", "patient", "partner", "company_admin"] as const)(
      "Dado company_admin, Quando cadastrar %s na própria empresa, Então aceita",
      async (targetRole) => {
        const repo = new InMemoryUserAccountRepository();
        const useCase = new CreateAccount(repo);

        const account = await useCase.execute(
          { role: "company_admin", clinicId: "clinic-a" },
          { email: `${targetRole}@x.com`, passwordHash: HASH, role: targetRole, clinicId: "clinic-a" },
        );

        expect(account.role).toBe(targetRole);
      },
    );

    it("Dado company_admin, Quando cadastrar super_admin, Então rejeita (ProvisioningDeniedError)", async () => {
      const repo = new InMemoryUserAccountRepository();
      const useCase = new CreateAccount(repo);

      await expect(
        useCase.execute(
          { role: "company_admin", clinicId: "clinic-a" },
          { email: "sa@x.com", passwordHash: HASH, role: "super_admin", clinicId: "clinic-a" },
        ),
      ).rejects.toThrow(ProvisioningDeniedError);
    });

    it("Dado company_admin, Quando cadastrar em empresa diferente, Então rejeita (ProvisioningDeniedError)", async () => {
      const repo = new InMemoryUserAccountRepository();
      const useCase = new CreateAccount(repo);

      await expect(
        useCase.execute(
          { role: "company_admin", clinicId: "clinic-a" },
          {
            email: "outra-empresa@x.com",
            passwordHash: HASH,
            role: "patient",
            clinicId: "clinic-b",
          },
        ),
      ).rejects.toThrow(ProvisioningDeniedError);
    });

    it("Dado duas contas company_admin cadastradas na mesma empresa, Quando ambas existem, Então aceita as duas (sem limite)", async () => {
      const repo = new InMemoryUserAccountRepository();
      const useCase = new CreateAccount(repo);

      await useCase.execute(
        { role: "super_admin", clinicId: null },
        { email: "admin1@x.com", passwordHash: HASH, role: "company_admin", clinicId: "clinic-a" },
      );
      const second = await useCase.execute(
        { role: "company_admin", clinicId: "clinic-a" },
        { email: "admin2@x.com", passwordHash: HASH, role: "company_admin", clinicId: "clinic-a" },
      );

      expect(second.role).toBe("company_admin");
      expect(await repo.findAll()).toHaveLength(2);
    });
  });

  describe("Cenário: atendente e profissional cadastram só patient/partner", () => {
    it.each(["atendente", "profissional"] as const)(
      "Dado %s, Quando cadastrar patient na própria empresa, Então aceita",
      async (actorRole) => {
        const repo = new InMemoryUserAccountRepository();
        const useCase = new CreateAccount(repo);

        const account = await useCase.execute(
          { role: actorRole, clinicId: "clinic-a" },
          { email: `paciente-${actorRole}@x.com`, passwordHash: HASH, role: "patient", clinicId: "clinic-a" },
        );

        expect(account.role).toBe("patient");
      },
    );

    it.each(["atendente", "profissional"] as const)(
      "Dado %s, Quando cadastrar profissional, Então rejeita (ProvisioningDeniedError)",
      async (actorRole) => {
        const repo = new InMemoryUserAccountRepository();
        const useCase = new CreateAccount(repo);

        await expect(
          useCase.execute(
            { role: actorRole, clinicId: "clinic-a" },
            {
              email: `outro-prof-${actorRole}@x.com`,
              passwordHash: HASH,
              role: "profissional",
              clinicId: "clinic-a",
            },
          ),
        ).rejects.toThrow(ProvisioningDeniedError);
      },
    );
  });

  describe("Cenário: patient e partner não cadastram ninguém (RBAC-10)", () => {
    it.each(["patient", "partner"] as const)(
      "Dado %s, Quando tentar cadastrar qualquer papel, Então rejeita (ProvisioningDeniedError)",
      async (actorRole) => {
        const repo = new InMemoryUserAccountRepository();
        const useCase = new CreateAccount(repo);

        await expect(
          useCase.execute(
            { role: actorRole, clinicId: "clinic-a" },
            { email: `x-${actorRole}@x.com`, passwordHash: HASH, role: "patient", clinicId: "clinic-a" },
          ),
        ).rejects.toThrow(ProvisioningDeniedError);
      },
    );
  });

  describe("Cenário: email duplicado", () => {
    it("Dado email já cadastrado, Quando cadastrar de novo, Então rejeita (ValidationError)", async () => {
      const repo = new InMemoryUserAccountRepository();
      const useCase = new CreateAccount(repo);

      await useCase.execute(
        { role: "super_admin", clinicId: null },
        { email: "duplicado@x.com", passwordHash: HASH, role: "patient", clinicId: "clinic-a" },
      );

      await expect(
        useCase.execute(
          { role: "super_admin", clinicId: null },
          { email: "duplicado@x.com", passwordHash: HASH, role: "partner", clinicId: "clinic-a" },
        ),
      ).rejects.toThrow(ValidationError);
    });
  });
});
