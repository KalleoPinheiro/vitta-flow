// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { HealingChart } from "@/components/healing-chart";
import type { AssessmentDto } from "@/lib/dto";

afterEach(() => {
  cleanup();
});

const baseAssessment: AssessmentDto = {
  id: "assessment-1",
  conditionId: "condition-1",
  lengthMm: null,
  widthMm: null,
  depthMm: null,
  areaMm2: null,
  tissueType: null,
  exudate: null,
  painScale: null,
  skinCondition: null,
  complications: null,
  complicationCodes: [],
  detScore: null,
  pushScore: null,
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function buildAssessment(overrides: Partial<AssessmentDto>): AssessmentDto {
  return { ...baseAssessment, ...overrides };
}

describe("Feature: Gráfico de evolução de cicatrização", () => {
  describe("Cenário: dados insuficientes", () => {
    it("Dado lista vazia de avaliações, Quando renderizar, Então exibe mensagem de dados insuficientes", () => {
      render(<HealingChart assessments={[]} />);

      expect(
        screen.getByText(
          "Registre medidas (C×L) ou dor em pelo menos duas avaliações para acompanhar a tendência.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: "Gráfico de evolução da condição" })).not.toBeInTheDocument();
    });

    it("Dado apenas uma avaliação com área medida, Quando renderizar, Então exibe mensagem de dados insuficientes", () => {
      render(
        <HealingChart
          assessments={[
            buildAssessment({
              id: "a1",
              areaMm2: 100,
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
          ]}
        />,
      );

      expect(
        screen.getByText(
          "Registre medidas (C×L) ou dor em pelo menos duas avaliações para acompanhar a tendência.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Cenário: série de área com tendência", () => {
    it("Dado duas avaliações com área decrescente, Quando renderizar, Então exibe SVG e mensagem de redução", () => {
      render(
        <HealingChart
          assessments={[
            buildAssessment({
              id: "a1",
              areaMm2: 100,
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
            buildAssessment({
              id: "a2",
              areaMm2: 50,
              createdAt: "2026-01-10T00:00:00.000Z",
            }),
          ]}
        />,
      );

      expect(screen.getByRole("img", { name: "Gráfico de evolução da condição" })).toBeInTheDocument();
      expect(screen.getByText("Área reduziu 50% desde a primeira medição")).toBeInTheDocument();
    });

    it("Dado duas avaliações com área crescente, Quando renderizar, Então exibe mensagem de aumento", () => {
      render(
        <HealingChart
          assessments={[
            buildAssessment({
              id: "a1",
              areaMm2: 50,
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
            buildAssessment({
              id: "a2",
              areaMm2: 100,
              createdAt: "2026-01-10T00:00:00.000Z",
            }),
          ]}
        />,
      );

      expect(screen.getByText("Área aumentou 100% desde a primeira medição")).toBeInTheDocument();
    });
  });

  describe("Cenário: séries alternativas sem medida de área", () => {
    it("Dado duas avaliações apenas com dor registrada, Quando renderizar, Então exibe o gráfico sem mensagem de tendência de área", () => {
      render(
        <HealingChart
          assessments={[
            buildAssessment({
              id: "a1",
              painScale: 8,
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
            buildAssessment({
              id: "a2",
              painScale: 3,
              createdAt: "2026-01-10T00:00:00.000Z",
            }),
          ]}
        />,
      );

      expect(screen.getByRole("img", { name: "Gráfico de evolução da condição" })).toBeInTheDocument();
      expect(screen.getByText("dor /10")).toBeInTheDocument();
      expect(screen.queryByText(/desde a primeira medição/)).not.toBeInTheDocument();
    });

    it("Dado duas avaliações apenas com score PUSH, Quando renderizar, Então exibe o gráfico usando a série de score", () => {
      render(
        <HealingChart
          assessments={[
            buildAssessment({
              id: "a1",
              pushScore: 12,
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
            buildAssessment({
              id: "a2",
              pushScore: 6,
              createdAt: "2026-01-10T00:00:00.000Z",
            }),
          ]}
        />,
      );

      expect(screen.getByRole("img", { name: "Gráfico de evolução da condição" })).toBeInTheDocument();
    });

    it("Dado duas avaliações apenas com score DET, Quando renderizar, Então exibe o gráfico usando o score DET como fallback", () => {
      render(
        <HealingChart
          assessments={[
            buildAssessment({
              id: "a1",
              detScore: 10,
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
            buildAssessment({
              id: "a2",
              detScore: 5,
              createdAt: "2026-01-10T00:00:00.000Z",
            }),
          ]}
        />,
      );

      expect(screen.getByRole("img", { name: "Gráfico de evolução da condição" })).toBeInTheDocument();
    });
  });

  describe("Cenário: ordenação por data", () => {
    it("Dado avaliações fora de ordem cronológica, Quando renderizar, Então ordena internamente e ainda calcula a tendência", () => {
      render(
        <HealingChart
          assessments={[
            buildAssessment({
              id: "a2",
              areaMm2: 50,
              createdAt: "2026-01-10T00:00:00.000Z",
            }),
            buildAssessment({
              id: "a1",
              areaMm2: 100,
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
          ]}
        />,
      );

      expect(screen.getByText("Área reduziu 50% desde a primeira medição")).toBeInTheDocument();
    });
  });
});
