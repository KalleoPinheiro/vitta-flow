// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarAutoClose } from "@/app/(staff)/sidebar-auto-close";

// Mock de usePathname
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Mock de useSidebar — retorna um objeto com setOpen capturável
const mockSetOpen = vi.fn();
vi.mock("@still-void/ui/react/client", () => ({
  useSidebar: () => ({
    open: true,
    setOpen: mockSetOpen,
    toggle: vi.fn(),
    isMobile: false,
    collapsible: "offcanvas",
    panelId: "test-panel",
    triggerRef: null,
  }),
}));

describe("Feature: Fechar drawer ao navegar", () => {
  beforeEach(() => {
    mockSetOpen.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Cenário: comportamento no mount e pathname", () => {
    it("Dado SidebarAutoClose renderizado em pathname /inicial, Quando renderizar, Então NÃO fecha o drawer (não chama setOpen)", () => {
      mockPathname = "/";
      render(
        <div>
          <SidebarAutoClose />
        </div>
      );

      // Nenhuma chamada a setOpen no primeiro render
      expect(mockSetOpen).not.toHaveBeenCalled();
    });

    it("Dado SidebarAutoClose renderizado e pathname muda de /inicial para /pacientes, Quando pathname mudar, Então fecha o drawer (chama setOpen(false))", () => {
      // Primeira renderização em /
      mockPathname = "/";
      const { rerender } = render(
        <div>
          <SidebarAutoClose />
        </div>
      );

      // Nenhuma chamada ainda
      expect(mockSetOpen).not.toHaveBeenCalled();

      // Muda pathname
      mockPathname = "/pacientes";
      rerender(
        <div>
          <SidebarAutoClose />
        </div>
      );

      // Deve ter chamado setOpen(false)
      expect(mockSetOpen).toHaveBeenCalledWith(false);
      expect(mockSetOpen).toHaveBeenCalledTimes(1);
    });

    it("Dado SidebarAutoClose com pathname já mudado N vezes, Quando cada mudança ocorrer, Então fecha sempre", () => {
      mockPathname = "/";
      const { rerender } = render(
        <div>
          <SidebarAutoClose />
        </div>
      );

      // Primeira mudança
      mockPathname = "/agenda";
      rerender(
        <div>
          <SidebarAutoClose />
        </div>
      );
      expect(mockSetOpen).toHaveBeenNthCalledWith(1, false);

      // Segunda mudança
      mockPathname = "/faturamento";
      rerender(
        <div>
          <SidebarAutoClose />
        </div>
      );
      expect(mockSetOpen).toHaveBeenNthCalledWith(2, false);
      expect(mockSetOpen).toHaveBeenCalledTimes(2);
    });
  });
});
