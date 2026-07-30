// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Modal } from "@/components/modal";

afterEach(() => {
  cleanup();
});

describe("Feature: Modal", () => {
  describe("Cenário: renderização de conteúdo", () => {
    it("Dado título e children, Quando renderizar, Então exibe título e conteúdo filho", () => {
      render(
        <Modal title="Detalhes do paciente" onClose={vi.fn()}>
          <p>Conteúdo do modal</p>
        </Modal>,
      );

      expect(screen.getByText("Detalhes do paciente")).toBeInTheDocument();
      expect(screen.getByText("Conteúdo do modal")).toBeInTheDocument();
    });
  });

  describe("Cenário: fechamento pelo botão", () => {
    it("Dado clique no botão fechar, Quando acionado, Então onClose é chamado", () => {
      const onClose = vi.fn();
      render(
        <Modal title="Detalhes" onClose={onClose}>
          <p>Conteúdo</p>
        </Modal>,
      );

      fireEvent.click(screen.getByLabelText("Fechar"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Cenário: fechamento pelo overlay", () => {
    it("Dado clique no overlay, Quando acionado, Então onClose é chamado", () => {
      const onClose = vi.fn();
      const { container } = render(
        <Modal title="Detalhes" onClose={onClose}>
          <p>Conteúdo</p>
        </Modal>,
      );

      const overlay = container.firstElementChild as HTMLElement;
      fireEvent.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Dado clique dentro do card do modal, Quando acionado, Então onClose não é chamado", () => {
      const onClose = vi.fn();
      render(
        <Modal title="Detalhes" onClose={onClose}>
          <p>Conteúdo do card</p>
        </Modal>,
      );

      fireEvent.click(screen.getByText("Conteúdo do card"));

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
