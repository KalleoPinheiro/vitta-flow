// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { PartnerDto, PatientDto } from "@/lib/dto";
import { formatDate } from "@/lib/format";
import PatientsPage from "@/app/(staff)/pacientes/page";

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
  vi.unstubAllGlobals();
});

const partnerFixture: PartnerDto = {
  id: "partner-1",
  fullName: "Dr. João",
  email: "joao@parceiro.com",
  phone: "11999999999",
  crm: "CRM-SP 123",
  specialty: "Vascular",
  active: true,
};

const patientFixture: PatientDto = {
  id: "pat-1",
  fullName: "Maria Souza",
  email: "maria@example.com",
  phone: "11988887777",
  birthDate: "1990-05-10T00:00:00.000Z",
  notes: null,
  referredByPartnerId: null,
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const inactivePatientFixture: PatientDto = {
  ...patientFixture,
  id: "pat-2",
  fullName: "João Pereira",
  email: "joao.pereira@example.com",
  phone: "11966665555",
  birthDate: null,
  active: false,
};

interface RouterOptions {
  patients?: PatientDto[];
  partners?: PartnerDto[];
  extra?: (call: FetchCall) => { ok: boolean; json: () => Promise<unknown> } | undefined;
}

function buildRouter({ patients = [], partners = [], extra }: RouterOptions = {}) {
  return ({ url, init }: FetchCall) => {
    const method = init?.method ?? "GET";
    if (extra) {
      const custom = extra({ url, init });
      if (custom) return custom;
    }
    if (url.startsWith("/api/partners")) {
      return jsonResponse(partners);
    }
    if (url.startsWith("/api/patients") && method === "GET") {
      return jsonResponse(patients);
    }
    return jsonResponse(null, false);
  };
}

describe("Feature: PatientsPage", () => {
  describe("Cenário: listagem", () => {
    it("Dado nenhum paciente, Quando a página carrega, Então exibe mensagem de vazio", async () => {
      mockFetch(buildRouter({ patients: [] }));

      render(<PatientsPage />);

      expect(await screen.findByText("Nenhum paciente encontrado.")).toBeInTheDocument();
    });

    it("Dado pacientes cadastrados, Quando a página carrega, Então lista nome, contato, nascimento e situação", async () => {
      mockFetch(buildRouter({ patients: [patientFixture, inactivePatientFixture] }));

      render(<PatientsPage />);

      expect(await screen.findByText("Maria Souza")).toBeInTheDocument();
      expect(screen.getByText("maria@example.com")).toBeInTheDocument();
      expect(screen.getByText("11988887777")).toBeInTheDocument();
      expect(screen.getByText(formatDate(patientFixture.birthDate as string))).toBeInTheDocument();
      expect(screen.getByText("Ativo")).toBeInTheDocument();
      expect(screen.getByText("João Pereira")).toBeInTheDocument();
      expect(screen.getByText("Inativo")).toBeInTheDocument();
    });
  });

  describe("Cenário: busca", () => {
    it("Dado texto digitado na busca, Quando o debounce expira, Então refaz a busca com o parâmetro search", async () => {
      const fetchMock = mockFetch(buildRouter({ patients: [patientFixture] }));

      render(<PatientsPage />);
      await screen.findByText("Maria Souza");

      fireEvent.change(screen.getByPlaceholderText("Buscar por nome, email ou telefone…"), {
        target: { value: "Maria" },
      });

      await waitFor(() => {
        expect(
          fetchMock.mock.calls.some(([url]) => String(url).includes("search=Maria")),
        ).toBe(true);
      });
    });
  });

  describe("Cenário: criação via modal", () => {
    it("Dado clique em novo paciente e preenchimento, Quando submetido, Então cria o paciente e fecha o modal", async () => {
      const fetchMock = mockFetch(
        buildRouter({
          patients: [],
          partners: [partnerFixture],
          extra: ({ url, init }) => {
            if (url === "/api/patients" && init?.method === "POST") {
              return jsonResponse({ ...patientFixture, id: "pat-3" });
            }
            return undefined;
          },
        }),
      );

      render(<PatientsPage />);
      await screen.findByText("Nenhum paciente encontrado.");

      fireEvent.click(screen.getByText("+ Novo paciente"));
      expect(screen.getByText("Novo paciente")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Nome completo/), {
        target: { value: "Ana Lima" },
      });
      fireEvent.change(screen.getByLabelText(/Email \*/), {
        target: { value: "ana@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/Telefone \*/), {
        target: { value: "11977776666" },
      });
      fireEvent.click(screen.getByText("Salvar"));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/patients",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              fullName: "Ana Lima",
              email: "ana@example.com",
              phone: "11977776666",
              birthDate: null,
              notes: null,
              referredByPartnerId: null,
            }),
          }),
        );
      });
      await waitFor(() => {
        expect(screen.queryByText("Novo paciente")).not.toBeInTheDocument();
      });
    });
  });

  describe("Cenário: edição via modal", () => {
    it("Dado clique em editar paciente existente, Quando o modal abre, Então preenche os campos com os dados atuais", async () => {
      mockFetch(buildRouter({ patients: [patientFixture] }));

      render(<PatientsPage />);
      await screen.findByText("Maria Souza");

      fireEvent.click(screen.getByText("Editar"));

      expect(screen.getByText("Editar paciente")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Maria Souza")).toBeInTheDocument();
      expect(screen.getByDisplayValue("maria@example.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("11988887777")).toBeInTheDocument();
      expect(screen.getByDisplayValue("1990-05-10")).toBeInTheDocument();
    });

    it("Dado edição submetida, Quando a chamada é bem-sucedida, Então envia PUT com os dados atualizados", async () => {
      const fetchMock = mockFetch(
        buildRouter({
          patients: [patientFixture],
          extra: ({ url, init }) => {
            if (url === `/api/patients/${patientFixture.id}` && init?.method === "PUT") {
              return jsonResponse({ ...patientFixture, fullName: "Maria Souza Atualizada" });
            }
            return undefined;
          },
        }),
      );

      render(<PatientsPage />);
      await screen.findByText("Maria Souza");
      fireEvent.click(screen.getByText("Editar"));

      fireEvent.change(screen.getByLabelText(/Nome completo/), {
        target: { value: "Maria Souza Atualizada" },
      });
      fireEvent.click(screen.getByText("Salvar"));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          `/api/patients/${patientFixture.id}`,
          expect.objectContaining({ method: "PUT" }),
        );
      });
    });

    it("Dado erro ao salvar, Quando a chamada falha, Então exibe alerta no formulário", async () => {
      mockFetch(
        buildRouter({
          patients: [patientFixture],
          extra: ({ url, init }) => {
            if (url === `/api/patients/${patientFixture.id}` && init?.method === "PUT") {
              return errorResponse("Erro ao salvar paciente");
            }
            return undefined;
          },
        }),
      );

      render(<PatientsPage />);
      await screen.findByText("Maria Souza");
      fireEvent.click(screen.getByText("Editar"));
      fireEvent.click(screen.getByText("Salvar"));

      expect(await screen.findByText("Erro ao salvar paciente")).toBeInTheDocument();
    });
  });

  describe("Cenário: ativar/desativar", () => {
    it("Dado clique em desativar, Quando a chamada é bem-sucedida, Então recarrega a lista", async () => {
      let calls = 0;
      mockFetch(
        buildRouter({
          patients: [patientFixture],
          extra: ({ url, init }) => {
            if (url === `/api/patients/${patientFixture.id}` && init?.method === "PATCH") {
              return jsonResponse({ ...patientFixture, active: false });
            }
            if (url.startsWith("/api/patients") && (init?.method ?? "GET") === "GET") {
              calls += 1;
            }
            return undefined;
          },
        }),
      );

      render(<PatientsPage />);
      await screen.findByText("Maria Souza");

      fireEvent.click(screen.getByText("Desativar"));

      await waitFor(() => expect(calls).toBeGreaterThanOrEqual(2));
    });

    it("Dado erro ao alternar situação, Quando falha, Então exibe alerta de erro", async () => {
      mockFetch(
        buildRouter({
          patients: [patientFixture],
          extra: ({ url, init }) => {
            if (url === `/api/patients/${patientFixture.id}` && init?.method === "PATCH") {
              return errorResponse("Erro ao atualizar paciente");
            }
            return undefined;
          },
        }),
      );

      render(<PatientsPage />);
      await screen.findByText("Maria Souza");

      fireEvent.click(screen.getByText("Desativar"));

      expect(await screen.findByText("Erro ao atualizar paciente")).toBeInTheDocument();
    });

    it("Dado paciente inativo, Quando renderizado, Então exibe ação de reativar", async () => {
      mockFetch(buildRouter({ patients: [inactivePatientFixture] }));

      render(<PatientsPage />);

      expect(await screen.findByText("Reativar")).toBeInTheDocument();
    });
  });
});
