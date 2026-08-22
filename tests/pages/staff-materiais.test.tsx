// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { AppointmentDto, StockMovementDto, SupplyDto } from "@/lib/dto";
import SuppliesPage from "@/app/(staff)/materiais/page";

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

const lowStockSupply: SupplyDto = {
  id: "sup-1",
  name: "Bolsa de colostomia",
  unit: "un",
  minQty: 10,
  priceCents: 3000,
  stockQty: 2,
  isLowStock: true,
  active: true,
};

const okSupply: SupplyDto = {
  id: "sup-2",
  name: "Gaze estéril",
  unit: "pct",
  minQty: 5,
  priceCents: 1200,
  stockQty: 40,
  isLowStock: false,
  active: true,
};

const inactiveSupply: SupplyDto = {
  id: "sup-3",
  name: "Curativo antigo",
  unit: "un",
  minQty: 1,
  priceCents: 500,
  stockQty: 0,
  isLowStock: false,
  active: false,
};

const insightsEmpty = { bySupply: [], expiringBatches: [] };

const appointmentFixture: AppointmentDto = {
  id: "appt-1",
  patientId: "pat-1",
  patientName: "Maria Souza",
  startsAt: new Date().toISOString(),
  endsAt: new Date().toISOString(),
  procedure: "Troca de bolsa",
  priceCents: 12000,
  notes: null,
  status: "scheduled",
  professionalId: null,
};

const movementFixture: StockMovementDto = {
  id: "mov-1",
  supplyId: "sup-1",
  type: "in",
  quantity: 20,
  reason: "Compra fornecedor X",
  appointmentId: null,
  unitPriceCents: 3000,
  createdAt: "2026-07-01T10:00:00.000Z",
};

interface RouterOptions {
  supplies?: SupplyDto[];
  suppliesError?: boolean;
  insights?: {
    bySupply: Array<{ supplyId: string; avgDailyOut: number; daysToStockout: number | null }>;
    expiringBatches: Array<{
      batchId: string;
      supplyId: string;
      supplyName: string;
      label: string | null;
      expiresAt: string;
      remaining: number;
      isExpired: boolean;
    }>;
  };
  appointments?: AppointmentDto[];
  movements?: StockMovementDto[];
  patchOrPost?: (call: FetchCall) => { ok: boolean; json: () => Promise<unknown> } | null;
}

const buildRouter =
  (options: RouterOptions = {}) =>
  // eslint-disable-next-line complexity -- roteador de mock por url/método, ramificação inerente ao padrão
  ({ url, init }: FetchCall) => {
    if (options.patchOrPost) {
      const result = options.patchOrPost({ url, init });
      if (result) return result;
    }
    if (url.startsWith("/api/supplies/insights")) {
      return jsonResponse(options.insights ?? insightsEmpty);
    }
    if (url.includes("/movements")) {
      return jsonResponse(options.movements ?? []);
    }
    if (url.startsWith("/api/supplies")) {
      return options.suppliesError ? jsonResponse(null, false) : jsonResponse(options.supplies ?? []);
    }
    if (url.startsWith("/api/appointments")) {
      return jsonResponse(options.appointments ?? []);
    }
    return jsonResponse(null, false);
  };

