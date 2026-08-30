// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuditPage from "@/app/(staff)/auditoria/page";
import SettingsPage from "@/app/(staff)/configuracoes/page";
import PartnersPage from "@/app/(staff)/parceiros/page";
import ProfessionalsPage from "@/app/(staff)/profissionais/page";
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
  vi.unstubAllGlobals();
});

describe("Feature: AuditPage", () => {
  describe("Cenário: carregamento e listagem", () => {
    it("Dado eventos de auditoria, Quando a página carrega, Então lista eventos com rótulos traduzidos", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/patients")) {
          return jsonResponse([
            { id: "p1", fullName: "Maria Silva" },
          ]);
        }
        if (url.startsWith("/api/audit")) {
          return jsonResponse([
            {
              id: "e1",
              actorRole: "staff",
              actorId: "u1",
              action: "update",
              resourceType: "evolution",
              patientId: "p1",
              detail: "Editou evolução",
              occurredAt: "2026-01-01T10:00:00.000Z",
            },
          ]);
        }
        return jsonResponse(null, false);
      });

      render(<AuditPage />);

      expect(await screen.findByText("Alteração")).toBeInTheDocument();
      expect(screen.getByText("Evolução")).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Maria Silva" })).toBeInTheDocument();
      expect(screen.getByText("Editou evolução")).toBeInTheDocument();
    });

    it("Dado nenhum evento, Quando a página carrega, Então exibe mensagem de vazio", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/patients")) return jsonResponse([]);
        if (url.startsWith("/api/audit")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<AuditPage />);

      expect(
        await screen.findByText("Nenhum evento de auditoria registrado."),
      ).toBeInTheDocument();
    });

    it("Dado erro ao carregar auditoria, Quando a página carrega, Então exibe alerta de erro", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/patients")) return jsonResponse([]);
        if (url.startsWith("/api/audit")) return jsonResponse(null, false);
        return jsonResponse(null, false);
      });

      render(<AuditPage />);

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });
  });

  describe("Cenário: filtro por paciente", () => {
    it("Dado seleção de paciente no filtro, Quando alterado, Então refaz a busca com patientId", async () => {
      const fetchMock = mockFetch(({ url }) => {
        if (url.startsWith("/api/patients")) {
          return jsonResponse([{ id: "p1", fullName: "Maria Silva" }]);
        }
        if (url.startsWith("/api/audit")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<AuditPage />);
      await screen.findByText("Nenhum evento de auditoria registrado.");

      const select = screen.getByDisplayValue("Todos os pacientes");
      fireEvent.change(select, { target: { value: "p1" } });

      await waitFor(() => {
        expect(
          fetchMock.mock.calls.some(([url]) =>
            String(url).includes("/api/audit?patientId=p1"),
          ),
        ).toBe(true);
      });
    });
  });

  describe("Cenário: rótulos e valores sem mapeamento", () => {
    it("Dado evento com ação e recurso sem rótulo mapeado e paciente sem correspondência, Quando renderizar, Então exibe os valores brutos", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/patients")) {
          return jsonResponse([{ id: "p1", fullName: "Maria Silva" }]);
        }
        if (url.startsWith("/api/audit")) {
          return jsonResponse([
            {
              id: "e2",
              actorRole: "staff",
              actorId: "u1",
              action: "export",
              resourceType: "unknown-resource",
              patientId: "p2",
              detail: "Detalhe do evento",
              occurredAt: "2026-01-02T10:00:00.000Z",
            },
          ]);
        }
        return jsonResponse(null, false);
      });

      render(<AuditPage />);

      expect(await screen.findByText("export")).toBeInTheDocument();
      expect(screen.getByText("unknown-resource")).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "p2" })).toBeInTheDocument();
    });

    it("Dado evento sem paciente e sem detalhe, Quando renderizar, Então exibe traço para paciente e detalhe", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/patients")) return jsonResponse([]);
        if (url.startsWith("/api/audit")) {
          return jsonResponse([
            {
              id: "e3",
              actorRole: "staff",
              actorId: "u1",
              action: "read",
              resourceType: "photo",
              patientId: null,
              detail: null,
              occurredAt: "2026-01-03T10:00:00.000Z",
            },
          ]);
        }
        return jsonResponse(null, false);
      });

      render(<AuditPage />);

      expect(await screen.findByText("Leitura")).toBeInTheDocument();
      expect(screen.getAllByText("—")).toHaveLength(2);
    });
  });
});

