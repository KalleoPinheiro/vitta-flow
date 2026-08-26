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

      expect(screen.getByRole("navigation", { name: "pagination" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Carregar mais" })).toBeInTheDocument();
    });

    it("Dado visible verdadeiro, Então o botão vem do PaginationNext do Still Void", () => {
      render(<LoadMoreButton visible={true} onClick={vi.fn()} />);

      // SPEC_DEVIATION: migração 3.1.0 -> 3.2.0 fecha a lacuna `pagination`
      // trocando o antigo <Button variant="outline"> por
      // Pagination > PaginationContent > PaginationItem > PaginationNext.
      // A classe emitida pelo componente real da lib é `sv-pagination__link--next`
      // (confirmado em node_modules/@still-void/ui/dist/react/index.js), não mais
      // `sv-btn--outline`. Prova de origem segue a classe real.
      expect(screen.getByRole("button", { name: "Carregar mais" })).toHaveClass(
        "sv-pagination__link--next"
      );
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
