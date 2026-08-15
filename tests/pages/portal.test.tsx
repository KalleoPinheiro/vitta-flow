// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type {
  AssessmentDto,
  ConditionDto,
  ConditionPhotoDto,
  FollowUpDto,
  InvoiceDto,
  PartnerDto,
  PortalAppointmentDto,
  PortalPatientProfileDto,
  ReferredPatientSummaryDto,
} from "@/lib/dto";
import { formatDate, formatDateTime } from "@/lib/format";
import PortalPage from "@/app/portal/page";
import { PatientPortalView } from "@/app/portal/patient-view";
import { PartnerPortalView } from "@/app/portal/partner-view";
import { ConsentCard, PatientPhotoUpload } from "@/app/portal/consent-card";
import { ConditionProgress, type ConditionWithAssessmentsDto } from "@/app/portal/condition-progress";

function jsonResponse(success: boolean, data: unknown, error: string | null = null) {
  return {
    ok: success,
    json: async () => ({ success, data, error }),
  };
}

function rawResponse(ok: boolean, body: unknown = {}) {
  return { ok, json: async () => body };
}

interface RouteHandler {
  method?: string;
  path: string;
  respond: () => { ok: boolean; json: () => Promise<unknown> };
}

function mockFetch(routes: RouteHandler[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      const route = routes.find(
        (r) => url.startsWith(r.path) && (r.method ?? "GET") === method,
      );
      if (!route) {
        throw new Error(`URL não mapeada no mock: ${method} ${url}`);
      }
      return route.respond();
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const patientFixture: PortalPatientProfileDto = {
  id: "pat-1",
  fullName: "Ana Souza",
  email: "ana@paciente.com",
  phone: "11999990000",
};

const partnerFixture: PartnerDto = {
  id: "partner-1",
  fullName: "Dr. Carlos Lima",
  email: "carlos@parceiro.com",
  phone: "11988880000",
  crm: "CRM-SP 12345",
  specialty: "Estomaterapia",
  active: true,
};

function buildAppointment(overrides: Partial<PortalAppointmentDto>): PortalAppointmentDto {
  return {
    id: "appt-1",
    startsAt: "2099-01-01T10:00:00.000Z",
    endsAt: "2099-01-01T11:00:00.000Z",
    procedure: "Troca de bolsa",
    status: "scheduled",
    ...overrides,
  };
}

function buildCondition(overrides: Partial<ConditionDto>): ConditionDto {
  return {
    id: "cond-1",
    patientId: "pat-1",
    kind: "wound",
    title: "Ferida perna E",
    stomaType: null,
    startedAt: "2026-01-01T00:00:00.000Z",
    notes: null,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildAssessment(overrides: Partial<AssessmentDto>): AssessmentDto {
  return {
    id: "assess-1",
    conditionId: "cond-1",
    lengthMm: null,
    widthMm: null,
    depthMm: null,
    areaMm2: null,
    tissueType: null,
    exudate: null,
    painScale: null,
    skinCondition: null,
    complications: null,
    complicationCodes: [],
    detScore: null,
    pushScore: null,
    notes: null,
    createdAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

const emptyPatientBundle = {
  patient: patientFixture,
  appointments: [] as PortalAppointmentDto[],
  conditions: [] as ConditionWithAssessmentsDto[],
  invoices: [] as InvoiceDto[],
  followUps: [] as FollowUpDto[],
};

describe("Feature: Página do portal", () => {
  describe("Cenário: carregando sessão", () => {
    it("Dado que a sessão ainda não chegou, Quando renderizar, Então exibe indicador de carregamento", () => {
      mockFetch([{ path: "/api/portal/me", respond: () => jsonResponse(true, { subject: "x", role: "admin" }) }]);

      render(<PortalPage />);

      expect(screen.getByText("Carregando…")).toBeInTheDocument();
    });
  });

  describe("Cenário: erro ao carregar sessão", () => {
    it("Dado falha na API de sessão, Quando renderizar, Então exibe alerta de erro", async () => {
      mockFetch([{ path: "/api/portal/me", respond: () => jsonResponse(false, null, "Sessão expirada") }]);

      render(<PortalPage />);

      expect(await screen.findByText("Sessão expirada")).toBeInTheDocument();
    });
  });

  describe("Cenário: sessão da equipe da clínica", () => {
    it("Dado role admin, Quando renderizar, Então exibe mensagem de equipe e link para o sistema", async () => {
      mockFetch([
        {
          path: "/api/portal/me",
          respond: () => jsonResponse(true, { subject: "ana@clinica.com", role: "admin" }),
        },
      ]);

      render(<PortalPage />);

      expect(
        await screen.findByText((_, el) => el?.textContent === "Você está logado como equipe da clínica (ana@clinica.com)."),
      ).toBeInTheDocument();
      const link = screen.getByText("Ir para o sistema da clínica →");
      expect(link.closest("a")).toHaveAttribute("href", "/");
    });
  });

  describe("Cenário: sessão de paciente", () => {
    it("Dado role patient, Quando renderizar, Então exibe a visão do paciente", async () => {
      mockFetch([
        { path: "/api/portal/me", respond: () => jsonResponse(true, { subject: "pat-1", role: "patient" }) },
        { path: "/api/portal/patient/consent", respond: () => jsonResponse(true, { consentText: "Termo", accepted: true, acceptedAt: null }) },
        { path: "/api/portal/patient", respond: () => jsonResponse(true, emptyPatientBundle) },
      ]);

      render(<PortalPage />);

      expect(await screen.findByRole("heading", { name: "Olá, Ana!" })).toBeInTheDocument();
    });
  });

  describe("Cenário: sessão de parceiro", () => {
    it("Dado role partner, Quando renderizar, Então exibe a visão do parceiro", async () => {
      mockFetch([
        { path: "/api/portal/me", respond: () => jsonResponse(true, { subject: "partner-1", role: "partner" }) },
        {
          path: "/api/portal/partner",
          respond: () => jsonResponse(true, { partner: partnerFixture, referredPatients: [] }),
        },
      ]);

      render(<PortalPage />);

      expect(await screen.findByRole("heading", { name: "Dr. Carlos Lima" })).toBeInTheDocument();
    });
  });
});

describe("Feature: Visão do paciente no portal", () => {
  describe("Cenário: carregando", () => {
    it("Dado que os dados ainda não chegaram, Quando renderizar, Então exibe indicador de carregamento", () => {
      mockFetch([{ path: "/api/portal/patient", respond: () => jsonResponse(true, emptyPatientBundle) }]);

      render(<PatientPortalView />);

      expect(screen.getByText("Carregando…")).toBeInTheDocument();
    });
  });

  describe("Cenário: erro ao carregar dados do paciente", () => {
    it("Dado falha na API, Quando renderizar, Então exibe alerta de erro", async () => {
      mockFetch([{ path: "/api/portal/patient", respond: () => jsonResponse(false, null, "Erro ao buscar paciente") }]);

      render(<PatientPortalView />);

      expect(await screen.findByText("Erro ao buscar paciente")).toBeInTheDocument();
    });
  });

  describe("Cenário: sem consultas, condições, retornos ou faturas", () => {
    it("Dado paciente sem dados relacionados, Quando renderizar, Então exibe estados vazios em cada seção", async () => {
      mockFetch([
        { path: "/api/portal/patient/consent", respond: () => jsonResponse(true, { consentText: "Termo", accepted: true, acceptedAt: null }) },
        { path: "/api/portal/patient", respond: () => jsonResponse(true, emptyPatientBundle) },
      ]);

      render(<PatientPortalView />);

      expect(await screen.findByText("Nenhuma consulta agendada. Entre em contato com a clínica para agendar.")).toBeInTheDocument();
      expect(screen.queryByText("Retornos recomendados")).not.toBeInTheDocument();
      expect(screen.getByText("Nenhuma condição em acompanhamento.")).toBeInTheDocument();
      expect(screen.getByText("Sem consultas anteriores.")).toBeInTheDocument();
      expect(screen.getByText("Nenhuma fatura.")).toBeInTheDocument();
    });
  });

  describe("Cenário: consulta futura pendente de confirmação", () => {
    it("Dado consulta agendada futura, Quando confirmar presença, Então chama a API e atualiza a lista", async () => {
      let status = "scheduled";
      mockFetch([
        { path: "/api/portal/patient/consent", respond: () => jsonResponse(true, { consentText: "Termo", accepted: true, acceptedAt: null }) },
        {
          method: "POST",
          path: "/api/portal/patient/appointments/appt-1/confirm",
          respond: () => {
            status = "confirmed";
            return jsonResponse(true, { ok: true });
          },
        },
        {
          path: "/api/portal/patient",
          respond: () =>
            jsonResponse(true, {
              ...emptyPatientBundle,
              appointments: [buildAppointment({ status })],
            }),
        },
      ]);

      render(<PatientPortalView />);

      const confirmButton = await screen.findByText("Confirmar presença");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText("Confirmar presença")).not.toBeInTheDocument();
      });
      expect(screen.getByText("Confirmada")).toBeInTheDocument();
    });

    it("Dado falha ao confirmar presença, Quando confirmar, Então exibe alerta de erro", async () => {
      mockFetch([
        { path: "/api/portal/patient/consent", respond: () => jsonResponse(true, { consentText: "Termo", accepted: true, acceptedAt: null }) },
        {
          method: "POST",
          path: "/api/portal/patient/appointments/appt-1/confirm",
          respond: () => jsonResponse(false, null, "Consulta já foi cancelada"),
        },
        {
          path: "/api/portal/patient",
          respond: () =>
            jsonResponse(true, {
              ...emptyPatientBundle,
              appointments: [buildAppointment({ status: "scheduled" })],
            }),
        },
      ]);

      render(<PatientPortalView />);

      const confirmButton = await screen.findByText("Confirmar presença");
      fireEvent.click(confirmButton);

      expect(await screen.findByText("Consulta já foi cancelada")).toBeInTheDocument();
    });
  });

  describe("Cenário: consulta futura cancelada", () => {
    it("Dado consulta futura com status cancelado, Quando renderizar, Então aparece no histórico e não nas próximas consultas", async () => {
      mockFetch([
        { path: "/api/portal/patient/consent", respond: () => jsonResponse(true, { consentText: "Termo", accepted: true, acceptedAt: null }) },
        {
          path: "/api/portal/patient",
          respond: () =>
            jsonResponse(true, {
              ...emptyPatientBundle,
              appointments: [buildAppointment({ id: "appt-2", status: "cancelled" })],
            }),
        },
      ]);

      render(<PatientPortalView />);

      expect(await screen.findByText("Nenhuma consulta agendada. Entre em contato com a clínica para agendar.")).toBeInTheDocument();
      expect(screen.getByText("Cancelada")).toBeInTheDocument();
      expect(screen.queryByText("Sem consultas anteriores.")).not.toBeInTheDocument();
    });
  });

  describe("Cenário: retornos recomendados", () => {
    it("Dado retornos pendentes, Quando renderizar, Então exibe o motivo e a data limite", async () => {
      const followUp: FollowUpDto = {
        id: "fu-1",
        patientId: "pat-1",
        appointmentId: null,
        dueDate: "2099-02-01T00:00:00.000Z",
        reason: "Retorno para avaliação de ferida",
        status: "pending",
      };
      mockFetch([
        { path: "/api/portal/patient/consent", respond: () => jsonResponse(true, { consentText: "Termo", accepted: true, acceptedAt: null }) },
        {
          path: "/api/portal/patient",
          respond: () => jsonResponse(true, { ...emptyPatientBundle, followUps: [followUp] }),
        },
      ]);

      render(<PatientPortalView />);

      expect(await screen.findByText("Retornos recomendados")).toBeInTheDocument();
      expect(screen.getByText(/Retorno para avaliação de ferida/)).toBeInTheDocument();
      expect(screen.getByText(formatDate(followUp.dueDate))).toBeInTheDocument();
    });
  });

  describe("Cenário: condições em acompanhamento", () => {
    it("Dado condição ativa, Quando renderizar, Então exibe o upload de foto; dado condição resolvida, não exibe", async () => {
      const activeCondition: ConditionWithAssessmentsDto = {
        condition: buildCondition({ id: "cond-active", status: "active" }),
        assessments: [],
      };
      const resolvedCondition: ConditionWithAssessmentsDto = {
        condition: buildCondition({ id: "cond-resolved", status: "resolved", title: "Estomia resolvida" }),
        assessments: [],
      };
      mockFetch([
        { path: "/api/portal/patient/consent", respond: () => jsonResponse(true, { consentText: "Termo", accepted: true, acceptedAt: null }) },
        {
          path: "/api/portal/patient",
          respond: () =>
            jsonResponse(true, { ...emptyPatientBundle, conditions: [activeCondition, resolvedCondition] }),
        },
      ]);

      render(<PatientPortalView />);

      await screen.findByText("Ferida perna E");
      expect(screen.getByText("Estomia resolvida")).toBeInTheDocument();
      expect(screen.getAllByText("Enviar foto")).toHaveLength(1);
      expect(screen.getByText("Em acompanhamento")).toBeInTheDocument();
      expect(screen.getByText("Resolvida")).toBeInTheDocument();
    });
  });

  describe("Cenário: faturas do paciente", () => {
    it("Dado fatura pendente, Quando renderizar, Então exibe descrição, valor e status", async () => {
      const invoice: InvoiceDto = {
        id: "inv-1",
        patientId: "pat-1",
        appointmentId: null,
        description: "Troca de bolsa de colostomia",
        amountCents: 15000,
        status: "pending",
        issuedAt: "2026-01-05T00:00:00.000Z",
        dueDate: null,
        paidAt: null,
        paymentMethod: null,
      };
      mockFetch([
        { path: "/api/portal/patient/consent", respond: () => jsonResponse(true, { consentText: "Termo", accepted: true, acceptedAt: null }) },
        {
          path: "/api/portal/patient",
          respond: () => jsonResponse(true, { ...emptyPatientBundle, invoices: [invoice] }),
        },
      ]);

      render(<PatientPortalView />);

      expect(await screen.findByText("Troca de bolsa de colostomia")).toBeInTheDocument();
      expect(screen.getByText("R$ 150,00")).toBeInTheDocument();
      expect(screen.getByText("Pendente")).toBeInTheDocument();
    });
  });

  describe("Cenário: histórico de consultas passadas", () => {
    it("Dado consulta concluída no passado, Quando renderizar, Então aparece no histórico sem botão de confirmação", async () => {
      const pastAppointment = buildAppointment({
        id: "appt-past",
        startsAt: "2000-01-01T10:00:00.000Z",
        endsAt: "2000-01-01T11:00:00.000Z",
        status: "completed",
      });
      mockFetch([
        { path: "/api/portal/patient/consent", respond: () => jsonResponse(true, { consentText: "Termo", accepted: true, acceptedAt: null }) },
        {
          path: "/api/portal/patient",
          respond: () => jsonResponse(true, { ...emptyPatientBundle, appointments: [pastAppointment] }),
        },
      ]);

      render(<PatientPortalView />);

      expect(await screen.findByText(formatDateTime(pastAppointment.startsAt))).toBeInTheDocument();
      expect(screen.queryByText("Confirmar presença")).not.toBeInTheDocument();
      expect(screen.getByText("Concluída")).toBeInTheDocument();
    });
  });
});

describe("Feature: Visão do parceiro no portal", () => {
  describe("Cenário: carregando", () => {
    it("Dado que os dados ainda não chegaram, Quando renderizar, Então exibe indicador de carregamento", () => {
      mockFetch([
        { path: "/api/portal/partner", respond: () => jsonResponse(true, { partner: partnerFixture, referredPatients: [] }) },
      ]);

      render(<PartnerPortalView />);

      expect(screen.getByText("Carregando…")).toBeInTheDocument();
    });
  });

  describe("Cenário: erro ao carregar dados", () => {
    it("Dado falha na API, Quando renderizar, Então exibe alerta de erro", async () => {
      mockFetch([{ path: "/api/portal/partner", respond: () => jsonResponse(false, null, "Erro ao buscar dados do parceiro") }]);

      render(<PartnerPortalView />);

      expect(await screen.findByText("Erro ao buscar dados do parceiro")).toBeInTheDocument();
    });
  });

  describe("Cenário: sem pacientes indicados", () => {
    it("Dado parceiro sem indicações, Quando renderizar, Então exibe estado vazio", async () => {
      mockFetch([
        { path: "/api/portal/partner", respond: () => jsonResponse(true, { partner: partnerFixture, referredPatients: [] }) },
      ]);

      render(<PartnerPortalView />);

      expect(await screen.findByText("Nenhum paciente indicado por você até o momento.")).toBeInTheDocument();
      expect(screen.getByText(/CRM-SP 12345/)).toBeInTheDocument();
      expect(screen.getByText(/Estomaterapia/)).toBeInTheDocument();
    });
  });

  describe("Cenário: pacientes indicados com evolução", () => {
    it("Dado paciente indicado, Quando expandir, Então exibe consultas e condições sem fotos", async () => {
      const referredPatient: ReferredPatientSummaryDto = { id: "ref-pat-1", fullName: "João Pereira" };
      const appointment = buildAppointment({ id: "appt-ref-1" });
      const conditionEntry: ConditionWithAssessmentsDto = {
        condition: buildCondition({ id: "cond-ref-1", title: "Ferida sacral" }),
        assessments: [],
        photos: [
          {
            id: "photo-1",
            conditionId: "cond-ref-1",
            assessmentId: null,
            contentType: "image/jpeg",
            sizeBytes: 1000,
            origin: "patient",
            patientNote: null,
            triageStatus: null,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
      mockFetch([
        {
          path: "/api/portal/partner",
          respond: () =>
            jsonResponse(true, {
              partner: partnerFixture,
              referredPatients: [
                { patient: referredPatient, appointments: [appointment], conditions: [conditionEntry] },
              ],
            }),
        },
      ]);

      render(<PartnerPortalView />);

      expect(await screen.findByText("João Pereira")).toBeInTheDocument();
      expect(screen.getByText("1 consulta(s) · 1 condição(ões) em acompanhamento")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Ver evolução"));

      expect(screen.getByText("Ocultar")).toBeInTheDocument();
      expect(screen.getByText(/Troca de bolsa/)).toBeInTheDocument();
      expect(screen.getByText("Ferida sacral")).toBeInTheDocument();
      // Minimização LGPD: parceiro não recebe fotos, mesmo que a condição as tenha.
      expect(screen.queryByRole("img", { name: /Foto da condição/ })).not.toBeInTheDocument();
    });

    it("Dado paciente indicado sem consultas nem condições, Quando expandir, Então exibe estados vazios", async () => {
      const referredPatient: ReferredPatientSummaryDto = { id: "ref-pat-2", fullName: "Maria Alves" };
      mockFetch([
        {
          path: "/api/portal/partner",
          respond: () =>
            jsonResponse(true, {
              partner: partnerFixture,
              referredPatients: [{ patient: referredPatient, appointments: [], conditions: [] }],
            }),
        },
      ]);

      render(<PartnerPortalView />);

      fireEvent.click(await screen.findByText("Ver evolução"));

      expect(screen.getByText("Nenhuma consulta.")).toBeInTheDocument();
      expect(screen.getByText("Nenhuma condição registrada.")).toBeInTheDocument();
    });
  });
});

describe("Feature: Cartão de consentimento", () => {
  describe("Cenário: carregando", () => {
    it("Dado que o status ainda não chegou, Quando renderizar, Então não exibe nada", () => {
      mockFetch([
        { path: "/api/portal/patient/consent", respond: () => jsonResponse(true, { consentText: "Termo", accepted: false, acceptedAt: null }) },
      ]);

      const { container } = render(<ConsentCard />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Cenário: termo já aceito", () => {
    it("Dado consentimento aceito, Quando renderizar, Então exibe confirmação com data", async () => {
      mockFetch([
        {
          path: "/api/portal/patient/consent",
          respond: () =>
            jsonResponse(true, {
              consentText: "Termo vigente",
              accepted: true,
              acceptedAt: "2026-01-10T14:30:00.000Z",
            }),
        },
      ]);

      render(<ConsentCard />);

      expect(
        await screen.findByText(`✓ Termo de consentimento aceito em ${formatDateTime("2026-01-10T14:30:00.000Z")}.`),
      ).toBeInTheDocument();
    });
  });

  describe("Cenário: termo pendente de aceite", () => {
    it("Dado consentimento pendente, Quando aceitar, Então registra o aceite e atualiza a tela", async () => {
      let accepted = false;
      mockFetch([
        {
          method: "POST",
          path: "/api/portal/patient/consent",
          respond: () => {
            accepted = true;
            return jsonResponse(true, { ok: true });
          },
        },
        {
          path: "/api/portal/patient/consent",
          respond: () =>
            jsonResponse(true, {
              consentText: "Texto do termo de consentimento",
              accepted,
              acceptedAt: accepted ? "2026-02-01T09:00:00.000Z" : null,
            }),
        },
      ]);

      render(<ConsentCard />);

      expect(await screen.findByText("Termo de consentimento pendente")).toBeInTheDocument();
      expect(screen.getByText("Texto do termo de consentimento")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Li e aceito o termo"));

      expect(
        await screen.findByText(`✓ Termo de consentimento aceito em ${formatDateTime("2026-02-01T09:00:00.000Z")}.`),
      ).toBeInTheDocument();
    });

    it("Dado falha ao registrar aceite, Quando aceitar, Então exibe alerta de erro e reabilita o botão", async () => {
      mockFetch([
        {
          method: "POST",
          path: "/api/portal/patient/consent",
          respond: () => jsonResponse(false, null, "Erro ao registrar aceite do termo"),
        },
        {
          path: "/api/portal/patient/consent",
          respond: () => jsonResponse(true, { consentText: "Texto do termo", accepted: false, acceptedAt: null }),
        },
      ]);

      render(<ConsentCard />);

      const button = await screen.findByText("Li e aceito o termo");
      fireEvent.click(button);

      expect(await screen.findByText("Erro ao registrar aceite do termo")).toBeInTheDocument();
      const enabledButton = screen.getByText("Li e aceito o termo") as HTMLButtonElement;
      expect(enabledButton.disabled).toBe(false);
    });
  });
});

describe("Feature: Envio de foto pelo paciente", () => {
  function makeFile(name = "foto.png"): File {
    return new File(["conteudo"], name, { type: "image/png" });
  }

  describe("Cenário: envio de foto com sucesso", () => {
    it("Dado arquivo selecionado com observação, Quando enviar, Então chama a API e notifica o pai", async () => {
      const onSent = vi.fn();
      let receivedBody: FormData | null = null;
      mockFetch([
        {
          method: "POST",
          path: "/api/portal/patient/photos",
          respond: () => rawResponse(true),
        },
      ]);
      const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        receivedBody = init?.body as FormData;
        return rawResponse(true);
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<PatientPhotoUpload conditionId="cond-1" onSent={onSent} />);

      fireEvent.change(screen.getByPlaceholderText("Observação (opcional): dor, vazamento, vermelhidão…"), {
        target: { value: "Está coçando" },
      });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [makeFile()] } });

      await waitFor(() => {
        expect(onSent).toHaveBeenCalledTimes(1);
      });
      expect(await screen.findByText(/Foto enviada/)).toBeInTheDocument();
      expect(receivedBody).not.toBeNull();
      expect((receivedBody as unknown as FormData).get("conditionId")).toBe("cond-1");
      expect((receivedBody as unknown as FormData).get("note")).toBe("Está coçando");
    });
  });

  describe("Cenário: consentimento pendente", () => {
    it("Dado termo não aceito, Quando renderizar o envio, Então orienta o aceite e não oferece o arquivo (COMP3-01)", async () => {
      mockFetch([
        {
          path: "/api/portal/patient/consent",
          respond: () =>
            jsonResponse(true, { consentText: "Termo", accepted: false, acceptedAt: null }),
        },
      ]);

      render(<PatientPhotoUpload conditionId="cond-1" onSent={vi.fn()} />);

      expect(
        await screen.findByText("Aceite o termo de consentimento acima para enviar fotos à equipe."),
      ).toBeInTheDocument();
      expect(document.querySelector('input[type="file"]')).toBeNull();
    });
  });

  describe("Cenário: falha no envio de foto", () => {
    it("Dado erro retornado pela API, Quando enviar, Então exibe a mensagem de erro", async () => {
      const onSent = vi.fn();
      const fetchMock = vi.fn(async () => rawResponse(false, { error: "Arquivo muito grande" }));
      vi.stubGlobal("fetch", fetchMock);

      render(<PatientPhotoUpload conditionId="cond-1" onSent={onSent} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [makeFile()] } });

      expect(await screen.findByText("Arquivo muito grande")).toBeInTheDocument();
      expect(onSent).not.toHaveBeenCalled();
    });
  });
});

describe("Feature: Evolução clínica da condição", () => {
  describe("Cenário: condição sem avaliações", () => {
    it("Dado nenhuma avaliação registrada, Quando renderizar, Então exibe mensagem informativa", () => {
      const entry: ConditionWithAssessmentsDto = {
        condition: buildCondition({}),
        assessments: [],
      };

      render(<ConditionProgress {...entry} />);

      expect(screen.getByText("Nenhuma avaliação registrada ainda.")).toBeInTheDocument();
    });
  });

  describe("Cenário: condição de estomia com tipo definido", () => {
    it("Dado condição de estomia, Quando renderizar, Então exibe o rótulo do tipo de estomia", () => {
      const entry: ConditionWithAssessmentsDto = {
        condition: buildCondition({ kind: "stoma", stomaType: "colostomia", title: "Estomia abdominal" }),
        assessments: [],
      };

      render(<ConditionProgress {...entry} />);

      expect(screen.getByText("Estomia abdominal")).toBeInTheDocument();
      expect(screen.getByText("Estomia · Colostomia")).toBeInTheDocument();
    });
  });

  describe("Cenário: avaliação única (sem pontos suficientes para o gráfico)", () => {
    it("Dado uma única avaliação com área medida, Quando renderizar, Então exibe orientação em vez do gráfico", () => {
      const entry: ConditionWithAssessmentsDto = {
        condition: buildCondition({}),
        assessments: [buildAssessment({ areaMm2: 50 })],
      };

      render(<ConditionProgress {...entry} />);

      expect(
        screen.getByText("Registre medidas (C×L) ou dor em pelo menos duas avaliações para acompanhar a tendência."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: "Gráfico de evolução da condição" })).not.toBeInTheDocument();
    });
  });

  describe("Cenário: duas avaliações com área medida", () => {
    it("Dado duas avaliações com área, Quando renderizar, Então exibe o gráfico de evolução", () => {
      const entry: ConditionWithAssessmentsDto = {
        condition: buildCondition({}),
        assessments: [
          buildAssessment({ id: "a1", areaMm2: 80, createdAt: "2026-01-01T00:00:00.000Z" }),
          buildAssessment({ id: "a2", areaMm2: 40, createdAt: "2026-01-10T00:00:00.000Z" }),
        ],
      };

      render(<ConditionProgress {...entry} />);

      expect(screen.getByRole("img", { name: "Gráfico de evolução da condição" })).toBeInTheDocument();
      expect(screen.getByText(/Área reduziu 50% desde a primeira medição/)).toBeInTheDocument();
    });
  });

  describe("Cenário: descrição completa de uma avaliação", () => {
    it("Dado avaliação com todos os campos, Quando renderizar, Então exibe a descrição combinada", () => {
      const assessment = buildAssessment({
        lengthMm: 10,
        widthMm: 5,
        areaMm2: 50,
        tissueType: "granulação",
        exudate: "moderate",
        painScale: 3,
        skinCondition: "íntegra",
        complications: "nenhuma",
        notes: "observação extra",
      });
      const entry: ConditionWithAssessmentsDto = {
        condition: buildCondition({}),
        assessments: [assessment],
      };

      render(<ConditionProgress {...entry} />);

      expect(
        screen.getByText(
          "ferida 10×5mm (área 50mm²) · tecido: granulação · exsudato: Moderado · dor 3/10 · pele periestomal: íntegra · complicações: nenhuma · observação extra",
        ),
      ).toBeInTheDocument();
    });

    it("Dado avaliação sem nenhum campo preenchido, Quando renderizar, Então exibe o texto padrão", () => {
      const entry: ConditionWithAssessmentsDto = {
        condition: buildCondition({}),
        assessments: [buildAssessment({})],
      };

      render(<ConditionProgress {...entry} />);

      expect(screen.getByText("Avaliação registrada")).toBeInTheDocument();
    });
  });

  describe("Cenário: galeria de fotos", () => {
    it("Dado fotos e base de URL autorizada, Quando renderizar, Então exibe as imagens", () => {
      const photo: ConditionPhotoDto = {
        id: "photo-1",
        conditionId: "cond-1",
        assessmentId: null,
        contentType: "image/jpeg",
        sizeBytes: 2000,
        origin: "patient",
        patientNote: null,
        triageStatus: null,
        createdAt: "2026-03-01T00:00:00.000Z",
      };
      const entry: ConditionWithAssessmentsDto = {
        condition: buildCondition({}),
        assessments: [],
        photos: [photo],
        photoUrlBase: "/api/portal/patient/photos",
      };

      render(<ConditionProgress {...entry} />);

      const image = screen.getByAltText(`Foto da condição em ${formatDate(photo.createdAt)}`) as HTMLImageElement;
      expect(image).toHaveAttribute("src", "/api/portal/patient/photos/photo-1");
    });

    it("Dado fotos sem base de URL autorizada, Quando renderizar, Então não exibe a galeria", () => {
      const photo: ConditionPhotoDto = {
        id: "photo-1",
        conditionId: "cond-1",
        assessmentId: null,
        contentType: "image/jpeg",
        sizeBytes: 2000,
        origin: "patient",
        patientNote: null,
        triageStatus: null,
        createdAt: "2026-03-01T00:00:00.000Z",
      };
      const entry: ConditionWithAssessmentsDto = {
        condition: buildCondition({}),
        assessments: [],
        photos: [photo],
      };

      render(<ConditionProgress {...entry} />);

      expect(screen.queryByAltText(/Foto da condição/)).not.toBeInTheDocument();
    });
  });
});
