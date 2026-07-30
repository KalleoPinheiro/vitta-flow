// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LoadMoreButton } from "@/components/load-more-button";

afterEach(() => {
  cleanup();
});

describe("Feature: Botão carregar mais", () => {
  describe("Cenário: visibilidade condicional", () => {
    it("Dado visible falso, Quando renderizar, Então não exibe o botão", () => {
      const { container } = render(<LoadMoreButton visible={false} onClick={vi.fn()} />);

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByText("Carregar mais")).not.toBeInTheDocument();
    });

    it("Dado visible verdadeiro, Quando renderizar, Então exibe o botão", () => {
      render(<LoadMoreButton visible={true} onClick={vi.fn()} />);

      expect(screen.getByRole("button", { name: "Carregar mais" })).toBeInTheDocument();
    });
  });

  describe("Cenário: interação de clique", () => {
    it("Dado botão visível, Quando clicado, Então onClick é chamado", () => {
      const onClick = vi.fn();
      render(<LoadMoreButton visible={true} onClick={onClick} />);

      fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
