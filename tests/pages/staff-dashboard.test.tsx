// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { AppointmentDto, FollowUpDto, SupplyDto } from "@/lib/dto";
import { formatDate } from "@/lib/format";
import DashboardPage from "@/app/(staff)/page";

interface TriagePhotoFixture {
  id: string;
  conditionTitle: string;
  patientId: string | null;
  patientName: string;
  patientNote: string | null;
  createdAt: string;
  waitingHours: number;
  latestScore: { kind: "push" | "det"; value: number } | null;
}

const summaryFixture = {
  billing: { paidCents: 150000, pendingCents: 50000, pendingCount: 3 },
  appointmentsInMonth: 12,
  today: [] as AppointmentDto[],
};

const appointmentFixture: AppointmentDto = {
  id: "appt-1",
  patientId: "pat-1",
  patientName: "Maria Souza",
  startsAt: "2026-07-19T12:00:00.000Z",
  endsAt: "2026-07-19T13:00:00.000Z",
  procedure: "Troca de bolsa",
  priceCents: 12000,
  notes: null,
  status: "scheduled",
  professionalId: null,
};

const followUpFixture: FollowUpDto = {
  id: "fu-1",
  patientId: "pat-1",
  patientName: "Maria Souza",
  appointmentId: null,
  dueDate: "2026-07-20T00:00:00.000Z",
  reason: "Retorno: avaliação de ferida",
  status: "pending",
  isOverdue: true,
};

const supplyFixture: SupplyDto = {
  id: "sup-1",
  name: "Bolsa de colostomia",
  unit: "un",
  minQty: 10,
  priceCents: 3000,
  stockQty: 2,
  isLowStock: true,
  active: true,
};

const triageFixture: TriagePhotoFixture = {
  id: "photo-1",
  conditionTitle: "Ferida perna E",
  patientId: "pat-1",
  patientName: "Maria Souza",
  patientNote: "Está coçando",
  createdAt: "2026-07-18T10:00:00.000Z",
  waitingHours: 2,
  latestScore: null,
};

interface FetchOptions {
  summary?: unknown;
  summaryError?: string;
  followUps?: FollowUpDto[];
  supplies?: SupplyDto[];
  triage?: TriagePhotoFixture[];
}

function jsonResponse(success: boolean, data: unknown, error: string | null = null) {
  return {
    ok: success,
    json: async () => ({ success, data, error }),
  };
}

