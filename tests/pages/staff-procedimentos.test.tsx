// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { ProcedureDto, SupplyDto } from "@/lib/dto";
import ProceduresPage from "@/app/(staff)/procedimentos/page";
import { renderWithToast } from "@/../tests/support/render-with-toast";

interface FetchCall {
  url: string;
  init?: RequestInit;
}

const jsonResponse = (data: unknown, ok = true) => ({
  ok,
  json: async () => ({ success: ok, data, error: ok ? null : "Erro" }),
});

const errorResponse = (message: string) => ({
  ok: false,
  json: async () => ({ success: false, data: null, error: message }),
});

const mockFetch = (
  router: (call: FetchCall) => { ok: boolean; json: () => Promise<unknown> },
): ReturnType<typeof vi.fn> => {
  const fn = vi.fn(async (url: string, init?: RequestInit) => router({ url, init }));
  vi.stubGlobal("fetch", fn);
  return fn;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const activeProcedure: ProcedureDto = {
  id: "proc-1",
  name: "Troca de bolsa de colostomia",
  priceCents: 12000,
  durationMinutes: 60,
  active: true,
};

const inactiveProcedure: ProcedureDto = {
  id: "proc-2",
  name: "Curativo simples",
  priceCents: 8000,
  durationMinutes: 30,
  active: false,
};

const supplyFixture: SupplyDto = {
  id: "sup-1",
  name: "Bolsa de colostomia",
  unit: "un",
  minQty: 10,
  priceCents: 3000,
  stockQty: 20,
  isLowStock: false,
  active: true,
};

const secondSupplyFixture: SupplyDto = {
  id: "sup-2",
  name: "Gaze estéril",
  unit: "un",
  minQty: 5,
  priceCents: 500,
  stockQty: 40,
  isLowStock: false,
  active: true,
};

const inactiveSupplyFixture: SupplyDto = {
  id: "sup-3",
  name: "Luva estéril (descontinuada)",
  unit: "un",
  minQty: 5,
  priceCents: 500,
  stockQty: 0,
  isLowStock: false,
  active: false,
};

interface RouterOptions {
  procedures?: ProcedureDto[];
  proceduresError?: boolean;
  supplies?: SupplyDto[];
  kitItems?: Array<{ supplyId: string; quantity: number }>;
  patchOrPost?: (call: FetchCall) => { ok: boolean; json: () => Promise<unknown> } | null;
}

const buildRouter =
  (options: RouterOptions = {}) =>
  ({ url, init }: FetchCall) => {
    if (options.patchOrPost) {
      const result = options.patchOrPost({ url, init });
      if (result) return result;
    }
    if (url.includes("/kit")) {
      return jsonResponse({ items: options.kitItems ?? [] });
    }
    if (url.startsWith("/api/procedures")) {
      return options.proceduresError
        ? jsonResponse(null, false)
        : jsonResponse(options.procedures ?? []);
    }
    if (url.startsWith("/api/supplies")) {
      return jsonResponse(options.supplies ?? []);
    }
    return jsonResponse(null, false);
  };

describe("Feature: Catálogo de procedimentos", () => {
  describe("Cenário: carregamento e listagem", () => {
    it("Dado que os procedimentos ainda não chegaram, Quando renderizar, Então exibe indicador de carregamento", () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/procedures")) return { ok: true, json: () => new Promise(() => {}) };
        return jsonResponse([]);
      });

      renderWithToast(<ProceduresPage />);

      expect(screen.getByText("Carregando…")).toBeInTheDocument();
    });

    it("Dado nenhum procedimento, Quando a página carrega, Então exibe mensagem de vazio", async () => {
      mockFetch(buildRouter());

      renderWithToast(<ProceduresPage />);

      expect(
        await screen.findByText(
          "Nenhum procedimento cadastrado — o agendamento continua com texto livre até o catálogo existir.",
        ),
      ).toBeInTheDocument();
    });

    it("Dado erro ao carregar procedimentos, Quando a página carrega, Então exibe alerta de erro", async () => {
      mockFetch(buildRouter({ proceduresError: true }));

      renderWithToast(<ProceduresPage />);

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("Dado procedimentos ativos e inativos, Quando a página carrega, Então lista com preço, duração e situação", async () => {
      mockFetch(buildRouter({ procedures: [activeProcedure, inactiveProcedure] }));

      renderWithToast(<ProceduresPage />);

      expect(await screen.findByText("Troca de bolsa de colostomia")).toBeInTheDocument();
      expect(screen.getByText("Curativo simples")).toBeInTheDocument();
      expect(screen.getByText("R$ 120,00")).toBeInTheDocument();
      expect(screen.getByText("60 min")).toBeInTheDocument();
      expect(screen.getByText("Ativo")).toBeInTheDocument();
      expect(screen.getByText("Inativo")).toBeInTheDocument();
    });
  });

  describe("Cenário: ativar e desativar procedimento", () => {
    it("Dado clique em Desativar, Quando acionado, Então envia PATCH com active false", async () => {
      const fetchMock = mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/procedures/proc-1" && init?.method === "PATCH") {
              return jsonResponse({ ...activeProcedure, active: false });
            }
            return null;
          },
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Desativar"));

      await waitFor(() => {
        expect(fetchMock.mock.calls).toContainEqual([
          "/api/procedures/proc-1",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ active: false }),
          }),
        ]);
      });
      expect(await screen.findByText("Procedimento desativado")).toBeInTheDocument();
    });

    it("Dado clique em Reativar em um procedimento inativo, Quando acionado, Então envia PATCH com active true", async () => {
      const fetchMock = mockFetch(
        buildRouter({
          procedures: [inactiveProcedure],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/procedures/proc-2" && init?.method === "PATCH") {
              return jsonResponse({ ...inactiveProcedure, active: true });
            }
            return null;
          },
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Curativo simples");

      fireEvent.click(screen.getByText("Reativar"));

      await waitFor(() => {
        expect(fetchMock.mock.calls).toContainEqual([
          "/api/procedures/proc-2",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ active: true }),
          }),
        ]);
      });
      expect(await screen.findByText("Procedimento ativado")).toBeInTheDocument();
    });

    it("Dado falha ao alternar situação, Quando acionado, Então exibe alerta de erro", async () => {
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/procedures/proc-1" && init?.method === "PATCH") {
              return errorResponse("Erro ao atualizar procedimento");
            }
            return null;
          },
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Desativar"));

      expect(await screen.findByText("Erro ao atualizar procedimento")).toBeInTheDocument();
    });

    it("Dado falha ao alternar situação com um erro que não é instância de Error, Quando acionado, Então exibe a mensagem de erro padrão", async () => {
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/procedures/proc-1" && init?.method === "PATCH") {
              throw "falha de rede";
            }
            return null;
          },
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Desativar"));

      expect(await screen.findByText("Erro ao atualizar procedimento")).toBeInTheDocument();
    });
  });

  describe("Cenário: criar e editar procedimento", () => {
    it("Dado preenchimento do novo procedimento, Quando submetido, Então cria o procedimento e fecha o modal", async () => {
      let created = false;
      mockFetch(
        buildRouter({
          patchOrPost: ({ url, init }) => {
            if (url === "/api/procedures" && init?.method === "POST") {
              created = true;
              return jsonResponse(activeProcedure);
            }
            return null;
          },
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText(
        "Nenhum procedimento cadastrado — o agendamento continua com texto livre até o catálogo existir.",
      );

      fireEvent.click(screen.getByText("+ Novo procedimento"));
      fireEvent.change(screen.getByLabelText(/Nome/), {
        target: { value: "Consulta avulsa" },
      });
      fireEvent.change(screen.getByLabelText(/Preço/), { target: { value: "100" } });
      fireEvent.change(screen.getByLabelText(/Duração/), { target: { value: "45" } });
      fireEvent.click(screen.getByText("Salvar"));

      await waitFor(() => expect(created).toBe(true));
      expect(await screen.findByText("Procedimento salvo")).toBeInTheDocument();
    });

    it("Dado edição de procedimento existente, Quando o modal abre, Então preenche os campos atuais", async () => {
      mockFetch(buildRouter({ procedures: [activeProcedure] }));

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Editar"));

      expect(screen.getByDisplayValue("Troca de bolsa de colostomia")).toBeInTheDocument();
      expect(screen.getByDisplayValue("120")).toBeInTheDocument();
      expect(screen.getByDisplayValue("60")).toBeInTheDocument();
      expect(screen.getByText("Editar procedimento")).toBeInTheDocument();
    });

    it("Dado edição de procedimento existente, Quando submetido, Então envia PATCH com os dados atualizados e fecha o modal", async () => {
      let patchedBody: string | undefined;
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/procedures/proc-1" && init?.method === "PATCH") {
              patchedBody = init.body as string;
              return jsonResponse({ ...activeProcedure, name: "Troca de bolsa (atualizado)" });
            }
            return null;
          },
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Editar"));
      fireEvent.change(screen.getByLabelText(/Nome/), {
        target: { value: "Troca de bolsa (atualizado)" },
      });
      fireEvent.click(screen.getByText("Salvar"));

      await waitFor(() => expect(patchedBody).toBeDefined());
      expect(JSON.parse(patchedBody as string)).toEqual({
        name: "Troca de bolsa (atualizado)",
        priceCents: 12000,
        durationMinutes: 60,
      });
      expect(screen.queryByText("Editar procedimento")).not.toBeInTheDocument();
    });

    it("Dado clique no botão Fechar do modal de novo procedimento, Quando acionado, Então fecha o modal sem salvar", async () => {
      const fetchMock = mockFetch(buildRouter());

      renderWithToast(<ProceduresPage />);
      await screen.findByText(
        "Nenhum procedimento cadastrado — o agendamento continua com texto livre até o catálogo existir.",
      );

      fireEvent.click(screen.getByText("+ Novo procedimento"));
      expect(screen.getByText("Novo procedimento")).toBeInTheDocument();

      const callsBeforeClose = fetchMock.mock.calls.length;
      fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

      expect(screen.queryByText("Novo procedimento")).not.toBeInTheDocument();
      expect(fetchMock.mock.calls.length).toBe(callsBeforeClose);
    });

    it("Dado falha ao salvar procedimento com um erro que não é instância de Error, Quando submetido, Então exibe a mensagem de erro padrão no formulário", async () => {
      mockFetch(
        buildRouter({
          patchOrPost: ({ url, init }) => {
            if (url === "/api/procedures" && init?.method === "POST") {
              throw "falha de rede";
            }
            return null;
          },
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText(
        "Nenhum procedimento cadastrado — o agendamento continua com texto livre até o catálogo existir.",
      );

      fireEvent.click(screen.getByText("+ Novo procedimento"));
      fireEvent.change(screen.getByLabelText(/Nome/), {
        target: { value: "Consulta avulsa" },
      });
      fireEvent.change(screen.getByLabelText(/Preço/), { target: { value: "100" } });
      fireEvent.click(screen.getByText("Salvar"));

      expect(await screen.findByText("Erro ao salvar procedimento")).toBeInTheDocument();
    });

    it("Dado falha ao salvar procedimento, Quando submetido, Então exibe alerta de erro no formulário", async () => {
      mockFetch(
        buildRouter({
          patchOrPost: ({ url, init }) => {
            if (url === "/api/procedures" && init?.method === "POST") {
              return errorResponse("Erro ao salvar procedimento");
            }
            return null;
          },
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText(
        "Nenhum procedimento cadastrado — o agendamento continua com texto livre até o catálogo existir.",
      );

      fireEvent.click(screen.getByText("+ Novo procedimento"));
      fireEvent.change(screen.getByLabelText(/Nome/), {
        target: { value: "Consulta avulsa" },
      });
      fireEvent.change(screen.getByLabelText(/Preço/), { target: { value: "100" } });
      fireEvent.click(screen.getByText("Salvar"));

      expect(await screen.findByText("Erro ao salvar procedimento")).toBeInTheDocument();
    });
  });

  describe("Cenário: kit de materiais do procedimento", () => {
    it("Dado kit vazio, Quando abrir o modal, Então exibe mensagem de nenhum item", async () => {
      mockFetch(buildRouter({ procedures: [activeProcedure], supplies: [supplyFixture], kitItems: [] }));

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Kit"));

      expect(
        await screen.findByText("Nenhum item — a conclusão não baixa estoque."),
      ).toBeInTheDocument();
    });

    it("Dado kit com itens, Quando abrir o modal, Então exibe os insumos e quantidades atuais", async () => {
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          supplies: [supplyFixture],
          kitItems: [{ supplyId: "sup-1", quantity: 2 }],
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Kit"));

      expect(await screen.findByText("Kit de insumos — Troca de bolsa de colostomia")).toBeInTheDocument();
      expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    });

    it("Dado adição de item e salvamento, Quando confirmado, Então envia PUT com a lista de itens", async () => {
      let sentBody: string | undefined;
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          supplies: [supplyFixture],
          kitItems: [],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/procedures/proc-1/kit" && init?.method === "PUT") {
              sentBody = init.body as string;
              return jsonResponse({});
            }
            return null;
          },
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Kit"));
      await screen.findByText("Nenhum item — a conclusão não baixa estoque.");

      fireEvent.click(screen.getByText("+ Adicionar insumo"));
      const select = screen.getByDisplayValue("Selecione o insumo…");
      fireEvent.change(select, { target: { value: "sup-1" } });
      const quantityInput = screen.getByDisplayValue("1");
      fireEvent.change(quantityInput, { target: { value: "3" } });
      fireEvent.click(screen.getByText("Salvar kit"));

      await waitFor(() => expect(sentBody).toBeDefined());
      expect(JSON.parse(sentBody as string)).toEqual({
        items: [{ supplyId: "sup-1", quantity: 3 }],
      });
      expect(await screen.findByText("Kit atualizado")).toBeInTheDocument();
    });

    it("Dado remoção de um item do kit, Quando acionado, Então o item some da lista", async () => {
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          supplies: [supplyFixture],
          kitItems: [{ supplyId: "sup-1", quantity: 2 }],
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Kit"));
      await screen.findByText("Kit de insumos — Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("remover"));

      expect(
        await screen.findByText("Nenhum item — a conclusão não baixa estoque."),
      ).toBeInTheDocument();
    });

    it("Dado falha ao salvar o kit, Quando confirmado, Então exibe alerta de erro", async () => {
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          supplies: [supplyFixture],
          kitItems: [{ supplyId: "sup-1", quantity: 2 }],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/procedures/proc-1/kit" && init?.method === "PUT") {
              return errorResponse("Erro ao salvar kit");
            }
            return null;
          },
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Kit"));
      await screen.findByText("Kit de insumos — Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Salvar kit"));

      expect(await screen.findByText("Erro ao salvar kit")).toBeInTheDocument();
    });

    it("Dado falha ao salvar o kit com um erro que não é instância de Error, Quando confirmado, Então exibe a mensagem de erro padrão", async () => {
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          supplies: [supplyFixture],
          kitItems: [{ supplyId: "sup-1", quantity: 2 }],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/procedures/proc-1/kit" && init?.method === "PUT") {
              throw "falha de rede";
            }
            return null;
          },
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Kit"));
      await screen.findByText("Kit de insumos — Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Salvar kit"));

      expect(await screen.findByText("Erro ao salvar kit")).toBeInTheDocument();
    });

    it("Dado item do kit referenciando um insumo inativo, Quando o modal abre, Então exibe o insumo inativo como opção extra com o nome cadastrado", async () => {
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          supplies: [supplyFixture, inactiveSupplyFixture],
          kitItems: [{ supplyId: inactiveSupplyFixture.id, quantity: 1 }],
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Kit"));
      await screen.findByText("Kit de insumos — Troca de bolsa de colostomia");

      expect(
        await screen.findByText("Luva estéril (descontinuada)"),
      ).toBeInTheDocument();
    });

    it("Dado item do kit referenciando um insumo inexistente, Quando o modal abre, Então exibe o identificador do insumo como rótulo da opção extra", async () => {
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          supplies: [supplyFixture],
          kitItems: [{ supplyId: "sup-removido", quantity: 1 }],
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Kit"));
      await screen.findByText("Kit de insumos — Troca de bolsa de colostomia");

      expect(await screen.findByText("sup-removido")).toBeInTheDocument();
    });

    it("Dado múltiplos itens no kit, Quando altero o insumo de um dos itens, Então o outro item permanece inalterado", async () => {
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          supplies: [supplyFixture, secondSupplyFixture],
          kitItems: [
            { supplyId: supplyFixture.id, quantity: 2 },
            { supplyId: secondSupplyFixture.id, quantity: 3 },
          ],
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Kit"));
      await screen.findByText("Kit de insumos — Troca de bolsa de colostomia");

      const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
      expect(selects).toHaveLength(2);
      fireEvent.change(selects[0], { target: { value: "" } });

      expect(selects[0].value).toBe("");
      expect(selects[1].value).toBe(secondSupplyFixture.id);
    });

    it("Dado múltiplos itens no kit, Quando altero a quantidade de um dos itens, Então o outro item permanece inalterado", async () => {
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          supplies: [supplyFixture, secondSupplyFixture],
          kitItems: [
            { supplyId: supplyFixture.id, quantity: 2 },
            { supplyId: secondSupplyFixture.id, quantity: 3 },
          ],
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Kit"));
      await screen.findByText("Kit de insumos — Troca de bolsa de colostomia");

      const quantityInputs = screen.getAllByDisplayValue(/^[0-9]+$/) as HTMLInputElement[];
      expect(quantityInputs).toHaveLength(2);
      fireEvent.change(quantityInputs[0], { target: { value: "9" } });

      expect(quantityInputs[0].value).toBe("9");
      expect(quantityInputs[1].value).toBe("3");
    });

    it("Dado quantidade vazia ao salvar o kit, Quando confirmado, Então envia quantidade padrão 1", async () => {
      let sentBody: string | undefined;
      mockFetch(
        buildRouter({
          procedures: [activeProcedure],
          supplies: [supplyFixture],
          kitItems: [{ supplyId: supplyFixture.id, quantity: 2 }],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/procedures/proc-1/kit" && init?.method === "PUT") {
              sentBody = init.body as string;
              return jsonResponse({});
            }
            return null;
          },
        }),
      );

      renderWithToast(<ProceduresPage />);
      await screen.findByText("Troca de bolsa de colostomia");

      fireEvent.click(screen.getByText("Kit"));
      await screen.findByText("Kit de insumos — Troca de bolsa de colostomia");

      const quantityInput = screen.getByDisplayValue("2");
      fireEvent.change(quantityInput, { target: { value: "" } });
      fireEvent.click(screen.getByText("Salvar kit"));

      await waitFor(() => expect(sentBody).toBeDefined());
      expect(JSON.parse(sentBody as string)).toEqual({
        items: [{ supplyId: supplyFixture.id, quantity: 1 }],
      });
    });
  });
});
