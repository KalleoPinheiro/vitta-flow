import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemoryNursingDiagnosisRepository,
  InMemoryNursingInterventionRepository,
  InMemoryNursingOutcomeRepository,
  InMemoryTaxonomyLinkageRepository,
} from "@/infrastructure/persistence/in-memory/in-memory-taxonomy-repositories";
import { SearchDiagnoses } from "@/application/taxonomy/search-diagnoses";
import { SearchOutcomes } from "@/application/taxonomy/search-outcomes";
import { SearchInterventions } from "@/application/taxonomy/search-interventions";
import { SuggestLinkedTerms } from "@/application/taxonomy/suggest-linked-terms";
import { importTaxonomyCatalog } from "@/application/taxonomy/import-taxonomy-catalog";
import {
  STOMATHERAPY_DIAGNOSES,
  STOMATHERAPY_INTERVENTIONS,
  STOMATHERAPY_LINKAGES,
  STOMATHERAPY_OUTCOMES,
} from "@/infrastructure/persistence/taxonomy-seed/stomatherapy-seed";
import { NursingDiagnosis } from "@/domain/taxonomy/nursing-diagnosis";
import { NursingOutcome } from "@/domain/taxonomy/nursing-outcome";
import { NursingIntervention } from "@/domain/taxonomy/nursing-intervention";
import { TaxonomyLinkage } from "@/domain/taxonomy/taxonomy-linkage";

const scaleAnchors = [
  "Gravemente comprometido",
  "Substancialmente comprometido",
  "Moderadamente comprometido",
  "Levemente comprometido",
  "Não comprometido",
] as const;

describe("Feature: Catálogo de taxonomias — casos de uso", () => {
  let diagnoses: InMemoryNursingDiagnosisRepository;
  let outcomes: InMemoryNursingOutcomeRepository;
  let interventions: InMemoryNursingInterventionRepository;
  let linkages: InMemoryTaxonomyLinkageRepository;

  beforeEach(async () => {
    diagnoses = new InMemoryNursingDiagnosisRepository();
    outcomes = new InMemoryNursingOutcomeRepository();
    interventions = new InMemoryNursingInterventionRepository();
    linkages = new InMemoryTaxonomyLinkageRepository();

    await diagnoses.save(
      NursingDiagnosis.create({
        code: "00046",
        label: "Integridade da pele prejudicada",
        domain: "Domínio 11",
        class: "Classe 2",
        edition: "NANDA-I 2021-2023",
      }),
    );
    await outcomes.save(
      NursingOutcome.create({
        code: "1101",
        label: "Integridade tissular: pele e mucosas",
        domain: "Saúde fisiológica",
        class: "Integridade tissular",
        edition: "NOC 6ª ed.",
        scaleAnchors,
      }),
    );
    await interventions.save(
      NursingIntervention.create({
        code: "3660",
        label: "Cuidados com lesões",
        domain: "Fisiológico: básico",
        class: "Controle de pele/lesão",
        edition: "NIC 7ª ed.",
      }),
    );
    await linkages.save(TaxonomyLinkage.create({ diagnosisCode: "00046", role: "outcome", targetCode: "1101" }));
    await linkages.save(
      TaxonomyLinkage.create({ diagnosisCode: "00046", role: "intervention", targetCode: "3660" }),
    );
  });

  describe("Cenário: buscar no catálogo", () => {
    it("Dado termo que casa com rótulo, Quando buscar diagnósticos, Então retorna resultado", async () => {
      const result = await new SearchDiagnoses(diagnoses).execute({ term: "pele" });
      expect(result).toHaveLength(1);
    });

    it("Dado termo que casa com código, Quando buscar resultados, Então retorna resultado", async () => {
      const result = await new SearchOutcomes(outcomes).execute({ term: "1101" });
      expect(result).toHaveLength(1);
    });

    it("Dado termo sem correspondência, Quando buscar intervenções, Então lista vazia", async () => {
      const result = await new SearchInterventions(interventions).execute({ term: "inexistente" });
      expect(result).toHaveLength(0);
    });
  });

  describe("Cenário: sugerir termos ligados", () => {
    it("Dado diagnóstico com ligações, Quando sugerir, Então retorna resultado e intervenção associados", async () => {
      const linked = await new SuggestLinkedTerms(linkages, outcomes, interventions).execute({
        diagnosisCode: "00046",
      });

      expect(linked.outcomes.map((o) => o.code)).toEqual(["1101"]);
      expect(linked.interventions.map((i) => i.code)).toEqual(["3660"]);
    });

    it("Dado diagnóstico sem ligações, Quando sugerir, Então retorna listas vazias", async () => {
      const linked = await new SuggestLinkedTerms(linkages, outcomes, interventions).execute({
        diagnosisCode: "00099",
      });

      expect(linked.outcomes).toHaveLength(0);
      expect(linked.interventions).toHaveLength(0);
    });
  });

  describe("Cenário: importar catálogo (idempotente)", () => {
    it("Dado o subset curado de estomaterapia, Quando importar, Então persiste tudo", async () => {
      const empty = {
        diagnoses: new InMemoryNursingDiagnosisRepository(),
        outcomes: new InMemoryNursingOutcomeRepository(),
        interventions: new InMemoryNursingInterventionRepository(),
        linkages: new InMemoryTaxonomyLinkageRepository(),
      };

      const result = await importTaxonomyCatalog(empty, {
        diagnoses: STOMATHERAPY_DIAGNOSES,
        outcomes: STOMATHERAPY_OUTCOMES,
        interventions: STOMATHERAPY_INTERVENTIONS,
        linkages: STOMATHERAPY_LINKAGES,
      });

      expect(result).toEqual({
        diagnoses: STOMATHERAPY_DIAGNOSES.length,
        outcomes: STOMATHERAPY_OUTCOMES.length,
        interventions: STOMATHERAPY_INTERVENTIONS.length,
        linkages: STOMATHERAPY_LINKAGES.length,
      });
    });

    it("Dado catálogo já importado, Quando importar de novo, Então não duplica (idempotente)", async () => {
      const empty = {
        diagnoses: new InMemoryNursingDiagnosisRepository(),
        outcomes: new InMemoryNursingOutcomeRepository(),
        interventions: new InMemoryNursingInterventionRepository(),
        linkages: new InMemoryTaxonomyLinkageRepository(),
      };
      const catalog = {
        diagnoses: STOMATHERAPY_DIAGNOSES,
        outcomes: STOMATHERAPY_OUTCOMES,
        interventions: STOMATHERAPY_INTERVENTIONS,
        linkages: STOMATHERAPY_LINKAGES,
      };

      await importTaxonomyCatalog(empty, catalog);
      const second = await importTaxonomyCatalog(empty, catalog);

      expect(second).toEqual({ diagnoses: 0, outcomes: 0, interventions: 0, linkages: 0 });
      expect(await empty.diagnoses.findByCodes(STOMATHERAPY_DIAGNOSES.map((d) => d.code))).toHaveLength(
        STOMATHERAPY_DIAGNOSES.length,
      );
    });
  });
});
