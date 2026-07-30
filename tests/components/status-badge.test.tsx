// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StatusBadge } from "@/components/status-badge";

afterEach(() => {
  cleanup();
});

describe("Feature: Selo de status", () => {
  describe("Cenário: status conhecidos recebem cor específica", () => {
    it("Dado status 'scheduled', Quando renderizar, Então aplica classe sky", () => {
      render(<StatusBadge status="scheduled" label="Agendada" />);

      const badge = screen.getByText("Agendada");
      expect(badge).toHaveClass("bg-sky-100", "text-sky-800");
    });

    it("Dado status 'confirmed', Quando renderizar, Então aplica classe teal", () => {
      render(<StatusBadge status="confirmed" label="Confirmada" />);

      expect(screen.getByText("Confirmada")).toHaveClass("bg-teal-100", "text-teal-800");
    });

    it("Dado status 'completed', Quando renderizar, Então aplica classe emerald", () => {
      render(<StatusBadge status="completed" label="Concluída" />);

      expect(screen.getByText("Concluída")).toHaveClass("bg-emerald-100", "text-emerald-800");
    });

    it("Dado status 'cancelled', Quando renderizar, Então aplica classe slate", () => {
      render(<StatusBadge status="cancelled" label="Cancelada" />);

      expect(screen.getByText("Cancelada")).toHaveClass("bg-slate-200", "text-slate-600");
    });

    it("Dado status 'no_show', Quando renderizar, Então aplica classe amber", () => {
      render(<StatusBadge status="no_show" label="Faltou" />);

      expect(screen.getByText("Faltou")).toHaveClass("bg-amber-100", "text-amber-800");
    });

    it("Dado status 'pending', Quando renderizar, Então aplica classe amber", () => {
      render(<StatusBadge status="pending" label="Pendente" />);

      expect(screen.getByText("Pendente")).toHaveClass("bg-amber-100", "text-amber-800");
    });

    it("Dado status 'paid', Quando renderizar, Então aplica classe emerald", () => {
      render(<StatusBadge status="paid" label="Pago" />);

      expect(screen.getByText("Pago")).toHaveClass("bg-emerald-100", "text-emerald-800");
    });
  });

  describe("Cenário: status desconhecido usa cor de fallback", () => {
    it("Dado status não mapeado, Quando renderizar, Então aplica classe slate neutra", () => {
      render(<StatusBadge status="unknown_status" label="Indefinido" />);

      expect(screen.getByText("Indefinido")).toHaveClass("bg-slate-100", "text-slate-700");
    });
  });

  describe("Cenário: exibição do texto", () => {
    it("Dado uma label, Quando renderizar, Então o texto da label aparece no documento", () => {
      render(<StatusBadge status="paid" label="Pago" />);

      expect(screen.getByText("Pago")).toBeInTheDocument();
    });
  });
});
