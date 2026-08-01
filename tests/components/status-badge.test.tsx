// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StatusBadge } from "@/components/status-badge";

afterEach(() => {
  cleanup();
});

/** Cor do ponto da pílula, exposta pelo Still Void como a var --sv-pill-color. */
function dotColorOf(status: string, label: string) {
  render(<StatusBadge status={status} label={label} />);
  return screen.getByText(label).style.getPropertyValue("--sv-pill-color");
}

describe("Feature: Selo de status", () => {
  describe("Cenário: status conhecidos recebem cor específica", () => {
    it("Dado status 'scheduled', Quando renderizar, Então usa o token de info", () => {
      expect(dotColorOf("scheduled", "Agendada")).toBe("var(--sv-info-ink)");
    });

    it("Dado status 'confirmed', Quando renderizar, Então usa o accent do sistema", () => {
      expect(dotColorOf("confirmed", "Confirmada")).toBe("var(--sv-accent-ink)");
    });

    it("Dado status 'completed', Quando renderizar, Então usa o token de sucesso", () => {
      expect(dotColorOf("completed", "Concluída")).toBe("var(--sv-success-ink)");
    });

    it("Dado status 'cancelled', Quando renderizar, Então usa o token neutro", () => {
      expect(dotColorOf("cancelled", "Cancelada")).toBe("var(--sv-text-3)");
    });

    it("Dado status 'no_show', Quando renderizar, Então usa o token de aviso", () => {
      expect(dotColorOf("no_show", "Faltou")).toBe("var(--sv-warning-ink)");
    });

    it("Dado status 'pending', Quando renderizar, Então usa o token de aviso", () => {
      expect(dotColorOf("pending", "Pendente")).toBe("var(--sv-warning-ink)");
    });

    it("Dado status 'paid', Quando renderizar, Então usa o token de sucesso", () => {
      expect(dotColorOf("paid", "Pago")).toBe("var(--sv-success-ink)");
    });
  });

  describe("Cenário: status desconhecido usa cor de fallback", () => {
    it("Dado status não mapeado, Quando renderizar, Então usa o token neutro", () => {
      expect(dotColorOf("unknown_status", "Indefinido")).toBe("var(--sv-text-3)");
    });
  });

  describe("Cenário: estrutura da pílula do design system", () => {
    it("Dado qualquer status, Quando renderizar, Então é uma sv-pill com ponto colorido", () => {
      render(<StatusBadge status="paid" label="Pago" />);

      const badge = screen.getByText("Pago");
      expect(badge).toHaveClass("sv-pill");
      // O ponto é decorativo: some para a tecnologia assistiva, que lê só a label.
      const dot = badge.querySelector(".sv-pill__dot");
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Cenário: exibição do texto", () => {
    it("Dado uma label, Quando renderizar, Então o texto da label aparece no documento", () => {
      render(<StatusBadge status="paid" label="Pago" />);

      expect(screen.getByText("Pago")).toBeInTheDocument();
    });
  });
});
