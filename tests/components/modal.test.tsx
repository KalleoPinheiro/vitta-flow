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

      fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Dado closeLabel=\"Fechar\" no DialogContent, Então há exatamente um botão com nome acessível Fechar e nenhum Close dialog", () => {
      render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <p>Conteúdo</p>
        </Modal>,
      );

      expect(screen.getAllByRole("button", { name: "Fechar" })).toHaveLength(1);
      expect(screen.queryByRole("button", { name: "Close dialog" })).not.toBeInTheDocument();
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

      // SPEC_DEVIATION: na 3.x o DialogOverlay do pacote emite a classe semântica
      // `sv-overlay` (estilizada em style.css com position:fixed;inset:0) em vez das
      // classes utilitárias Tailwind `fixed inset-0` da 2.x — mudança de
      // implementação não listada nas 3 quebras do Problem Statement da spec.
      // O comportamento (overlay fixo cobrindo a tela) é o mesmo; a asserção segue
      // a classe real emitida pelo pacote em vez de um utilitário que ele não
      // emite mais.
      const overlay = document.querySelector('[data-state="open"].sv-overlay');
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

      // SPEC_DEVIATION: na 3.x o DialogContent do pacote emite a classe semântica
      // `sv-dialog` (estilizada em style.css com background: var(--sv-surface)) em
      // vez do utilitário Tailwind `bg-sv-surface` da 2.x — mesma mudança de
      // implementação do overlay acima, não listada nas 3 quebras do Problem
      // Statement da spec. A cor de fundo renderizada é a mesma; a asserção segue
      // a classe real emitida pelo pacote.
      expect(screen.getByRole("dialog")).toHaveClass("sv-dialog");
    });

    it("Dado o modal renderizado, Então não tem sombra — regra de fidelidade do Still Void", () => {
      render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <p>Conteúdo</p>
        </Modal>,
      );

      // O DialogContent do pacote traz `shadow-lg`, contrariando a propria regra
      // "cards have no shadow" do README da lib. O app neutraliza com shadow-none.
      expect(screen.getByRole("dialog")).toHaveClass("shadow-none");
      expect(screen.getByRole("dialog")).not.toHaveClass("shadow-lg");
    });

    // SPEC_DEVIATION: a partir da 3.2.0, o `closeLabel` nativo faz o `DialogContent`
    // anexar o botão de fechar DEPOIS de `{children}` no DOM (antes o app o colocava
    // ANTES, no cabeçalho, via `DialogClose` manual). Isso inverte a ordem de foco:
    // era [Fechar, conteúdo], agora é [conteúdo, Fechar]. O autofocus inicial e o
    // ciclo de Tab (abaixo) passam a considerar o primeiro elemento focável do
    // conteúdo do modal como "primeiro", e o botão nativo "Fechar" como "último".
    // Continua acessível — Escape, clique e Tab cíclico funcionam — só a posição
    // relativa mudou. Decisão confirmada com o usuário: adotar a ordem nova da lib.
    it("Dado o modal montado, Então o foco vai para o primeiro elemento focável dentro dele", async () => {
      render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <button type="button">Salvar</button>
        </Modal>,
      );

      await waitFor(() => {
        expect(screen.getByText("Salvar")).toHaveFocus();
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
        expect(screen.getByRole("button", { name: "Fechar" })).toHaveFocus();
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
    // SPEC_DEVIATION: mesma mudança de ordem descrita acima (autofocus) — o botão
    // nativo "Fechar" agora é o ÚLTIMO focável (renderizado depois de `{children}`),
    // e "Salvar" (conteúdo do modal) é o PRIMEIRO. Os dois testes abaixo focam/
    // asserem na direção correta para essa ordem nova.
    it("Dado foco no último elemento focável, Quando Tab é pressionado, Então o foco volta ao primeiro", () => {
      render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <button type="button">Salvar</button>
        </Modal>,
      );

      const dialog = screen.getByRole("dialog");
      const closeButton = screen.getByRole("button", { name: "Fechar" });
      const saveButton = screen.getByText("Salvar");
      closeButton.focus();

      fireEvent.keyDown(dialog, { key: "Tab" });

      expect(saveButton).toHaveFocus();
    });

    it("Dado foco no primeiro elemento focável, Quando Shift+Tab é pressionado, Então o foco vai ao último", () => {
      render(
        <Modal title="Detalhes" onClose={vi.fn()}>
          <button type="button">Salvar</button>
        </Modal>,
      );

      const dialog = screen.getByRole("dialog");
      const closeButton = screen.getByRole("button", { name: "Fechar" });
      const saveButton = screen.getByText("Salvar");
      saveButton.focus();

      fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });

      expect(closeButton).toHaveFocus();
    });
  });
});