function mockFetch(options: FetchOptions = {}) {
  const {
    summary = summaryFixture,
    summaryError,
    followUps = [],
    supplies = [],
    triage = [],
  } = options;

  vi.stubGlobal(
    "fetch",
    // eslint-disable-next-line complexity -- roteador de mock por url/método, ramificação inerente ao padrão
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";

      if (url.startsWith("/api/summary")) {
        return summaryError
          ? jsonResponse(false, null, summaryError)
          : jsonResponse(true, summary);
      }
      if (url.startsWith("/api/follow-ups") && method === "GET") {
        return jsonResponse(true, followUps);
      }
      if (url.startsWith("/api/follow-ups/") && method === "PATCH") {
        return jsonResponse(true, { ...followUpFixture, status: "done" });
      }
      if (url.startsWith("/api/supplies")) {
        return jsonResponse(true, supplies);
      }
      if (url.startsWith("/api/photos/triage")) {
        return jsonResponse(true, triage);
      }
      if (url.startsWith("/api/photos/") && method === "PATCH") {
        return jsonResponse(true, { ok: true });
      }
      throw new Error(`URL não mapeada no mock: ${method} ${url}`);
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Feature: Dashboard do painel interno", () => {
  describe("Cenário: carregando", () => {
    it("Dado que o resumo ainda não chegou, Quando renderizar, Então exibe indicador de carregamento", () => {
      mockFetch();
      render(<DashboardPage />);

      expect(screen.getByText("Carregando…")).toBeInTheDocument();
    });
  });

  describe("Cenário: erro ao carregar resumo", () => {
    it("Dado falha na API de resumo, Quando renderizar, Então exibe alerta de erro", async () => {
      mockFetch({ summaryError: "Erro ao buscar resumo" });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Erro ao buscar resumo")).toBeInTheDocument();
      });
    });
  });

  describe("Cenário: resumo carregado com dados", () => {
    it("Dado resumo, consultas do dia, retornos e estoque, Quando renderizar, Então exibe os cartões e listas", async () => {
      mockFetch({
        summary: { ...summaryFixture, today: [appointmentFixture] },
        followUps: [followUpFixture],
        supplies: [supplyFixture],
      });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("R$ 1.500,00")).toBeInTheDocument();
      });
      expect(screen.getByText("R$ 500,00")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();

      expect(screen.getAllByText("Maria Souza").length).toBeGreaterThan(0);
      expect(screen.getByText("Troca de bolsa")).toBeInTheDocument();

      expect(screen.getByText(/Atrasado/)).toBeInTheDocument();
      expect(screen.getByText("Bolsa de colostomia")).toBeInTheDocument();
      expect(screen.getByText("2/10 un")).toBeInTheDocument();
    });

    it("Dado status de consulta sem rótulo mapeado, Quando renderizar, Então usa o status bruto como rótulo", async () => {
      mockFetch({
        summary: {
          ...summaryFixture,
          today: [{ ...appointmentFixture, status: "rescheduled" }],
        },
      });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("rescheduled")).toBeInTheDocument();
      });
    });

    it("Dado retorno não atrasado, Quando renderizar, Então não exibe o marcador de atraso", async () => {
      mockFetch({
        followUps: [{ ...followUpFixture, isOverdue: false }],
      });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(formatDate(followUpFixture.dueDate))).toBeInTheDocument();
      });
      expect(screen.queryByText(/Atrasado/)).not.toBeInTheDocument();
    });
  });

  describe("Cenário: listas vazias", () => {
    it("Dado nenhuma consulta hoje, nenhum retorno e nenhum insumo baixo, Quando renderizar, Então exibe mensagens de estado vazio", async () => {
      mockFetch();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Nenhuma consulta agendada para hoje.")).toBeInTheDocument();
      });
      expect(screen.getByText("Nenhum retorno pendente.")).toBeInTheDocument();
      expect(screen.getByText("Nenhum insumo abaixo do mínimo.")).toBeInTheDocument();
    });

    it("Dado insumos existentes mas nenhum abaixo do mínimo, Quando renderizar, Então filtra a lista de estoque baixo", async () => {
      mockFetch({ supplies: [{ ...supplyFixture, isLowStock: false }] });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Nenhum insumo abaixo do mínimo.")).toBeInTheDocument();
      });
    });
  });

  describe("Cenário: ações de retorno pendente", () => {
    it("Dado clique em Concluir, Quando acionado, Então chama PATCH e atualiza a lista", async () => {
      mockFetch({ followUps: [followUpFixture] });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Concluir")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Concluir"));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/follow-ups/fu-1",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ status: "done" }),
          }),
        );
      });
    });

    it("Dado clique em Cancelar, Quando acionado, Então chama PATCH com status cancelled", async () => {
      mockFetch({ followUps: [followUpFixture] });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Cancelar")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Cancelar"));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/follow-ups/fu-1",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ status: "cancelled" }),
          }),
        );
      });
    });
  });

  describe("Cenário: fila de triagem de fotos", () => {
    it("Dado fila vazia, Quando renderizar, Então não exibe a seção de triagem", async () => {
      mockFetch();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Nenhum retorno pendente.")).toBeInTheDocument();
      });
      expect(screen.queryByText(/aguardando triagem/)).not.toBeInTheDocument();
    });

    it("Dado fotos aguardando triagem, Quando renderizar, Então exibe a fila com paciente e observação", async () => {
      mockFetch({ triage: [triageFixture] });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/aguardando triagem \(1\)/)).toBeInTheDocument();
      });
      expect(screen.getAllByText(/Maria Souza/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Está coçando/)).toBeInTheDocument();
    });

    it("Dado pendência antiga e score da condição, Quando renderizar, Então mostra idade destacada e badge do score (COMP3-04/06)", async () => {
      mockFetch({
        triage: [
          { ...triageFixture, waitingHours: 30, latestScore: { kind: "push", value: 9 } },
        ],
      });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("PUSH 9")).toBeInTheDocument();
      });
      const waiting = screen.getByText(/aguardando há 30h/);
      expect(waiting).toHaveClass("text-red-700");
    });

    it("Dado pendência recente sem score, Quando renderizar, Então idade sem destaque e sem badge (COMP3-05)", async () => {
      mockFetch({ triage: [triageFixture] });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/aguardando há 2h/)).toBeInTheDocument();
      });
      expect(screen.getByText(/aguardando há 2h/)).not.toHaveClass("text-red-700");
      expect(screen.queryByText(/PUSH|DET/)).not.toBeInTheDocument();
    });

    it("Dado clique em 'Ok, manter plano', Quando acionado, Então envia triagem reviewed", async () => {
      mockFetch({ triage: [triageFixture] });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Ok, manter plano")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Ok, manter plano"));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/photos/photo-1",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ triage: "reviewed" }),
          }),
        );
      });
    });

    it("Dado clique em 'Antecipar retorno', Quando acionado, Então envia triagem escalated", async () => {
      mockFetch({ triage: [triageFixture] });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Antecipar retorno")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Antecipar retorno"));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/photos/photo-1",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ triage: "escalated" }),
          }),
        );
      });
    });

    it("Dado foto sem observação do paciente, Quando renderizar, Então exibe 'sem observação'", async () => {
      mockFetch({ triage: [{ ...triageFixture, patientNote: null }] });
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/sem observação/)).toBeInTheDocument();
      });
    });

    it("Dado erro não padronizado (sem instância de Error) na triagem, Quando acionar decisão, Então exibe mensagem padrão de erro", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === "string" ? input : input.toString();
          const method = init?.method ?? "GET";
          if (url.startsWith("/api/summary")) return jsonResponse(true, summaryFixture);
          if (url.startsWith("/api/follow-ups")) return jsonResponse(true, []);
          if (url.startsWith("/api/supplies")) return jsonResponse(true, []);
          if (url.startsWith("/api/photos/triage")) return jsonResponse(true, [triageFixture]);
          if (url.startsWith("/api/photos/") && method === "PATCH") {
            // eslint-disable-next-line @typescript-eslint/only-throw-error -- simula rejeição não padronizada
            throw "falha inesperada";
          }
          throw new Error(`URL não mapeada: ${method} ${url}`);
        }),
      );
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Ok, manter plano")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Ok, manter plano"));

      await waitFor(() => {
        expect(screen.getByText("Erro na triagem")).toBeInTheDocument();
      });
    });

    it("Dado falha na triagem, Quando acionar decisão, Então exibe alerta de erro", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === "string" ? input : input.toString();
          const method = init?.method ?? "GET";
          if (url.startsWith("/api/summary")) return jsonResponse(true, summaryFixture);
          if (url.startsWith("/api/follow-ups")) return jsonResponse(true, []);
          if (url.startsWith("/api/supplies")) return jsonResponse(true, []);
          if (url.startsWith("/api/photos/triage")) return jsonResponse(true, [triageFixture]);
          if (url.startsWith("/api/photos/") && method === "PATCH") {
            return jsonResponse(false, null, "Erro na triagem");
          }
          throw new Error(`URL não mapeada: ${method} ${url}`);
        }),
      );
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Ok, manter plano")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Ok, manter plano"));

      await waitFor(() => {
        expect(screen.getByText("Erro na triagem")).toBeInTheDocument();
      });
    });
  });
});
