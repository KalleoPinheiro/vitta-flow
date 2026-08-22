// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
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

  describe("Cenário: interação dentro do diálogo", () => {
    // A dismissão por clique NO overlay é coberta em e2e/modal-dismissao.spec.ts:
    // a Radix a implementa ouvindo `pointerdown`, e o jsdom não implementa
    // PointerEvent — nem com polyfill o handler dispara. É comportamento real de
    // browser, então a asserção vive na camada onde há browser de verdade.
    it("Dado clique dentro do diálogo, Quando acionado, Então onClose não é chamado", () => {
      const onClose = vi.fn();
      render(
        <Modal title="Detalhes" onClose={onClose}>
          <p>Conteúdo do card</p>
        </Modal>,
      );

      fireEvent.pointerDown(screen.getByText("Conteúdo do card"));
      fireEvent.click(screen.getByText("Conteúdo do card"));

      expect(onClose).not.toHaveBeenCalled();
    });

    it("Dado o diálogo aberto, Então o overlay de dismissão está presente sobre a página", () => {
      render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <p>Conteúdo</p>
        </Modal>,
      );

      const overlay = document.querySelector('[data-state="open"][class*="fixed inset-0"]');
      expect(overlay).toBeInTheDocument();
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

    it("Dado o modal renderizado, Então o diálogo vem do Dialog do Still Void", () => {
      render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <p>Conteúdo</p>
        </Modal>,
      );

      // `bg-sv-surface` é emitido pelo <DialogContent> do pacote, não pelo app.
      expect(screen.getByRole("dialog")).toHaveClass("bg-sv-surface");
    });

    it("Dado o modal montado, Então o foco vai para o primeiro elemento focável dentro dele", async () => {
      render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <button type="button">Salvar</button>
        </Modal>,
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Fechar")).toHaveFocus();
      });
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
    it("Dado um elemento focado antes de abrir, Quando o modal desmonta, Então o foco volta pra ele", async () => {
      const trigger = document.createElement("button");
      document.body.appendChild(trigger);
      trigger.focus();

      const { unmount } = render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <p>Conteúdo</p>
        </Modal>,
      );
      await waitFor(() => {
        expect(screen.getByLabelText("Fechar")).toHaveFocus();
      });
      unmount();

      expect(trigger).toHaveFocus();

      // A Radix agenda o próprio restore em setTimeout; o foco tem de continuar
      // no gatilho depois que essa limpeza roda, não só no instante do desmonte.
      await new Promise((resolve) => setTimeout(resolve, 100));
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

      const dialog = screen.getByRole("dialog");
      const closeButton = screen.getByLabelText("Fechar");
      const saveButton = screen.getByText("Salvar");
      saveButton.focus();

      fireEvent.keyDown(dialog, { key: "Tab" });

      expect(closeButton).toHaveFocus();
    });

    it("Dado foco no primeiro elemento focável, Quando Shift+Tab é pressionado, Então o foco vai ao último", () => {
      render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <button type="button">Salvar</button>
        </Modal>,
      );

      const dialog = screen.getByRole("dialog");
      const closeButton = screen.getByLabelText("Fechar");
      const saveButton = screen.getByText("Salvar");
      closeButton.focus();

      fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });

      expect(saveButton).toHaveFocus();
    });
  });
});
