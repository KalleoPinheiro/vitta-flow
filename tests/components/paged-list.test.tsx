// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PagedList } from "@/components/paged-list";

afterEach(() => {
  cleanup();
});

describe("Feature: Lista paginada", () => {
  describe("Cenário: estado de carregamento", () => {
    it("Dado items nulo, Quando renderizar, Então exibe indicador de carregamento", () => {
      render(
        <PagedList<string>
          items={null}
          emptyMessage="Nenhum item"
          render={(items) => <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>}
        />,
      );

      expect(screen.getByText("Carregando…")).toBeInTheDocument();
    });
  });

  describe("Cenário: lista vazia", () => {
    it("Dado items com array vazio, Quando renderizar, Então exibe mensagem de estado vazio", () => {
      render(
        <PagedList<string>
          items={[]}
          emptyMessage="Nenhum paciente cadastrado"
          render={(items) => <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>}
        />,
      );

      expect(screen.getByText("Nenhum paciente cadastrado")).toBeInTheDocument();
    });
  });

  describe("Cenário: lista com itens", () => {
    it("Dado items preenchidos, Quando renderizar, Então usa a função render para exibir os itens", () => {
      render(
        <PagedList<string>
          items={["Maria", "João"]}
          emptyMessage="Nenhum item"
          render={(items) => (
            <ul>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        />,
      );

      expect(screen.getByText("Maria")).toBeInTheDocument();
      expect(screen.getByText("João")).toBeInTheDocument();
      expect(screen.queryByText("Nenhum item")).not.toBeInTheDocument();
      expect(screen.queryByText("Carregando…")).not.toBeInTheDocument();
    });
  });
});
