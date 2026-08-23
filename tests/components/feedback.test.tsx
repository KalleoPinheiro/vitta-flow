// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ErrorAlert, LoadingIndicator, EmptyState } from "@/components/feedback";

afterEach(() => {
  cleanup();
});

describe("Feature: Componentes de feedback", () => {
  describe("Cenário: alerta de erro", () => {
    it("Dado uma mensagem, Quando renderizar ErrorAlert, Então exibe a mensagem com papel de alerta", () => {
      render(<ErrorAlert message="Falha ao salvar paciente" />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Falha ao salvar paciente");
    });

    it("Dado ErrorAlert renderizado, Então o alerta vem do Alert do Still Void", () => {
      render(<ErrorAlert message="Falha ao salvar paciente" />);

      // `bg-sv-surface` é emitido pelo <Alert> do pacote, não pelo app: é a
      // prova de que o alerta é o componente da lib e não markup local.
      expect(screen.getByRole("alert")).toHaveClass("bg-sv-surface");
    });

    it("Dado ErrorAlert renderizado, Então usa o token semântico de erro, não o accent do site", () => {
      render(<ErrorAlert message="Falha ao salvar paciente" />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("border-danger");
      expect(alert.querySelector(".text-danger")).toHaveTextContent("Falha ao salvar paciente");
    });

    it("Dado mensagem vazia, Quando renderizar ErrorAlert, Então ainda expõe o papel de alerta sem quebrar", () => {
      render(<ErrorAlert message="" />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
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
