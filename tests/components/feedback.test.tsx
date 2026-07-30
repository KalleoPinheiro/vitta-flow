// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ErrorAlert, LoadingIndicator, EmptyState } from "@/components/feedback";

afterEach(() => {
  cleanup();
});

describe("Feature: Componentes de feedback", () => {
  describe("Cenário: alerta de erro", () => {
    it("Dado uma mensagem, Quando renderizar ErrorAlert, Então exibe a mensagem com estilo de erro", () => {
      render(<ErrorAlert message="Falha ao salvar paciente" />);

      expect(screen.getByText("Falha ao salvar paciente")).toBeInTheDocument();

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("sv-callout");
      expect(alert.style.getPropertyValue("--sv-callout-color")).toBe("var(--sv-danger-ink)");
    });
  });

  describe("Cenário: indicador de carregamento", () => {
    it("Dado nenhuma prop, Quando renderizar LoadingIndicator, Então exibe texto de carregamento", () => {
      const { container } = render(<LoadingIndicator />);

      expect(screen.getByText("Carregando…")).toBeInTheDocument();
      expect(container.querySelector(".sv-card-skeleton")).toBeInTheDocument();
    });
  });

  describe("Cenário: estado vazio", () => {
    it("Dado uma mensagem, Quando renderizar EmptyState, Então exibe a mensagem informada", () => {
      render(<EmptyState message="Nenhum registro encontrado" />);

      expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
    });
  });
});
