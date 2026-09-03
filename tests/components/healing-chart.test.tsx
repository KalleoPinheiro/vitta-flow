// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { HealingChart } from "@/components/healing-chart";
import type { AssessmentDto } from "@/lib/dto";
import { formatDate } from "@/lib/format";

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
      expect(screen.getByText("100mm²")).toBeInTheDocument();
      expect(screen.getByText(formatDate("2026-01-01T00:00:00.000Z"))).toBeInTheDocument();
      expect(screen.getByText(formatDate("2026-01-10T00:00:00.000Z"))).toBeInTheDocument();
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
      const { container } = render(
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
      // A série de dor precisa da classe própria porque ChartLine (still-void
      // 3.2.0) fixa strokeWidth={2} inline e não expõe strokeDasharray/strokeWidth
      // customizados — CSS de maior especificidade sobrepõe o presentation attribute.
      expect(container.querySelector(".healing-chart__pain-line")).not.toBeNull();
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

  describe("Cenário: adoção dos primitivos ChartContainer/ChartAxis/ChartLine (still-void 3.2.0)", () => {
    it("Dado área, score e dor medidos juntos, Quando renderizar, Então as 3 séries usam ChartLine (classe sv-chart__line)", () => {
      const { container } = render(
        <HealingChart
          assessments={[
            buildAssessment({
              id: "a1",
              areaMm2: 100,
              pushScore: 12,
              painScale: 8,
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
            buildAssessment({
              id: "a2",
              areaMm2: 50,
              pushScore: 6,
              painScale: 3,
              createdAt: "2026-01-10T00:00:00.000Z",
            }),
          ]}
        />,
      );

      // Prova de origem: sv-chart__line só existe se a linha vier de ChartLine
      // da lib, não de um <polyline> manual (que não emitia essa classe).
      expect(container.querySelectorAll(".sv-chart__line")).toHaveLength(3);
    });

    it("Dado área, score e dor medidos juntos, Quando renderizar, Então cada série tem uma classe de traço distinta (#94, DOC-07)", () => {
      const { container } = render(
        <HealingChart
          assessments={[
            buildAssessment({
              id: "a1",
              areaMm2: 100,
              pushScore: 12,
              painScale: 8,
              createdAt: "2026-01-01T00:00:00.000Z",
            }),
            buildAssessment({
              id: "a2",
              areaMm2: 50,
              pushScore: 6,
              painScale: 3,
              createdAt: "2026-01-10T00:00:00.000Z",
            }),
          ]}
        />,
      );

      // Legível sem cor: área (sólida, sem classe extra), score (pontilhada)
      // e dor (tracejada) precisam de 3 classes de traço diferentes entre si.
      expect(container.querySelector(".healing-chart__score-line")).not.toBeNull();
      expect(container.querySelector(".healing-chart__pain-line")).not.toBeNull();
      // Marcador de score é quadrado (<rect>), distinto do círculo da área.
      expect(container.querySelectorAll("rect").length).toBeGreaterThan(0);
      expect(container.querySelectorAll("circle").length).toBeGreaterThan(0);
    });

    it("Dado dados suficientes, Quando renderizar, Então a linha de base usa ChartAxis posicionado na mesma posição pixel do <line> manual anterior", () => {
      const { container } = render(
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

      // Posição manual anterior (PAD_LEFT=44, HEIGHT-PAD_BOTTOM=152,
      // WIDTH-PAD_RIGHT=600): x1=44 y1=152 x2=600 y2=152. ChartAxis desenha a
      // partir de (0,0) local — o <g transform="translate(44, 152)"> do
      // consumidor precisa recompor a mesma posição pixel.
      const axisLine = container.querySelector(".sv-chart__axis");
      expect(axisLine).not.toBeNull();
      expect(axisLine?.getAttribute("x1")).toBe("0");
      expect(axisLine?.getAttribute("y1")).toBe("0");
      expect(axisLine?.getAttribute("x2")).toBe("556");
      expect(axisLine?.getAttribute("y2")).toBe("0");
      expect(axisLine?.parentElement?.getAttribute("transform")).toBe("translate(44, 152)");
    });
  });
});