describe("Feature: SettingsPage", () => {
  describe("Cenário: grade de horários", () => {
    it("Dado configuração padrão, Quando a página carrega, Então exibe aviso de padrão e valores", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [1, 2, 3, 4, 5], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);

      expect(
        await screen.findByText(/usando padrão — nada salvo ainda/),
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("8")).toBeInTheDocument();
      expect(screen.getByDisplayValue("18")).toBeInTheDocument();
      expect(screen.getByDisplayValue("30")).toBeInTheDocument();
    });

    it("Dado clique em um dia da semana, Quando alternado, Então o dia muda de seleção", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [1, 2, 3, 4, 5], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: false,
          });
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText("Grade de horários");

      const domButton = screen.getByRole("button", { name: "Dom" });
      expect(domButton).toHaveAttribute("aria-pressed", "false");
      // SPEC_DEVIATION: o dia selecionado usava a receita local accentButton
      // (classe utilitária `bg-accent-ink`) como override de className sobre o
      // Button; migrado para `variant="accent"` (T32), que o pacote 3.x resolve
      // para a classe semântica `sv-btn--accent` em vez de um utilitário
      // Tailwind. O comportamento (dia selecionado ganha a cor de destaque) é o
      // mesmo; a asserção segue a classe real emitida pelo pacote.
      expect(domButton.className).not.toContain("sv-btn--accent");
      fireEvent.click(domButton);
      expect(domButton).toHaveAttribute("aria-pressed", "true");
      expect(domButton.className).toContain("sv-btn--accent");
    });

    it("Dado clique em salvar grade, Quando a chamada é bem-sucedida, Então exibe confirmação", async () => {
      mockFetch(({ url, init }) => {
        if (url.startsWith("/api/settings/schedule") && init?.method === "PUT") {
          return jsonResponse({});
        }
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [1, 2, 3, 4, 5], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: false,
          });
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText("Grade de horários");

      fireEvent.click(screen.getByText("Salvar grade"));

      const alert = await screen.findByRole("status");
      expect(alert).toHaveTextContent(/Grade salva — vale imediatamente para novos agendamentos./);
    });

    it("Dado erro ao salvar grade, Quando falha a chamada, Então exibe alerta de erro", async () => {
      mockFetch(({ url, init }) => {
        if (url.startsWith("/api/settings/schedule") && init?.method === "PUT") {
          return jsonResponse(null, false);
        }
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [1, 2, 3, 4, 5], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: false,
          });
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText("Grade de horários");

      fireEvent.click(screen.getByText("Salvar grade"));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("Dado erro ao carregar a grade de horários, Quando a página carrega, Então exibe alerta de erro", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/settings/schedule")) return jsonResponse(null, false);
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("Dado clique em um dia já selecionado, Quando alternado, Então o dia é removido da seleção", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [1, 2, 3, 4, 5], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: false,
          });
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText("Grade de horários");

      const segButton = screen.getByRole("button", { name: "Seg" });
      expect(segButton).toHaveAttribute("aria-pressed", "true");
      // SPEC_DEVIATION: mesma migração accentButton → variant="accent" (T32);
      // ver nota no primeiro teste desta seção.
      expect(segButton.className).toContain("sv-btn--accent");
      fireEvent.click(segButton);
      expect(segButton).toHaveAttribute("aria-pressed", "false");
      expect(segButton.className).not.toContain("sv-btn--accent");
    });

    it("Dado alteração dos campos de abertura, fechamento e intervalo, Quando editados, Então refletem os novos valores", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [1, 2, 3, 4, 5], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: false,
          });
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText("Grade de horários");

      fireEvent.change(screen.getByLabelText(/Abre \(h\)/), { target: { value: "7" } });
      fireEvent.change(screen.getByLabelText(/Fecha \(h\)/), { target: { value: "20" } });
      fireEvent.change(screen.getByLabelText(/Intervalo \(min\)/), { target: { value: "45" } });

      expect(screen.getByDisplayValue("7")).toBeInTheDocument();
      expect(screen.getByDisplayValue("20")).toBeInTheDocument();
      expect(screen.getByDisplayValue("45")).toBeInTheDocument();
    });

    it("Dado erro não padronizado ao salvar grade, Quando a chamada rejeita com valor que não é Error, Então exibe mensagem padrão", async () => {
      mockFetch(({ url, init }) => {
        if (url.startsWith("/api/settings/schedule") && init?.method === "PUT") {
          throw "falha inesperada";
        }
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [1, 2, 3, 4, 5], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: false,
          });
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText("Grade de horários");

      fireEvent.click(screen.getByText("Salvar grade"));

      expect(await screen.findByText("Erro ao salvar grade")).toBeInTheDocument();
    });
  });

  describe("Cenário: contas de acesso", () => {
    it("Dado nenhuma conta cadastrada, Quando a página carrega, Então exibe mensagem de senha master", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);

      expect(
        await screen.findByText(/todos usam a senha master/),
      ).toBeInTheDocument();
    });

    it("Dado contas cadastradas, Quando a página carrega, Então lista email e situação", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url.startsWith("/api/accounts")) {
          return jsonResponse([
            { id: "a1", email: "ana@clinica.com", professionalId: "pr1", active: true },
            { id: "a2", email: "bob@clinica.com", professionalId: null, active: false },
          ]);
        }
        if (url.startsWith("/api/professionals")) {
          return jsonResponse([{ id: "pr1", fullName: "Dra. Ana", registry: null, commissionPct: null, active: true }]);
        }
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);

      expect(await screen.findByText("ana@clinica.com")).toBeInTheDocument();
      expect(screen.getByText("bob@clinica.com")).toBeInTheDocument();
      expect(screen.getByText("Dra. Ana")).toBeInTheDocument();
      expect(screen.getByText("Ativa")).toBeInTheDocument();
      expect(screen.getByText("Desativada")).toBeInTheDocument();
    });

    it("Dado clique em desativar conta, Quando a chamada é bem-sucedida, Então recarrega as contas", async () => {
      let accountsCallCount = 0;
      mockFetch(({ url, init }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url.startsWith("/api/accounts/a1") && init?.method === "PATCH") {
          return jsonResponse({ id: "a1", email: "ana@clinica.com", professionalId: null, active: false });
        }
        if (url.startsWith("/api/accounts")) {
          accountsCallCount += 1;
          return jsonResponse([
            { id: "a1", email: "ana@clinica.com", professionalId: null, active: true },
          ]);
        }
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText("ana@clinica.com");

      fireEvent.click(screen.getByText("Desativar"));

      await waitFor(() => {
        expect(accountsCallCount).toBeGreaterThanOrEqual(2);
      });
    });

    it("Dado erro ao desativar conta, Quando falha, Então exibe alerta de erro", async () => {
      mockFetch(({ url, init }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url.startsWith("/api/accounts/a1") && init?.method === "PATCH") {
          return jsonResponse(null, false);
        }
        if (url.startsWith("/api/accounts")) {
          return jsonResponse([
            { id: "a1", email: "ana@clinica.com", professionalId: null, active: true },
          ]);
        }
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText("ana@clinica.com");

      fireEvent.click(screen.getByText("Desativar"));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("Dado erro não padronizado ao desativar conta, Quando a chamada rejeita com valor que não é Error, Então exibe mensagem padrão", async () => {
      mockFetch(({ url, init }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url.startsWith("/api/accounts/a1") && init?.method === "PATCH") {
          throw "falha inesperada";
        }
        if (url.startsWith("/api/accounts")) {
          return jsonResponse([
            { id: "a1", email: "ana@clinica.com", professionalId: null, active: true },
          ]);
        }
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText("ana@clinica.com");

      fireEvent.click(screen.getByText("Desativar"));

      expect(await screen.findByText("Erro ao atualizar conta")).toBeInTheDocument();
    });

    it("Dado erro ao carregar contas, Quando a página carrega, Então exibe alerta de erro", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url.startsWith("/api/accounts")) return jsonResponse(null, false);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText("Grade de horários");

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("Dado clique em nova conta e preenchimento do formulário, Quando submetido, Então cria a conta e fecha o modal", async () => {
      let created = false;
      mockFetch(({ url, init }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url === "/api/accounts" && init?.method === "POST") {
          created = true;
          return jsonResponse({ id: "a2", email: "nova@clinica.com", professionalId: null, active: true });
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) {
          return jsonResponse([{ id: "pr1", fullName: "Dra. Ana", registry: null, commissionPct: null, active: true }]);
        }
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText(/todos usam a senha master/);

      fireEvent.click(screen.getByText("+ Nova conta"));
      fireEvent.change(screen.getByLabelText(/Email/), {
        target: { value: "nova@clinica.com" },
      });
      fireEvent.change(screen.getByLabelText(/Senha/), {
        target: { value: "12345678" },
      });
      fireEvent.click(screen.getByText("Criar conta"));

      await waitFor(() => expect(created).toBe(true));
    });

    it("Dado seleção de profissional vinculado, Quando escolhido, Então envia o profissional selecionado ao criar a conta", async () => {
      let sentProfessionalId: unknown = undefined;
      mockFetch(({ url, init }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url === "/api/accounts" && init?.method === "POST") {
          sentProfessionalId = JSON.parse(String(init.body)).professionalId;
          return jsonResponse({ id: "a2", email: "nova@clinica.com", professionalId: "pr1", active: true });
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) {
          return jsonResponse([{ id: "pr1", fullName: "Dra. Ana", registry: null, commissionPct: null, active: true }]);
        }
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText(/todos usam a senha master/);

      fireEvent.click(screen.getByText("+ Nova conta"));
      fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "nova@clinica.com" } });
      fireEvent.change(screen.getByLabelText(/Senha/), { target: { value: "12345678" } });
      fireEvent.change(screen.getByLabelText(/Profissional vinculado/), {
        target: { value: "pr1" },
      });
      fireEvent.click(screen.getByText("Criar conta"));

      await waitFor(() => expect(sentProfessionalId).toBe("pr1"));
    });

    it("Dado modal de nova conta aberto, Quando fechado sem submeter, Então o modal desaparece", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText(/todos usam a senha master/);

      fireEvent.click(screen.getByText("+ Nova conta"));
      expect(await screen.findByText("Nova conta de acesso")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

      await waitFor(() => {
        expect(screen.queryByText("Nova conta de acesso")).not.toBeInTheDocument();
      });
    });

    it("Dado erro padronizado ao criar conta, Quando a chamada falha, Então exibe a mensagem de erro no formulário", async () => {
      mockFetch(({ url, init }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url === "/api/accounts" && init?.method === "POST") {
          return errorResponse("Email já cadastrado");
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText(/todos usam a senha master/);

      fireEvent.click(screen.getByText("+ Nova conta"));
      fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "nova@clinica.com" } });
      fireEvent.change(screen.getByLabelText(/Senha/), { target: { value: "12345678" } });
      fireEvent.click(screen.getByText("Criar conta"));

      expect(await screen.findByText("Email já cadastrado")).toBeInTheDocument();
    });

    it("Dado erro não padronizado ao criar conta, Quando a chamada rejeita com valor que não é Error, Então exibe mensagem padrão", async () => {
      mockFetch(({ url, init }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url === "/api/accounts" && init?.method === "POST") {
          throw "falha inesperada";
        }
        if (url.startsWith("/api/accounts")) return jsonResponse([]);
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText(/todos usam a senha master/);

      fireEvent.click(screen.getByText("+ Nova conta"));
      fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "nova@clinica.com" } });
      fireEvent.change(screen.getByLabelText(/Senha/), { target: { value: "12345678" } });
      fireEvent.click(screen.getByText("Criar conta"));

      expect(await screen.findByText("Erro ao criar conta")).toBeInTheDocument();
    });

    it("Dado falha ao carregar profissionais, Quando a página exibe contas e o modal de nova conta, Então usa lista vazia como padrão", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/settings/schedule")) {
          return jsonResponse({
            config: { weekdays: [], startHour: 8, endHour: 18, minGapMinutes: 30 },
            isDefault: true,
          });
        }
        if (url.startsWith("/api/accounts")) {
          return jsonResponse([
            { id: "a1", email: "ana@clinica.com", professionalId: "pr1", active: true },
          ]);
        }
        if (url.startsWith("/api/professionals")) return jsonResponse(null, false);
        return jsonResponse(null, false);
      });

      render(<SettingsPage />);
      await screen.findByText("ana@clinica.com");

      expect(screen.getByText("—")).toBeInTheDocument();

      fireEvent.click(screen.getByText("+ Nova conta"));
      expect(await screen.findByText("Nova conta de acesso")).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Profissional vinculado/),
      ).toHaveDisplayValue("— nenhum (recepção/gestão) —");
    });
  });
});

