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

  describe("Cenário: semântica de diálogo acessível", () => {
    it("Dado o modal renderizado, Então expõe role dialog com aria-modal e título associado", () => {
      render(
        <Modal title="Detalhes do paciente" onClose={vi.fn()}>
          <p>Conteúdo</p>
        </Modal>,
      );

      const dialog = screen.getByRole("dialog", { name: "Detalhes do paciente" });
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("Dado o modal montado, Então o foco vai para o primeiro elemento focável dentro dele", () => {
      render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <button type="button">Salvar</button>
        </Modal>,
      );

      expect(screen.getByLabelText("Fechar")).toHaveFocus();
    });
  });

  describe("Cenário: fechamento pela tecla Escape", () => {
    it("Dado Escape pressionado, Quando o modal está aberto, Então onClose é chamado", () => {
      const onClose = vi.fn();
      render(
        <Modal title="Detalhes" onClose={onClose}>
          <p>Conteúdo</p>
        </Modal>,
      );

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Cenário: restauração de foco ao fechar", () => {
    it("Dado um elemento focado antes de abrir, Quando o modal desmonta, Então o foco volta pra ele", () => {
      const trigger = document.createElement("button");
      document.body.appendChild(trigger);
      trigger.focus();

      const { unmount } = render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <p>Conteúdo</p>
        </Modal>,
      );
      unmount();

      expect(trigger).toHaveFocus();
      trigger.remove();
    });
  });

  describe("Cenário: Tab preso dentro do modal", () => {
    it("Dado foco no último elemento focável, Quando Tab é pressionado, Então o foco volta ao primeiro", () => {
      render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <button type="button">Salvar</button>
        </Modal>,
      );

      const closeButton = screen.getByLabelText("Fechar");
      const saveButton = screen.getByText("Salvar");
      saveButton.focus();

      fireEvent.keyDown(document, { key: "Tab" });

      expect(closeButton).toHaveFocus();
    });
  });
});