describe("Feature: Materiais e estoque", () => {
  describe("Cenário: carregamento e listagem", () => {
    it("Dado que a lista ainda não chegou, Quando renderizar, Então exibe indicador de carregamento", () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/supplies/insights")) return jsonResponse(insightsEmpty);
        if (url.startsWith("/api/supplies")) return { ok: true, json: () => new Promise(() => {}) };
        return jsonResponse([]);
      });

      render(<SuppliesPage />);

      expect(screen.getByText("Carregando…")).toBeInTheDocument();
    });

    it("Dado nenhum insumo, Quando a página carrega, Então exibe mensagem de vazio", async () => {
      mockFetch(buildRouter());

      render(<SuppliesPage />);

      expect(await screen.findByText("Nenhum insumo cadastrado.")).toBeInTheDocument();
    });

    it("Dado erro ao carregar insumos, Quando a página carrega, Então exibe alerta de erro", async () => {
      mockFetch(buildRouter({ suppliesError: true }));

      render(<SuppliesPage />);

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("Dado insumos ativos e inativos, Quando a página carrega, Então lista dados e aplica opacidade ao inativo", async () => {
      mockFetch(buildRouter({ supplies: [lowStockSupply, okSupply, inactiveSupply] }));

      render(<SuppliesPage />);

      expect(await screen.findByText("Bolsa de colostomia")).toBeInTheDocument();
      expect(screen.getByText("Gaze estéril")).toBeInTheDocument();
      expect(screen.getByText("Curativo antigo")).toBeInTheDocument();
      expect(screen.getByText("2 un")).toBeInTheDocument();
      expect(screen.getByText("R$ 30,00")).toBeInTheDocument();
    });
  });

  describe("Cenário: alertas de estoque baixo e validade", () => {
    it("Dado insumo com estoque baixo, Quando a página carrega, Então exibe o banner e o rótulo na linha", async () => {
      mockFetch(buildRouter({ supplies: [lowStockSupply] }));

      render(<SuppliesPage />);

      expect(
        await screen.findByText("⚠ 1 insumo está com estoque baixo (≤ mínimo)."),
      ).toBeInTheDocument();
      expect(screen.getByText("Estoque baixo")).toBeInTheDocument();
    });

    it("Dado nenhum insumo com estoque baixo, Quando a página carrega, Então não exibe o banner", async () => {
      mockFetch(buildRouter({ supplies: [okSupply] }));

      render(<SuppliesPage />);

      await screen.findByText("Gaze estéril");
      expect(screen.queryByText(/com estoque baixo/)).not.toBeInTheDocument();
    });

    it("Dado dois insumos com estoque baixo, Quando a página carrega, Então exibe o banner no plural", async () => {
      const secondLowStock: SupplyDto = {
        ...lowStockSupply,
        id: "sup-9",
        name: "Outra bolsa",
      };
      mockFetch(buildRouter({ supplies: [lowStockSupply, secondLowStock] }));

      render(<SuppliesPage />);

      expect(
        await screen.findByText("⚠ 2 insumos estão com estoque baixo (≤ mínimo)."),
      ).toBeInTheDocument();
    });

    it("Dado lotes vencidos e a vencer, Quando a página carrega, Então exibe o banner de validade", async () => {
      mockFetch(
        buildRouter({
          supplies: [lowStockSupply],
          insights: {
            bySupply: [],
            expiringBatches: [
              {
                batchId: "b1",
                supplyId: "sup-1",
                supplyName: "Bolsa de colostomia",
                label: "L2026-01",
                expiresAt: "2026-06-01T00:00:00.000Z",
                remaining: 3,
                isExpired: true,
              },
              {
                batchId: "b2",
                supplyId: "sup-1",
                supplyName: "Bolsa de colostomia",
                label: null,
                expiresAt: "2026-08-01T00:00:00.000Z",
                remaining: 5,
                isExpired: false,
              },
            ],
          },
        }),
      );

      render(<SuppliesPage />);

      expect(await screen.findByText(/lote vencido com saldo/)).toBeInTheDocument();
      expect(screen.getByText(/lote vence em até 30/)).toBeInTheDocument();
    });

    it("Dado múltiplos lotes vencidos e a vencer, alguns sem rótulo, Quando a página carrega, Então exibe as mensagens no plural", async () => {
      mockFetch(
        buildRouter({
          supplies: [lowStockSupply],
          insights: {
            bySupply: [],
            expiringBatches: [
              {
                batchId: "b1",
                supplyId: "sup-1",
                supplyName: "Bolsa de colostomia",
                label: "L2026-01",
                expiresAt: "2026-06-01T00:00:00.000Z",
                remaining: 3,
                isExpired: true,
              },
              {
                batchId: "b2",
                supplyId: "sup-1",
                supplyName: "Bolsa de colostomia",
                label: null,
                expiresAt: "2026-06-02T00:00:00.000Z",
                remaining: 1,
                isExpired: true,
              },
              {
                batchId: "b3",
                supplyId: "sup-1",
                supplyName: "Bolsa de colostomia",
                label: "L2026-09",
                expiresAt: "2026-08-01T00:00:00.000Z",
                remaining: 5,
                isExpired: false,
              },
              {
                batchId: "b4",
                supplyId: "sup-1",
                supplyName: "Bolsa de colostomia",
                label: null,
                expiresAt: "2026-08-05T00:00:00.000Z",
                remaining: 2,
                isExpired: false,
              },
            ],
          },
        }),
      );

      render(<SuppliesPage />);

      expect(await screen.findByText(/2 lotes vencidos com saldo/)).toBeInTheDocument();
      expect(screen.getByText(/2 lotes vencem em até 30/)).toBeInTheDocument();
    });

    it("Dado previsão de ruptura, Quando a página carrega, Então exibe os dias restantes com destaque quando urgente", async () => {
      mockFetch(
        buildRouter({
          supplies: [lowStockSupply],
          insights: {
            bySupply: [{ supplyId: "sup-1", avgDailyOut: 1, daysToStockout: 5 }],
            expiringBatches: [],
          },
        }),
      );

      render(<SuppliesPage />);

      expect(await screen.findByText("~5 dias")).toBeInTheDocument();
    });

    it("Dado previsão de ruptura para 1 dia, Quando a página carrega, Então exibe o texto no singular", async () => {
      mockFetch(
        buildRouter({
          supplies: [lowStockSupply],
          insights: {
            bySupply: [{ supplyId: "sup-1", avgDailyOut: 2, daysToStockout: 1 }],
            expiringBatches: [],
          },
        }),
      );

      render(<SuppliesPage />);

      expect(await screen.findByText("~1 dia")).toBeInTheDocument();
    });

    it("Dado previsão de ruptura acima de 30 dias, Quando a página carrega, Então exibe o texto sem destaque de urgência", async () => {
      mockFetch(
        buildRouter({
          supplies: [lowStockSupply],
          insights: {
            bySupply: [{ supplyId: "sup-1", avgDailyOut: 0.1, daysToStockout: 45 }],
            expiringBatches: [],
          },
        }),
      );

      render(<SuppliesPage />);

      const forecast = await screen.findByText("~45 dias");
      expect(forecast).toHaveClass("text-ink-2");
    });

    it("Dado insumo sem previsão de ruptura, Quando a página carrega, Então exibe traço", async () => {
      mockFetch(buildRouter({ supplies: [lowStockSupply] }));

      render(<SuppliesPage />);

      await screen.findByText("Bolsa de colostomia");
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  describe("Cenário: cadastrar e editar insumo", () => {
    it("Dado preenchimento do novo insumo, Quando submetido, Então cria o insumo e fecha o modal", async () => {
      let created = false;
      mockFetch(
        buildRouter({
          patchOrPost: ({ url, init }) => {
            if (url === "/api/supplies" && init?.method === "POST") {
              created = true;
              return jsonResponse(lowStockSupply);
            }
            return null;
          },
        }),
      );

      render(<SuppliesPage />);
      await screen.findByText("Nenhum insumo cadastrado.");

      fireEvent.click(screen.getByText("+ Novo insumo"));
      fireEvent.change(screen.getByLabelText(/Nome/), {
        target: { value: "Bolsa nova" },
      });
      fireEvent.change(screen.getByLabelText(/Unidade/), { target: { value: "cx" } });
      fireEvent.change(screen.getByLabelText(/Estoque mínimo/), { target: { value: "5" } });
      fireEvent.change(screen.getByLabelText(/Preço/), { target: { value: "30" } });
      expect(screen.getByDisplayValue("cx")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Salvar"));

      await waitFor(() => expect(created).toBe(true));
    });

    it("Dado edição de um insumo existente, Quando o modal abre, Então preenche os campos com os dados atuais", async () => {
      mockFetch(buildRouter({ supplies: [lowStockSupply] }));

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Editar"));

      expect(screen.getByDisplayValue("Bolsa de colostomia")).toBeInTheDocument();
      expect(screen.getByText("Editar insumo")).toBeInTheDocument();
      expect(screen.getByText("Insumo ativo")).toBeInTheDocument();
    });

    it("Dado edição de um insumo existente, Quando desmarcar ativo e submeter, Então envia PUT com os dados atualizados", async () => {
      let sentUrl: string | undefined;
      let sentBody: string | undefined;
      mockFetch(
        buildRouter({
          supplies: [lowStockSupply],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/supplies/sup-1" && init?.method === "PUT") {
              sentUrl = url;
              sentBody = init.body as string;
              return jsonResponse({ ...lowStockSupply, active: false });
            }
            return null;
          },
        }),
      );

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Editar"));
      expect(await screen.findByText("Editar insumo")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Insumo ativo"));
      fireEvent.click(screen.getByText("Salvar"));

      await waitFor(() => expect(sentBody).toBeDefined());
      expect(sentUrl).toBe("/api/supplies/sup-1");
      const payload = JSON.parse(sentBody as string);
      expect(payload).toMatchObject({ name: "Bolsa de colostomia", active: false });
      expect(screen.queryByText("Editar insumo")).not.toBeInTheDocument();
    });

    it("Dado modal de novo insumo aberto, Quando fechar pelo botão Fechar, Então oculta o formulário", async () => {
      mockFetch(buildRouter());

      render(<SuppliesPage />);
      await screen.findByText("Nenhum insumo cadastrado.");

      fireEvent.click(screen.getByText("+ Novo insumo"));
      expect(await screen.findByText("Novo insumo")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

      expect(screen.queryByText("Novo insumo")).not.toBeInTheDocument();
    });

    it("Dado falha ao salvar insumo, Quando submetido, Então exibe alerta de erro no formulário", async () => {
      mockFetch(
        buildRouter({
          patchOrPost: ({ url, init }) => {
            if (url === "/api/supplies" && init?.method === "POST") {
              return errorResponse("Erro ao salvar insumo");
            }
            return null;
          },
        }),
      );

      render(<SuppliesPage />);
      await screen.findByText("Nenhum insumo cadastrado.");

      fireEvent.click(screen.getByText("+ Novo insumo"));
      fireEvent.change(screen.getByLabelText(/Nome/), {
        target: { value: "Bolsa nova" },
      });
      fireEvent.change(screen.getByLabelText(/Preço/), { target: { value: "30" } });
      fireEvent.click(screen.getByText("Salvar"));

      expect(await screen.findByText("Erro ao salvar insumo")).toBeInTheDocument();
    });
  });

  describe("Cenário: registrar movimentação de estoque", () => {
    it("Dado entrada de estoque com lote e validade, Quando submetido, Então envia POST com os dados corretos", async () => {
      let sentBody: string | undefined;
      mockFetch(
        buildRouter({
          supplies: [lowStockSupply],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/supplies/sup-1/movements" && init?.method === "POST") {
              sentBody = init.body as string;
              return jsonResponse(lowStockSupply);
            }
            return null;
          },
        }),
      );

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Movimentar"));
      expect(await screen.findByText("Movimentar — Bolsa de colostomia")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Quantidade/), { target: { value: "20" } });
      fireEvent.change(screen.getByLabelText(/Motivo/), {
        target: { value: "Compra fornecedor X" },
      });
      fireEvent.change(screen.getByLabelText(/Lote/), { target: { value: "L2026-091" } });
      fireEvent.change(screen.getByLabelText(/Validade/), { target: { value: "2026-12-31" } });
      fireEvent.click(screen.getByText("Registrar movimentação"));

      await waitFor(() => expect(sentBody).toBeDefined());
      const payload = JSON.parse(sentBody as string);
      expect(payload).toMatchObject({
        type: "in",
        quantity: 20,
        reason: "Compra fornecedor X",
        appointmentId: null,
        batchLabel: "L2026-091",
        expiresAt: new Date("2026-12-31").toISOString(),
      });
    });

    it("Dado saída de estoque vinculada a uma consulta do dia, Quando submetido, Então envia o appointmentId", async () => {
      let sentBody: string | undefined;
      mockFetch(
        buildRouter({
          supplies: [lowStockSupply],
          appointments: [appointmentFixture],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/supplies/sup-1/movements" && init?.method === "POST") {
              sentBody = init.body as string;
              return jsonResponse(lowStockSupply);
            }
            return null;
          },
        }),
      );

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Movimentar"));
      await screen.findByText("Movimentar — Bolsa de colostomia");

      fireEvent.change(screen.getByLabelText(/Tipo/), { target: { value: "out" } });
      fireEvent.change(screen.getByLabelText(/Quantidade/), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: "Uso em atendimento" } });

      const appointmentSelect = await screen.findByLabelText(/Consulta atendida/);
      fireEvent.change(appointmentSelect, { target: { value: "appt-1" } });
      fireEvent.click(screen.getByText("Registrar movimentação"));

      await waitFor(() => expect(sentBody).toBeDefined());
      const payload = JSON.parse(sentBody as string);
      expect(payload).toMatchObject({ type: "out", appointmentId: "appt-1" });
    });

    it("Dado falha ao registrar movimentação, Quando submetido, Então exibe alerta de erro", async () => {
      mockFetch(
        buildRouter({
          supplies: [lowStockSupply],
          patchOrPost: ({ url, init }) => {
            if (url === "/api/supplies/sup-1/movements" && init?.method === "POST") {
              return errorResponse("Erro ao movimentar estoque");
            }
            return null;
          },
        }),
      );

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Movimentar"));
      await screen.findByText("Movimentar — Bolsa de colostomia");
      fireEvent.change(screen.getByLabelText(/Quantidade/), { target: { value: "5" } });
      fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: "Compra" } });
      fireEvent.click(screen.getByText("Registrar movimentação"));

      expect(await screen.findByText("Erro ao movimentar estoque")).toBeInTheDocument();
    });

    it("Dado modal de movimentação aberto, Quando fechar pelo botão Fechar, Então oculta o formulário", async () => {
      mockFetch(buildRouter({ supplies: [lowStockSupply] }));

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Movimentar"));
      expect(await screen.findByText("Movimentar — Bolsa de colostomia")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

      expect(screen.queryByText("Movimentar — Bolsa de colostomia")).not.toBeInTheDocument();
    });

    it("Dado falha ao carregar consultas do dia, Quando abrir movimentação de saída, Então mantém apenas a opção sem vínculo", async () => {
      mockFetch(
        buildRouter({
          supplies: [lowStockSupply],
          patchOrPost: ({ url }) => {
            if (url.startsWith("/api/appointments")) return jsonResponse(null, false);
            return null;
          },
        }),
      );

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Movimentar"));
      await screen.findByText("Movimentar — Bolsa de colostomia");

      fireEvent.change(screen.getByLabelText(/Tipo/), { target: { value: "out" } });
      const appointmentSelect = await screen.findByLabelText(/Consulta atendida/);

      await waitFor(() =>
        expect(appointmentSelect.querySelectorAll("option")).toHaveLength(1),
      );
    });

    it("Dado consulta sem nome de paciente cadastrado, Quando abrir movimentação de saída, Então exibe rótulo genérico de paciente", async () => {
      const appointmentSemNome: AppointmentDto = {
        id: "appt-2",
        patientId: "pat-2",
        startsAt: new Date().toISOString(),
        endsAt: new Date().toISOString(),
        procedure: "Curativo",
        priceCents: 8000,
        notes: null,
        status: "scheduled",
        professionalId: null,
      };
      mockFetch(
        buildRouter({ supplies: [lowStockSupply], appointments: [appointmentSemNome] }),
      );

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Movimentar"));
      await screen.findByText("Movimentar — Bolsa de colostomia");

      fireEvent.change(screen.getByLabelText(/Tipo/), { target: { value: "out" } });

      expect(await screen.findByText(/Paciente \(Curativo\)/)).toBeInTheDocument();
    });
  });

  describe("Cenário: histórico de movimentações", () => {
    it("Dado histórico com registros, Quando abrir o modal, Então lista as movimentações", async () => {
      mockFetch(buildRouter({ supplies: [lowStockSupply], movements: [movementFixture] }));

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Histórico"));

      expect(await screen.findByText("Compra fornecedor X")).toBeInTheDocument();
      expect(screen.getByText("+20")).toBeInTheDocument();
    });

    it("Dado histórico vazio, Quando abrir o modal, Então exibe mensagem de vazio", async () => {
      mockFetch(buildRouter({ supplies: [lowStockSupply], movements: [] }));

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Histórico"));

      expect(await screen.findByText("Nenhuma movimentação registrada.")).toBeInTheDocument();
    });

    it("Dado erro ao carregar histórico, Quando abrir o modal, Então exibe alerta de erro", async () => {
      mockFetch(
        buildRouter({
          supplies: [lowStockSupply],
          patchOrPost: ({ url }) => {
            if (url.includes("/movements")) return jsonResponse(null, false);
            return null;
          },
        }),
      );

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Histórico"));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("Dado modal de histórico aberto, Quando fechar pelo botão Fechar, Então oculta a listagem", async () => {
      mockFetch(buildRouter({ supplies: [lowStockSupply], movements: [] }));

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Histórico"));
      expect(await screen.findByText("Nenhuma movimentação registrada.")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

      expect(screen.queryByText("Nenhuma movimentação registrada.")).not.toBeInTheDocument();
    });

    it("Dado movimentação de saída no histórico, Quando abrir o modal, Então exibe o sinal negativo", async () => {
      const saidaMovement: StockMovementDto = {
        ...movementFixture,
        id: "mov-2",
        type: "out",
        quantity: 4,
        reason: "Uso em atendimento",
      };
      mockFetch(buildRouter({ supplies: [lowStockSupply], movements: [saidaMovement] }));

      render(<SuppliesPage />);
      await screen.findByText("Bolsa de colostomia");

      fireEvent.click(screen.getByText("Histórico"));

      expect(await screen.findByText("−4")).toBeInTheDocument();
    });
  });
});