describe("Feature: PartnersPage", () => {
  describe("Cenário: listagem", () => {
    it("Dado nenhum parceiro, Quando a página carrega, Então exibe mensagem de vazio", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/partners")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);

      expect(await screen.findByText("Nenhum parceiro cadastrado.")).toBeInTheDocument();
    });

    it("Dado parceiros cadastrados, Quando a página carrega, Então lista dados", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/partners")) {
          return jsonResponse([
            {
              id: "pt1",
              fullName: "Dr. João",
              email: "joao@parceiro.com",
              phone: "11999999999",
              crm: "CRM-SP 123",
              specialty: "Vascular",
              active: true,
            },
          ]);
        }
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);

      expect(await screen.findByText("Dr. João")).toBeInTheDocument();
      expect(screen.getByText("CRM-SP 123")).toBeInTheDocument();
      expect(screen.getByText("Vascular")).toBeInTheDocument();
      expect(screen.getByText("Ativo")).toBeInTheDocument();
    });

    it("Dado erro ao carregar, Quando a página carrega, Então exibe alerta de erro", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/partners")) return jsonResponse(null, false);
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });
  });

  describe("Cenário: alternar situação", () => {
    it("Dado clique em desativar, Quando a chamada é bem-sucedida, Então recarrega a lista", async () => {
      let calls = 0;
      mockFetch(({ url, init }) => {
        if (url === "/api/partners/pt1" && init?.method === "PUT") {
          return jsonResponse({ id: "pt1", active: false });
        }
        if (url.startsWith("/api/partners")) {
          calls += 1;
          return jsonResponse([
            {
              id: "pt1",
              fullName: "Dr. João",
              email: "joao@parceiro.com",
              phone: "11999999999",
              crm: null,
              specialty: null,
              active: true,
            },
          ]);
        }
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);
      await screen.findByText("Dr. João");

      fireEvent.click(screen.getByText("Desativar"));

      await waitFor(() => expect(calls).toBeGreaterThanOrEqual(2));
    });

    it("Dado erro ao alternar situação, Quando falha, Então exibe alerta de erro", async () => {
      mockFetch(({ url, init }) => {
        if (url === "/api/partners/pt1" && init?.method === "PUT") {
          return errorResponse("Erro ao atualizar parceiro");
        }
        if (url.startsWith("/api/partners")) {
          return jsonResponse([
            {
              id: "pt1",
              fullName: "Dr. João",
              email: "joao@parceiro.com",
              phone: "11999999999",
              crm: null,
              specialty: null,
              active: true,
            },
          ]);
        }
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);
      await screen.findByText("Dr. João");

      fireEvent.click(screen.getByText("Desativar"));

      expect(await screen.findByText("Erro ao atualizar parceiro")).toBeInTheDocument();
    });

    it("Dado erro não padronizado ao alternar situação, Quando a chamada rejeita com valor que não é Error, Então exibe mensagem padrão", async () => {
      mockFetch(({ url, init }) => {
        if (url === "/api/partners/pt1" && init?.method === "PUT") {
          throw "falha inesperada";
        }
        if (url.startsWith("/api/partners")) {
          return jsonResponse([
            {
              id: "pt1",
              fullName: "Dr. João",
              email: "joao@parceiro.com",
              phone: "11999999999",
              crm: null,
              specialty: null,
              active: true,
            },
          ]);
        }
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);
      await screen.findByText("Dr. João");

      fireEvent.click(screen.getByText("Desativar"));

      expect(await screen.findByText("Erro ao atualizar parceiro")).toBeInTheDocument();
    });
  });

  describe("Cenário: parceiro inativo na listagem", () => {
    it("Dado parceiro inativo, Quando a página carrega, Então exibe situação inativa e ação de reativar", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/partners")) {
          return jsonResponse([
            {
              id: "pt3",
              fullName: "Dr. Carlos",
              email: "carlos@parceiro.com",
              phone: "11977777777",
              crm: null,
              specialty: null,
              active: false,
            },
          ]);
        }
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);

      expect(await screen.findByText("Dr. Carlos")).toBeInTheDocument();
      expect(screen.getByText("Inativo")).toBeInTheDocument();
      expect(screen.getByText("Reativar")).toBeInTheDocument();
    });
  });

  describe("Cenário: criação e edição via modal", () => {
    it("Dado clique em novo parceiro e preenchimento, Quando submetido, Então cria o parceiro", async () => {
      let created = false;
      mockFetch(({ url, init }) => {
        if (url === "/api/partners" && init?.method === "POST") {
          created = true;
          return jsonResponse({ id: "pt2" });
        }
        if (url.startsWith("/api/partners")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);
      await screen.findByText("Nenhum parceiro cadastrado.");

      fireEvent.click(screen.getByText("+ Novo parceiro"));
      fireEvent.change(screen.getByLabelText(/Nome completo/), {
        target: { value: "Dra. Carla" },
      });
      fireEvent.change(screen.getByLabelText(/Email \(usado no login com Google\)/), {
        target: { value: "carla@parceiro.com" },
      });
      fireEvent.change(screen.getByLabelText(/Telefone/), {
        target: { value: "11988887777" },
      });
      fireEvent.click(screen.getByText("Salvar"));

      await waitFor(() => expect(created).toBe(true));
    });

    it("Dado clique em editar parceiro existente, Quando o modal abre, Então preenche os campos com os dados atuais", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/partners")) {
          return jsonResponse([
            {
              id: "pt1",
              fullName: "Dr. João",
              email: "joao@parceiro.com",
              phone: "11999999999",
              crm: "CRM-SP 123",
              specialty: "Vascular",
              active: true,
            },
          ]);
        }
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);
      await screen.findByText("Dr. João");

      fireEvent.click(screen.getByText("Editar"));

      expect(screen.getByDisplayValue("Dr. João")).toBeInTheDocument();
      expect(screen.getByDisplayValue("joao@parceiro.com")).toBeInTheDocument();
      expect(screen.getByText("Editar parceiro")).toBeInTheDocument();
    });

    it("Dado clique em editar parceiro sem CRM ou especialidade, Quando o modal abre, Então os campos ficam vazios", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/partners")) {
          return jsonResponse([
            {
              id: "pt4",
              fullName: "Dra. Beatriz",
              email: "beatriz@parceiro.com",
              phone: "11966666666",
              crm: null,
              specialty: null,
              active: true,
            },
          ]);
        }
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);
      await screen.findByText("Dra. Beatriz");

      fireEvent.click(screen.getByText("Editar"));

      const crmInput = screen.getByPlaceholderText("Ex.: CRM-SP 123456");
      const specialtyInput = screen.getByPlaceholderText("Ex.: Cirurgia vascular");
      expect(crmInput).toHaveValue("");
      expect(specialtyInput).toHaveValue("");
    });

    it("Dado modal de edição aberto, Quando fechado sem salvar, Então o modal desaparece", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/partners")) {
          return jsonResponse([
            {
              id: "pt1",
              fullName: "Dr. João",
              email: "joao@parceiro.com",
              phone: "11999999999",
              crm: null,
              specialty: null,
              active: true,
            },
          ]);
        }
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);
      await screen.findByText("Dr. João");

      fireEvent.click(screen.getByText("Editar"));
      expect(await screen.findByText("Editar parceiro")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

      await waitFor(() => {
        expect(screen.queryByText("Editar parceiro")).not.toBeInTheDocument();
      });
    });

    it("Dado edição de parceiro existente com alteração de CRM e especialidade, Quando salvo, Então envia PUT com os dados atualizados", async () => {
      let sentBody: { crm?: string | null; specialty?: string | null } = {};
      mockFetch(({ url, init }) => {
        if (url === "/api/partners/pt1" && init?.method === "PUT") {
          sentBody = JSON.parse(String(init.body));
          return jsonResponse({ id: "pt1", active: true });
        }
        if (url.startsWith("/api/partners")) {
          return jsonResponse([
            {
              id: "pt1",
              fullName: "Dr. João",
              email: "joao@parceiro.com",
              phone: "11999999999",
              crm: null,
              specialty: null,
              active: true,
            },
          ]);
        }
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);
      await screen.findByText("Dr. João");

      fireEvent.click(screen.getByText("Editar"));
      fireEvent.change(screen.getByPlaceholderText("Ex.: CRM-SP 123456"), {
        target: { value: "CRM-SP 999" },
      });
      fireEvent.change(screen.getByPlaceholderText("Ex.: Cirurgia vascular"), {
        target: { value: "Dermatologia" },
      });
      fireEvent.click(screen.getByText("Salvar"));

      await waitFor(() => {
        expect(sentBody).toEqual(
          expect.objectContaining({ crm: "CRM-SP 999", specialty: "Dermatologia" }),
        );
      });
    });

    it("Dado erro ao salvar parceiro, Quando a chamada falha, Então exibe alerta no formulário", async () => {
      mockFetch(({ url, init }) => {
        if (url === "/api/partners" && init?.method === "POST") {
          return errorResponse("Erro ao salvar parceiro");
        }
        if (url.startsWith("/api/partners")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);
      await screen.findByText("Nenhum parceiro cadastrado.");

      fireEvent.click(screen.getByText("+ Novo parceiro"));
      fireEvent.change(screen.getByLabelText(/Nome completo/), {
        target: { value: "Dra. Carla" },
      });
      fireEvent.change(screen.getByLabelText(/Email \(usado no login com Google\)/), {
        target: { value: "carla@parceiro.com" },
      });
      fireEvent.change(screen.getByLabelText(/Telefone/), {
        target: { value: "11988887777" },
      });
      fireEvent.click(screen.getByText("Salvar"));

      expect(await screen.findByText("Erro ao salvar parceiro")).toBeInTheDocument();
    });

    it("Dado erro não padronizado ao salvar parceiro, Quando a chamada rejeita com valor que não é Error, Então exibe mensagem padrão", async () => {
      mockFetch(({ url, init }) => {
        if (url === "/api/partners" && init?.method === "POST") {
          throw "falha inesperada";
        }
        if (url.startsWith("/api/partners")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      render(<PartnersPage />);
      await screen.findByText("Nenhum parceiro cadastrado.");

      fireEvent.click(screen.getByText("+ Novo parceiro"));
      fireEvent.change(screen.getByLabelText(/Nome completo/), {
        target: { value: "Dra. Carla" },
      });
      fireEvent.change(screen.getByLabelText(/Email \(usado no login com Google\)/), {
        target: { value: "carla@parceiro.com" },
      });
      fireEvent.change(screen.getByLabelText(/Telefone/), {
        target: { value: "11988887777" },
      });
      fireEvent.click(screen.getByText("Salvar"));

      expect(await screen.findByText("Erro ao salvar parceiro")).toBeInTheDocument();
    });
  });
});

describe("Feature: ProfessionalsPage", () => {
  describe("Cenário: listagem", () => {
    it("Dado nenhum profissional, Quando a página carrega, Então exibe mensagem de vazio", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);

      expect(
        await screen.findByText(
          "Nenhum profissional cadastrado. Consultas e evoluções podem ser atribuídas após o cadastro.",
        ),
      ).toBeInTheDocument();
    });

    it("Dado profissionais cadastrados, Quando a página carrega, Então lista dados", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/professionals")) {
          return jsonResponse([
            { id: "pr1", fullName: "Dra. Ana", registry: "COREN-SP 123", commissionPct: 10, active: true },
          ]);
        }
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);

      expect(await screen.findByText("Dra. Ana")).toBeInTheDocument();
      expect(screen.getByText("COREN-SP 123")).toBeInTheDocument();
      expect(screen.getByText("Ativo")).toBeInTheDocument();
    });

    it("Dado erro ao carregar, Quando a página carrega, Então exibe alerta de erro", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/professionals")) return jsonResponse(null, false);
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });
  });

  describe("Cenário: alternar situação", () => {
    it("Dado clique em desativar, Quando a chamada é bem-sucedida, Então recarrega a lista", async () => {
      let calls = 0;
      mockFetch(({ url, init }) => {
        if (url === "/api/professionals/pr1" && init?.method === "PATCH") {
          return jsonResponse({ id: "pr1", active: false });
        }
        if (url.startsWith("/api/professionals")) {
          calls += 1;
          return jsonResponse([
            { id: "pr1", fullName: "Dra. Ana", registry: null, commissionPct: null, active: true },
          ]);
        }
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);
      await screen.findByText("Dra. Ana");

      fireEvent.click(screen.getByText("Desativar"));

      await waitFor(() => expect(calls).toBeGreaterThanOrEqual(2));
    });

    it("Dado erro ao alternar situação, Quando falha, Então exibe alerta de erro", async () => {
      mockFetch(({ url, init }) => {
        if (url === "/api/professionals/pr1" && init?.method === "PATCH") {
          return errorResponse("Erro ao atualizar profissional");
        }
        if (url.startsWith("/api/professionals")) {
          return jsonResponse([
            { id: "pr1", fullName: "Dra. Ana", registry: null, commissionPct: null, active: true },
          ]);
        }
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);
      await screen.findByText("Dra. Ana");

      fireEvent.click(screen.getByText("Desativar"));

      expect(await screen.findByText("Erro ao atualizar profissional")).toBeInTheDocument();
    });

    it("Dado erro não padronizado ao alternar situação, Quando a chamada rejeita com valor que não é Error, Então exibe mensagem padrão", async () => {
      mockFetch(({ url, init }) => {
        if (url === "/api/professionals/pr1" && init?.method === "PATCH") {
          throw "falha inesperada";
        }
        if (url.startsWith("/api/professionals")) {
          return jsonResponse([
            { id: "pr1", fullName: "Dra. Ana", registry: null, commissionPct: null, active: true },
          ]);
        }
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);
      await screen.findByText("Dra. Ana");

      fireEvent.click(screen.getByText("Desativar"));

      expect(await screen.findByText("Erro ao atualizar profissional")).toBeInTheDocument();
    });
  });

  describe("Cenário: profissional inativo e edição existente", () => {
    it("Dado profissional inativo sem registro, Quando a página carrega, Então exibe situação inativa e ação de reativar", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/professionals")) {
          return jsonResponse([
            { id: "pr3", fullName: "Dr. Bruno", registry: null, commissionPct: null, active: false },
          ]);
        }
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);

      expect(await screen.findByText("Dr. Bruno")).toBeInTheDocument();
      expect(screen.getByText("Inativo")).toBeInTheDocument();
      expect(screen.getByText("Reativar")).toBeInTheDocument();
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("Dado clique em editar profissional existente, Quando o modal abre, Então preenche os campos com os dados atuais", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/professionals")) {
          return jsonResponse([
            { id: "pr1", fullName: "Dra. Ana", registry: "COREN-SP 123", commissionPct: 10, active: true },
          ]);
        }
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);
      await screen.findByText("Dra. Ana");

      fireEvent.click(screen.getByText("Editar"));

      expect(screen.getByText("Editar profissional")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Dra. Ana")).toBeInTheDocument();
      expect(screen.getByDisplayValue("COREN-SP 123")).toBeInTheDocument();
    });

    it("Dado modal de edição aberto, Quando fechado sem salvar, Então o modal desaparece", async () => {
      mockFetch(({ url }) => {
        if (url.startsWith("/api/professionals")) {
          return jsonResponse([
            { id: "pr1", fullName: "Dra. Ana", registry: null, commissionPct: null, active: true },
          ]);
        }
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);
      await screen.findByText("Dra. Ana");

      fireEvent.click(screen.getByText("Editar"));
      expect(await screen.findByText("Editar profissional")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

      await waitFor(() => {
        expect(screen.queryByText("Editar profissional")).not.toBeInTheDocument();
      });
    });

    it("Dado edição de profissional existente com alteração de registro, Quando salvo, Então envia PATCH com os dados atualizados", async () => {
      let sentBody: { registry?: string | null } = {};
      mockFetch(({ url, init }) => {
        if (url === "/api/professionals/pr1" && init?.method === "PATCH") {
          sentBody = JSON.parse(String(init.body));
          return jsonResponse({ id: "pr1", active: true });
        }
        if (url.startsWith("/api/professionals")) {
          return jsonResponse([
            { id: "pr1", fullName: "Dra. Ana", registry: null, commissionPct: null, active: true },
          ]);
        }
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);
      await screen.findByText("Dra. Ana");

      fireEvent.click(screen.getByText("Editar"));
      fireEvent.change(screen.getByLabelText(/Registro profissional/), {
        target: { value: "COREN-SP 456" },
      });
      fireEvent.click(screen.getByText("Salvar"));

      await waitFor(() => {
        expect(sentBody).toEqual(expect.objectContaining({ registry: "COREN-SP 456" }));
      });
    });
  });

  describe("Cenário: criação via modal", () => {
    it("Dado clique em novo profissional e preenchimento, Quando submetido, Então cria o profissional", async () => {
      let created = false;
      mockFetch(({ url, init }) => {
        if (url === "/api/professionals" && init?.method === "POST") {
          created = true;
          return jsonResponse({ id: "pr2" });
        }
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);
      await screen.findByText(
        "Nenhum profissional cadastrado. Consultas e evoluções podem ser atribuídas após o cadastro.",
      );

      fireEvent.click(screen.getByText("+ Novo profissional"));
      fireEvent.change(screen.getByLabelText(/Nome \*/), {
        target: { value: "Dr. Pedro" },
      });
      fireEvent.click(screen.getByText("Salvar"));

      await waitFor(() => expect(created).toBe(true));
    });

    it("Dado erro ao salvar profissional, Quando a chamada falha, Então exibe alerta no formulário", async () => {
      mockFetch(({ url, init }) => {
        if (url === "/api/professionals" && init?.method === "POST") {
          return errorResponse("Erro ao salvar profissional");
        }
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);
      await screen.findByText(
        "Nenhum profissional cadastrado. Consultas e evoluções podem ser atribuídas após o cadastro.",
      );

      fireEvent.click(screen.getByText("+ Novo profissional"));
      fireEvent.change(screen.getByLabelText(/Nome \*/), {
        target: { value: "Dr. Pedro" },
      });
      fireEvent.click(screen.getByText("Salvar"));

      expect(await screen.findByText("Erro ao salvar profissional")).toBeInTheDocument();
    });

    it("Dado erro não padronizado ao salvar profissional, Quando a chamada rejeita com valor que não é Error, Então exibe mensagem padrão", async () => {
      mockFetch(({ url, init }) => {
        if (url === "/api/professionals" && init?.method === "POST") {
          throw "falha inesperada";
        }
        if (url.startsWith("/api/professionals")) return jsonResponse([]);
        return jsonResponse(null, false);
      });

      renderWithToast(<ProfessionalsPage />);
      await screen.findByText(
        "Nenhum profissional cadastrado. Consultas e evoluções podem ser atribuídas após o cadastro.",
      );

      fireEvent.click(screen.getByText("+ Novo profissional"));
      fireEvent.change(screen.getByLabelText(/Nome \*/), {
        target: { value: "Dr. Pedro" },
      });
      fireEvent.click(screen.getByText("Salvar"));

      expect(await screen.findByText("Erro ao salvar profissional")).toBeInTheDocument();
    });
  });
});
