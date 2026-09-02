// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, waitFor, cleanup, act } from "@testing-library/react";
import type { ReactElement } from "react";
import type {
  AppointmentDto,
  CarePlanDetailDto,
  ClinicInfoDto,
  ConditionDto,
  PatientDto,
} from "@/lib/dto";
import AttendanceDocumentPage from "@/app/documentos/atestado/[appointmentId]/page";
import PartnerReportPage from "@/app/documentos/relatorio/[conditionId]/page";
import CarePlanDocumentPage from "@/app/documentos/plano-cuidados/[carePlanId]/page";
import ConsentDocumentPage from "@/app/documentos/consentimento/[patientId]/page";
import { renderWithToast } from "@/../tests/support/render-with-toast";

interface FetchCall {
  url: string;
}

const jsonResponse = (data: unknown, ok = true) => ({
  ok,
  json: async () => ({ success: ok, data, error: ok ? null : "não encontrado" }),
});

const mockFetch = (router: (call: FetchCall) => { ok: boolean; json: () => Promise<unknown> }) => {
  const fn = vi.fn(async (url: string) => router({ url }));
  vi.stubGlobal("fetch", fn);
  return fn;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function renderPage(ui: ReactElement) {
  await act(async () => {
    renderWithToast(ui);
  });
}

const CLINIC_INCOMPLETE: ClinicInfoDto = {
  name: "Clínica VittaFlow",
  cnpj: null,
  address: null,
  city: null,
  professionalName: null,
  professionalRegistry: null,
};

const CLINIC_COMPLETE: ClinicInfoDto = {
  name: "Clínica VittaFlow",
  cnpj: "12.345.678/0001-90",
  address: "Rua das Flores, 100",
  city: "São Paulo",
  professionalName: "Enf. Ana",
  professionalRegistry: "COREN-SP 123456",
};

const appointment = (status: string): AppointmentDto => ({
  id: "apt-1",
  patientId: "pat-1",
  patientName: "Maria Souza",
  startsAt: "2026-09-01T13:00:00.000Z",
  endsAt: "2026-09-01T13:30:00.000Z",
  procedure: "Troca de bolsa",
  priceCents: 10000,
  notes: null,
  status,
  professionalId: null,
});

const condition: ConditionDto = {
  id: "cond-1",
  patientId: "pat-1",
  kind: "wound",
  title: "Ferida sacral",
  stomaType: null,
  startedAt: null,
  notes: null,
  status: "active",
  createdAt: "2026-08-01T00:00:00.000Z",
};

const carePlanDetail: CarePlanDetailDto = {
  plan: {
    id: "plan-1",
    patientId: "pat-1",
    conditionId: null,
    professionalId: null,
    status: "active",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  diagnoses: [],
  outcomes: [],
  interventions: [],
};

const patient: PatientDto = {
  id: "pat-1",
  fullName: "Maria Souza",
  email: "maria@example.com",
  phone: "11999999999",
  birthDate: null,
  notes: null,
  active: true,
  referredByPartnerId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("Feature: bloqueio fail-closed de documentos sem dados cadastrais (#62)", () => {
  it("Dado clínica incompleta, Quando abrir o atestado, Então bloqueia com mensagem, não a declaração", async () => {
    mockFetch(({ url }) => {
      if (url.includes("/api/clinic-info")) return jsonResponse(CLINIC_INCOMPLETE);
      return jsonResponse(appointment("completed"));
    });

    await renderPage(<AttendanceDocumentPage params={Promise.resolve({ appointmentId: "apt-1" })} />);

    await waitFor(() =>
      expect(screen.getByText(/sem CNPJ ou responsável técnico/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("heading", { name: "Declaração de Comparecimento" })).not.toBeInTheDocument();
  });

  it("Dado clínica completa e consulta concluída, Quando abrir o atestado, Então renderiza a declaração", async () => {
    mockFetch(({ url }) => {
      if (url.includes("/api/clinic-info")) return jsonResponse(CLINIC_COMPLETE);
      return jsonResponse(appointment("completed"));
    });

    await renderPage(<AttendanceDocumentPage params={Promise.resolve({ appointmentId: "apt-1" })} />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Declaração de Comparecimento" })).toBeInTheDocument(),
    );
  });

  it("Dado consulta cancelada, Quando abrir o atestado, Então bloqueia com o status atual", async () => {
    mockFetch(({ url }) => {
      if (url.includes("/api/clinic-info")) return jsonResponse(CLINIC_COMPLETE);
      return jsonResponse(appointment("cancelled"));
    });

    await renderPage(<AttendanceDocumentPage params={Promise.resolve({ appointmentId: "apt-1" })} />);

    await waitFor(() => expect(screen.getByText(/"cancelled"/)).toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Declaração de Comparecimento" })).not.toBeInTheDocument();
  });

  it("Dado consulta com falta registrada, Quando abrir o atestado, Então bloqueia", async () => {
    mockFetch(({ url }) => {
      if (url.includes("/api/clinic-info")) return jsonResponse(CLINIC_COMPLETE);
      return jsonResponse(appointment("no_show"));
    });

    await renderPage(<AttendanceDocumentPage params={Promise.resolve({ appointmentId: "apt-1" })} />);

    await waitFor(() => expect(screen.getByText(/"no_show"/)).toBeInTheDocument());
  });

  it("Dado clínica incompleta, Quando abrir o relatório, Então bloqueia", async () => {
    mockFetch(({ url }) => {
      if (url.includes("/api/clinic-info")) return jsonResponse(CLINIC_INCOMPLETE);
      if (url.includes("/assessments")) return jsonResponse([]);
      return jsonResponse(condition);
    });

    await renderPage(<PartnerReportPage params={Promise.resolve({ conditionId: "cond-1" })} />);

    await waitFor(() =>
      expect(screen.getByText(/sem CNPJ ou responsável técnico/i)).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("heading", { name: "Relatório de Evolução Clínica" }),
    ).not.toBeInTheDocument();
  });

  it("Dado clínica completa, Quando abrir o relatório, Então renderiza normalmente", async () => {
    mockFetch(({ url }) => {
      if (url.includes("/api/clinic-info")) return jsonResponse(CLINIC_COMPLETE);
      if (url.includes("/assessments")) return jsonResponse([]);
      return jsonResponse(condition);
    });

    await renderPage(<PartnerReportPage params={Promise.resolve({ conditionId: "cond-1" })} />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Relatório de Evolução Clínica" })).toBeInTheDocument(),
    );
  });

  it("Dado clínica incompleta, Quando abrir o plano de cuidados, Então bloqueia", async () => {
    mockFetch(({ url }) => {
      if (url.includes("/api/clinic-info")) return jsonResponse(CLINIC_INCOMPLETE);
      return jsonResponse(carePlanDetail);
    });

    await renderPage(<CarePlanDocumentPage params={Promise.resolve({ carePlanId: "plan-1" })} />);

    await waitFor(() =>
      expect(screen.getByText(/sem CNPJ ou responsável técnico/i)).toBeInTheDocument(),
    );
  });

  it("Dado clínica completa, Quando abrir o plano de cuidados, Então renderiza normalmente", async () => {
    mockFetch(({ url }) => {
      if (url.includes("/api/clinic-info")) return jsonResponse(CLINIC_COMPLETE);
      if (url.includes("/api/patients/")) return jsonResponse(patient);
      return jsonResponse(carePlanDetail);
    });

    await renderPage(<CarePlanDocumentPage params={Promise.resolve({ carePlanId: "plan-1" })} />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Plano de Cuidados de Enfermagem (SAE)" }),
      ).toBeInTheDocument(),
    );
  });

  it("Dado clínica incompleta, Quando abrir o consentimento, Então renderiza normalmente (fora do escopo do bloqueio)", async () => {
    mockFetch(({ url }) => {
      if (url.includes("/api/clinic-info")) return jsonResponse(CLINIC_INCOMPLETE);
      return jsonResponse(patient);
    });

    await renderPage(<ConsentDocumentPage params={Promise.resolve({ patientId: "pat-1" })} />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Termo de Consentimento Livre e Esclarecido" }),
      ).toBeInTheDocument(),
    );
  });
});
