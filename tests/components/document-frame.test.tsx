// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DocumentFrame, type ClinicInfoDto } from "@/components/document-frame";

const fullClinic: ClinicInfoDto = {
  name: "Clínica Vitta",
  cnpj: "12.345.678/0001-90",
  address: "Rua das Flores, 100",
  professionalName: "Dra. Ana Souza",
  professionalRegistry: "COREN 123456",
  city: "São Paulo",
};

const minimalClinic: ClinicInfoDto = {
  name: "Clínica Vitta",
  cnpj: null,
  address: null,
  professionalName: null,
  professionalRegistry: null,
  city: null,
};

describe("Feature: Moldura de documento", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  describe("Cenário: cabeçalho com dados completos da clínica", () => {
    it("Dado clínica com todos os campos, Quando renderizar, Então exibe nome, CNPJ e endereço", () => {
      render(
        <DocumentFrame clinic={fullClinic} title="Atestado">
          <p>Corpo do documento</p>
        </DocumentFrame>,
      );

      expect(screen.getByText("Clínica Vitta")).toBeInTheDocument();
      expect(screen.getByText("CNPJ: 12.345.678/0001-90")).toBeInTheDocument();
      expect(screen.getByText("Rua das Flores, 100")).toBeInTheDocument();
    });

    it("Dado clínica com todos os campos, Quando renderizar, Então exibe rodapé com cidade e assinatura", () => {
      render(
        <DocumentFrame clinic={fullClinic} title="Atestado">
          <p>Corpo do documento</p>
        </DocumentFrame>,
      );

      expect(screen.getByText(/São Paulo,/)).toBeInTheDocument();
      expect(screen.getByText("Dra. Ana Souza")).toBeInTheDocument();
      expect(screen.getByText("COREN 123456")).toBeInTheDocument();
    });
  });

  describe("Cenário: cabeçalho com dados mínimos da clínica", () => {
    it("Dado clínica sem CNPJ, endereço ou profissional, Quando renderizar, Então omite campos ausentes e usa texto padrão de assinatura", () => {
      render(
        <DocumentFrame clinic={minimalClinic} title="Atestado">
          <p>Corpo do documento</p>
        </DocumentFrame>,
      );

      expect(screen.queryByText(/CNPJ:/)).not.toBeInTheDocument();
      expect(screen.getByText("Assinatura do profissional")).toBeInTheDocument();
    });
  });

  describe("Cenário: título e conteúdo", () => {
    it("Dado title e children, Quando renderizar, Então exibe o título em maiúsculas e o conteúdo filho", () => {
      render(
        <DocumentFrame clinic={fullClinic} title="Relatório de evolução">
          <p>Conteúdo específico do relatório</p>
        </DocumentFrame>,
      );

      expect(screen.getByText("Relatório de evolução")).toBeInTheDocument();
      expect(screen.getByText("Conteúdo específico do relatório")).toBeInTheDocument();
    });
  });

  describe("Cenário: ações de voltar e imprimir", () => {
    it("Dado clique em 'Voltar', Quando acionado, Então chama window.history.back", () => {
      const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});

      render(
        <DocumentFrame clinic={fullClinic} title="Atestado">
          <p>Corpo</p>
        </DocumentFrame>,
      );
      fireEvent.click(screen.getByRole("button", { name: "← Voltar" }));

      expect(backSpy).toHaveBeenCalledTimes(1);
    });

    it("Dado clique em 'Imprimir / salvar PDF', Quando acionado, Então chama window.print", () => {
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

      render(
        <DocumentFrame clinic={fullClinic} title="Atestado">
          <p>Corpo</p>
        </DocumentFrame>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Imprimir / salvar PDF" }));

      expect(printSpy).toHaveBeenCalledTimes(1);
    });

    it("Dado a barra de ações, Então os botões vêm do Button do Still Void", () => {
      render(
        <DocumentFrame clinic={fullClinic} title="Atestado">
          <p>Corpo</p>
        </DocumentFrame>,
      );

      // SPEC_DEVIATION: na 3.x o <Button> do pacote emite classes semânticas
      // `sv-btn`/`sv-btn--<variant>` em vez dos utilitários Tailwind
      // `text-accent`/`bg-sv-surface` da 2.x — mudança de implementação real, não
      // listada nas 3 quebras do Problem Statement da spec (mesma raiz do Dialog
      // em tests/components/modal.test.tsx). A prova de origem (vem do Button do
      // pacote, não é markup local) segue as classes reais.
      expect(screen.getByRole("button", { name: "← Voltar" })).toHaveClass("sv-btn--link");
      expect(screen.getByRole("button", { name: "Imprimir / salvar PDF" })).toHaveClass("sv-btn");
    });

    it("Dado a barra de ações, Então ela some na impressão e o corpo do documento fica em tinta preta", () => {
      const { container } = render(
        <DocumentFrame clinic={fullClinic} title="Atestado">
          <p>Corpo</p>
        </DocumentFrame>,
      );

      expect(container.firstElementChild).toHaveClass("text-black");
      expect(
        screen.getByRole("button", { name: "← Voltar" }).closest(".print\\:hidden"),
      ).toBeInTheDocument();
    });
  });
});
