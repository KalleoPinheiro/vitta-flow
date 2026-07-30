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

      const alert = screen.getByText("Falha ao salvar paciente");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass("text-red-800");
    });
  });

  describe("Cenário: indicador de carregamento", () => {
    it("Dado nenhuma prop, Quando renderizar LoadingIndicator, Então exibe texto de carregamento", () => {
      render(<LoadingIndicator />);

      expect(screen.getByText("Carregando…")).toBeInTheDocument();
    });
  });

  describe("Cenário: estado vazio", () => {
    it("Dado uma mensagem, Quando renderizar EmptyState, Então exibe a mensagem informada", () => {
      render(<EmptyState message="Nenhum registro encontrado" />);

      expect(screen.getByText("Nenhum registro encontrado")).toBeInTheDocument();
    });
  });
});
