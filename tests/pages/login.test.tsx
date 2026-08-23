// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import LoginPage from "@/app/login/page";

const { routerMock, searchParamsRef } = vi.hoisted(() => {
  return {
    routerMock: { push: vi.fn(), refresh: vi.fn() },
    searchParamsRef: { current: new URLSearchParams() },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsRef.current,
}));

function jsonResponse(success: boolean, data: unknown, error: string | null = null) {
  return {
    ok: success,
    json: async () => ({ success, data, error }),
  };
}

interface Providers {
  password: boolean;
  google: boolean;
}

function mockProviders(providers: Providers) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/auth/providers")) {
        return jsonResponse(true, providers);
      }
      throw new Error(`URL não mapeada no mock: ${url}`);
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  searchParamsRef.current = new URLSearchParams();
  routerMock.push.mockClear();
  routerMock.refresh.mockClear();
});

describe("Feature: Página de login", () => {
  describe("Cenário: erro vindo do OAuth", () => {
    it("Dado parâmetro de erro na URL, Quando renderizar, Então exibe o alerta com a mensagem", async () => {
      searchParamsRef.current = new URLSearchParams("error=Falha ao autenticar com o Google");
      mockProviders({ password: true, google: false });

      render(<LoginPage />);

      expect(
        await screen.findByText("Falha ao autenticar com o Google"),
      ).toBeInTheDocument();
    });
  });

  describe("Cenário: nenhum provedor configurado", () => {
    it("Dado servidor sem provedores habilitados, Quando renderizar, Então exibe alerta de configuração ausente", async () => {
      mockProviders({ password: false, google: false });

      render(<LoginPage />);

      expect(
        await screen.findByText("Nenhum método de login configurado no servidor."),
      ).toBeInTheDocument();
    });
  });

  describe("Cenário: apenas senha habilitada", () => {
    it("Dado apenas senha habilitada, Quando renderizar, Então exibe o formulário sem o botão do Google", async () => {
      mockProviders({ password: true, google: false });

      render(<LoginPage />);

      expect(await screen.findByLabelText("Senha")).toBeInTheDocument();
      expect(screen.queryByText("Entrar com Google")).not.toBeInTheDocument();
      expect(screen.queryByText("ou")).not.toBeInTheDocument();
    });
  });

  describe("Cenário: apenas Google habilitado", () => {
    it("Dado apenas Google habilitado, Quando renderizar, Então exibe o botão do Google sem o formulário de senha", async () => {
      mockProviders({ password: false, google: true });

      render(<LoginPage />);

      expect(await screen.findByText("Entrar com Google")).toBeInTheDocument();
      expect(
        screen.getByText("entrar conectando o Google Agenda"),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
      expect(screen.queryByText("ou")).not.toBeInTheDocument();
    });
  });

  describe("Cenário: senha e Google habilitados juntos", () => {
    it("Dado ambos os provedores habilitados, Quando renderizar, Então exibe os dois métodos separados por divisor", async () => {
      mockProviders({ password: true, google: true });

      render(<LoginPage />);

      expect(await screen.findByText("Entrar com Google")).toBeInTheDocument();
      expect(screen.getByLabelText("Senha")).toBeInTheDocument();
      expect(screen.getByText("ou")).toBeInTheDocument();
    });
  });

  describe("Cenário: submissão do formulário de senha", () => {
    it("Dado apenas senha preenchida, Quando submeter, Então envia a senha sem email e redireciona", async () => {
      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        void init;
        const url = typeof input === "string" ? input : input.toString();
        if (url.startsWith("/api/auth/providers")) {
          return jsonResponse(true, { password: true, google: false });
        }
        if (url.startsWith("/api/auth/login")) {
          return jsonResponse(true, { ok: true });
        }
        throw new Error(`URL não mapeada no mock: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<LoginPage />);

      fireEvent.change(await screen.findByLabelText("Senha"), {
        target: { value: "senhaClinica123" },
      });
      fireEvent.click(screen.getByText("Entrar"));

      await waitFor(() => {
        expect(routerMock.push).toHaveBeenCalledWith("/");
      });
      expect(routerMock.refresh).toHaveBeenCalledTimes(1);

      const loginCall = fetchMock.mock.calls.find(([input]) =>
        String(input).startsWith("/api/auth/login"),
      );
      const body = JSON.parse(String(loginCall?.[1]?.body ?? "{}"));
      expect(body).toEqual({ password: "senhaClinica123" });
    });

    it("Dado email e senha preenchidos, Quando submeter, Então envia email e senha no corpo da requisição", async () => {
      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        void init;
        const url = typeof input === "string" ? input : input.toString();
        if (url.startsWith("/api/auth/providers")) {
          return jsonResponse(true, { password: true, google: false });
        }
        if (url.startsWith("/api/auth/login")) {
          return jsonResponse(true, { ok: true });
        }
        throw new Error(`URL não mapeada no mock: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<LoginPage />);

      fireEvent.change(await screen.findByPlaceholderText("seu@email.com"), {
        target: { value: "ana@clinica.com" },
      });
      fireEvent.change(screen.getByLabelText("Senha"), {
        target: { value: "senhaIndividual123" },
      });
      fireEvent.click(screen.getByText("Entrar"));

      await waitFor(() => {
        expect(routerMock.push).toHaveBeenCalledWith("/");
      });

      const loginCall = fetchMock.mock.calls.find(([input]) =>
        String(input).startsWith("/api/auth/login"),
      );
      const body = JSON.parse(String(loginCall?.[1]?.body ?? "{}"));
      expect(body).toEqual({ email: "ana@clinica.com", password: "senhaIndividual123" });
    });

    it("Dado credencial inválida, Quando submeter, Então exibe mensagem de erro e reabilita o botão", async () => {
      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        void init;
        const url = typeof input === "string" ? input : input.toString();
        if (url.startsWith("/api/auth/providers")) {
          return jsonResponse(true, { password: true, google: false });
        }
        if (url.startsWith("/api/auth/login")) {
          return jsonResponse(false, null, "Senha incorreta");
        }
        throw new Error(`URL não mapeada no mock: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<LoginPage />);

      fireEvent.change(await screen.findByLabelText("Senha"), {
        target: { value: "senhaErrada" },
      });
      fireEvent.click(screen.getByText("Entrar"));

      expect(await screen.findByText("Senha incorreta")).toBeInTheDocument();
      expect(routerMock.push).not.toHaveBeenCalled();
      const button = screen.getByText("Entrar") as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  describe("Cenário: adoção do catálogo do design system", () => {
    it("Dado o formulário de senha, Então campos e submit vêm do Still Void", async () => {
      mockProviders({ password: true, google: false });

      render(<LoginPage />);

      const senha = await screen.findByLabelText("Senha");
      // `bg-sv-surface` no campo e no botão é emitido pelos <Input>/<Button> do
      // pacote, não pelo app.
      expect(senha).toHaveClass("bg-sv-surface");
      expect(screen.getByRole("button", { name: "Entrar" })).toHaveClass("bg-accent-ink");
    });
  });
});
