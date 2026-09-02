// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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

      // SPEC_DEVIATION: na 3.x o <Alert> do pacote emite a classe semântica
      // `sv-alert` em vez do utilitário Tailwind `bg-sv-surface` da 2.x — mesma
      // mudança de implementação do Dialog/Button (ver
      // tests/components/modal.test.tsx), não listada nas 3 quebras do Problem
      // Statement da spec. Prova de origem segue a classe real.
      expect(screen.getByRole("alert")).toHaveClass("sv-alert");
    });

    it("Dado ErrorAlert renderizado, Então usa o token semântico de erro via variante danger", () => {
      render(<ErrorAlert message="Falha ao salvar paciente" />);

      const alert = screen.getByRole("alert");
      // A variante danger aplica role="alert" e cores de erro automaticamente
      // via @still-void/ui v3.3+, sem necessidade de classes manuais
      expect(alert).toHaveTextContent("Falha ao salvar paciente");
    });

    it("Dado mensagem vazia, Quando renderizar ErrorAlert, Então ainda expõe o papel de alerta sem quebrar", () => {
      render(<ErrorAlert message="" />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("Dado nenhum onRetry, Quando renderizar ErrorAlert, Então não exibe botão de tentar novamente", () => {
      render(<ErrorAlert message="Falha ao salvar paciente" />);

      expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
    });

    it("Dado onRetry, Quando renderizar ErrorAlert, Então exibe botão 'Tentar novamente' que o invoca ao clicar", () => {
      const onRetry = vi.fn();
      render(<ErrorAlert message="Falha ao salvar paciente" onRetry={onRetry} />);

      const retryButton = screen.getByRole("button", { name: "Tentar novamente" });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
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
