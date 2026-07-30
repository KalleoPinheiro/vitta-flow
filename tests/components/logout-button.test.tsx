// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { LogoutButton } from "@/components/logout-button";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("Feature: Botão de logout", () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  describe("Cenário: renderização", () => {
    it("Dado o componente, Quando renderizar, Então exibe o texto 'Sair'", () => {
      render(<LogoutButton />);

      expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
    });
  });

  describe("Cenário: clique aciona logout", () => {
    it("Dado clique no botão, Quando acionado, Então chama a API de logout", async () => {
      render(<LogoutButton />);

      fireEvent.click(screen.getByRole("button", { name: "Sair" }));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      });
    });

    it("Dado logout concluído, Quando acionado, Então redireciona para login e atualiza a rota", async () => {
      render(<LogoutButton />);

      fireEvent.click(screen.getByRole("button", { name: "Sair" }));

      await waitFor(() => {
        expect(push).toHaveBeenCalledWith("/login");
      });
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });
});
