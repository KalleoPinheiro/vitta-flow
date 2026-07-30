import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPartnerRepository } from "@/infrastructure/persistence/in-memory/in-memory-partner-repository";
import { CreatePartner } from "@/application/partners/create-partner";
import { UpdatePartner } from "@/application/partners/update-partner";
import { ListPartners } from "@/application/partners/list-partners";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";

describe("Feature: Gestão de parceiros (médicos indicadores)", () => {
  let repo: InMemoryPartnerRepository;

  beforeEach(() => {
    repo = new InMemoryPartnerRepository();
  });

  const createCarlos = () =>
    new CreatePartner(repo).execute({
      fullName: "Dr. Carlos Andrade",
      email: "dr.carlos@x.com",
      phone: "11955550000",
      crm: "CRM-SP 123456",
      specialty: "Cirurgia vascular",
    });

  describe("Cenário: cadastrar novo parceiro", () => {
    it("Dado dados válidos, Quando cadastrar, Então parceiro é persistido ativo", async () => {
      const partner = await createCarlos();

      const stored = await repo.findById(partner.id);
      expect(stored?.fullName).toBe("Dr. Carlos Andrade");
      expect(stored?.isActive).toBe(true);
    });

    it("Dado email já cadastrado, Quando cadastrar, Então lança ValidationError", async () => {
      await createCarlos();

      await expect(
        new CreatePartner(repo).execute({
          fullName: "Dr. Outro",
          email: "DR.CARLOS@x.com",
          phone: "11944440000",
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Cenário: atualizar parceiro", () => {
    it("Dado parceiro existente, Quando atualizar especialidade, Então dado é persistido", async () => {
      const partner = await createCarlos();

      await new UpdatePartner(repo).execute({ id: partner.id, specialty: "Angiologia" });

      const stored = await repo.findById(partner.id);
      expect(stored?.specialty).toBe("Angiologia");
    });

    it("Dado id inexistente, Quando atualizar, Então lança NotFoundError", async () => {
      await expect(
        new UpdatePartner(repo).execute({ id: "ghost", specialty: "x" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("Dado email alterado para um já usado por outro parceiro, Quando atualizar, Então lança ValidationError", async () => {
      const carlos = await createCarlos();
      await new CreatePartner(repo).execute({
        fullName: "Dra. Ana Paula",
        email: "ana@x.com",
        phone: "11933330000",
      });

      await expect(
        new UpdatePartner(repo).execute({ id: carlos.id, email: "ana@x.com" }),
      ).rejects.toThrow(ValidationError);
    });

    it("Dado email alterado para o mesmo já usado pelo próprio parceiro, Quando atualizar, Então aceita", async () => {
      const carlos = await createCarlos();

      await expect(
        new UpdatePartner(repo).execute({ id: carlos.id, email: "dr.carlos@x.com" }),
      ).resolves.toBeTruthy();
    });

    it("Dado parceiro ativo, Quando desativar (active: false), Então persiste inativo", async () => {
      const partner = await createCarlos();

      await new UpdatePartner(repo).execute({ id: partner.id, active: false });

      const stored = await repo.findById(partner.id);
      expect(stored?.isActive).toBe(false);
    });

    it("Dado parceiro inativo, Quando reativar (active: true), Então persiste ativo", async () => {
      const partner = await createCarlos();
      await new UpdatePartner(repo).execute({ id: partner.id, active: false });

      await new UpdatePartner(repo).execute({ id: partner.id, active: true });

      const stored = await repo.findById(partner.id);
      expect(stored?.isActive).toBe(true);
    });
  });

  describe("Cenário: listar parceiros", () => {
    it("Dado nenhum parceiro cadastrado, Quando listar, Então retorna lista vazia", async () => {
      const list = await new ListPartners(repo).execute();

      expect(list).toEqual([]);
    });

    it("Dado parceiros cadastrados, Quando listar, Então retorna todos ordenados por nome", async () => {
      await createCarlos();
      await new CreatePartner(repo).execute({
        fullName: "Dra. Ana Paula",
        email: "ana@x.com",
        phone: "11933330000",
      });

      const list = await new ListPartners(repo).execute();

      expect(list).toHaveLength(2);
      expect(list[0].fullName).toBe("Dr. Carlos Andrade");
      expect(list[1].fullName).toBe("Dra. Ana Paula");
    });
  });
});
