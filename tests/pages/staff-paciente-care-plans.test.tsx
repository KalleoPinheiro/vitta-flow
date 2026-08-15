// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import type {
  CarePlanDetailDto,
  CarePlanDto,
  ConditionDto,
  NursingDiagnosisDto,
  NursingInterventionDto,
  NursingOutcomeDto,
  PatientDto,
} from "@/lib/dto";
import type { CarePlanDiagnosisType } from "@/domain/clinical/care-plan-diagnosis";
import type { InterventionPriority } from "@/domain/clinical/care-plan-intervention";
import PatientRecordPage from "@/app/(staff)/pacientes/[id]/page";

interface FetchCall {
  url: string;
  init?: RequestInit;
}
type MockedResponse = { ok: boolean; json: () => Promise<unknown> };

const jsonResponse = (data: unknown, ok = true): MockedResponse => ({
  ok,
  json: async () => ({ success: ok, data, error: ok ? null : "Erro" }),
});

const errorResponse = (message: string): MockedResponse => ({
  ok: false,
  json: async () => ({ success: false, data: null, error: message }),
});

const mockFetch = (router: (call: FetchCall) => MockedResponse | Promise<MockedResponse>) => {
  const fn = vi.fn(async (url: string, init?: RequestInit) => router({ url, init }));
  vi.stubGlobal("fetch", fn);
  return fn;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

async function renderDetail(id = "pac-1") {
  await act(async () => {
    render(<PatientRecordPage params={Promise.resolve({ id })} />);
  });
}

const patient: PatientDto = {
  id: "pac-1",
  fullName: "Maria Souza",
  email: "maria@example.com",
  phone: "11988887777",
  birthDate: null,
  notes: null,
  referredByPartnerId: null,
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const woundCondition: ConditionDto = {
  id: "cond-1",
  patientId: "pac-1",
  kind: "wound",
  title: "Úlcera venosa perna E",
  stomaType: null,
  startedAt: null,
  notes: null,
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const diagnosisCatalog: NursingDiagnosisDto = {
  code: "00046",
  label: "Integridade da pele prejudicada",
  domain: "Domínio 11",
  class: "Classe 2",
  definition: null,
  edition: "NANDA-I 2021-2023",
};

const outcomeCatalog: NursingOutcomeDto = {
  code: "1101",
  label: "Integridade tissular: pele e mucosas",
  domain: "Saúde fisiológica",
  class: "Integridade tissular",
  edition: "NOC 6ª ed.",
  scaleAnchors: [
    "Gravemente comprometido",
    "Substancialmente comprometido",
    "Moderadamente comprometido",
    "Levemente comprometido",
    "Não comprometido",
  ],
};

const interventionCatalog: NursingInterventionDto = {
  code: "3660",
  label: "Cuidados com lesões",
  domain: "Fisiológico: básico",
  class: "Controle de pele/lesão",
  edition: "NIC 7ª ed.",
};

interface CarePlanServerState {
  plans: CarePlanDto[];
  details: Map<string, CarePlanDetailDto>;
  nextId: (prefix: string) => string;
}

function handleStaticPatientRoutes(url: string): MockedResponse | undefined {
  if (url === "/api/patients/pac-1") return jsonResponse(patient);
  if (url === "/api/patients/pac-1/anamnesis") return jsonResponse(null);
  if (url === "/api/patients/pac-1/conditions") return jsonResponse([woundCondition]);
  if (url === "/api/patients/pac-1/evolutions") return jsonResponse([]);
  return undefined;
}

function handleCarePlansListRoute(
  url: string,
  method: string,
  body: Record<string, unknown>,
  state: CarePlanServerState,
): MockedResponse | undefined {
  if (url !== "/api/patients/pac-1/care-plans") return undefined;
  if (method === "GET") return jsonResponse(state.plans);
  const plan: CarePlanDto = {
    id: state.nextId("plan"),
    patientId: "pac-1",
    conditionId: (body.conditionId as string | null) ?? null,
    professionalId: null,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  state.plans = [...state.plans, plan];
  state.details.set(plan.id, { plan, diagnoses: [], outcomes: [], interventions: [] });
  return jsonResponse(plan);
}

function handleCarePlanByIdRoute(
  url: string,
  method: string,
  state: CarePlanServerState,
): MockedResponse | undefined {
  const match = /^\/api\/care-plans\/([^/]+)$/.exec(url);
  if (!match) return undefined;
  if (method === "GET") return jsonResponse(state.details.get(match[1]));
  const detail = state.details.get(match[1]);
  if (!detail) return errorResponse("Plano de cuidados não encontrado");
  detail.plan = { ...detail.plan, status: "resolved" };
  state.plans = state.plans.map((p) => (p.id === detail.plan.id ? detail.plan : p));
  return jsonResponse(detail.plan);
}

function handleDiagnosesRoute(
  url: string,
  method: string,
  body: Record<string, unknown>,
  state: CarePlanServerState,
): MockedResponse | undefined {
  const match = /^\/api\/care-plans\/([^/]+)\/diagnoses$/.exec(url);
  if (!match || method !== "POST") return undefined;
  if (body.type === "risco" && body.definingCharacteristics) {
    return errorResponse("Diagnóstico de risco não tem características definidoras");
  }
  const detail = state.details.get(match[1]);
  if (!detail) return errorResponse("Plano de cuidados não encontrado");
  const diagnosis = {
    id: state.nextId("diag"),
    carePlanId: match[1],
    diagnosisCode: body.diagnosisCode as string,
    diagnosisLabel: diagnosisCatalog.label,
    type: body.type as CarePlanDiagnosisType,
    relatedFactors: (body.relatedFactors as string | null) ?? null,
    definingCharacteristics: (body.definingCharacteristics as string | null) ?? null,
    createdAt: new Date().toISOString(),
  };
  detail.diagnoses = [...detail.diagnoses, diagnosis];
  return jsonResponse(diagnosis);
}

function handleOutcomesRoute(
  url: string,
  method: string,
  body: Record<string, unknown>,
  state: CarePlanServerState,
): MockedResponse | undefined {
  const match = /^\/api\/care-plans\/([^/]+)\/outcomes$/.exec(url);
  if (!match || method !== "POST") return undefined;
  const detail = state.details.get(match[1]);
  if (!detail) return errorResponse("Plano de cuidados não encontrado");
  const outcome = {
    id: state.nextId("out"),
    carePlanId: match[1],
    outcomeCode: body.outcomeCode as string,
    outcomeLabel: outcomeCatalog.label,
    scaleAnchors: outcomeCatalog.scaleAnchors,
    baselineScore: body.baselineScore as number,
    targetScore: body.targetScore as number,
    deadline: null,
    createdAt: new Date().toISOString(),
    currentScore: null,
    attainment: null,
    isAchieved: null,
    evaluations: [],
  };
  detail.outcomes = [...detail.outcomes, outcome];
  return jsonResponse(outcome);
}

function handleInterventionsRoute(
  url: string,
  method: string,
  body: Record<string, unknown>,
  state: CarePlanServerState,
): MockedResponse | undefined {
  const match = /^\/api\/care-plans\/([^/]+)\/interventions$/.exec(url);
  if (!match || method !== "POST") return undefined;
  const detail = state.details.get(match[1]);
  if (!detail) return errorResponse("Plano de cuidados não encontrado");
  const intervention = {
    id: state.nextId("int"),
    carePlanId: match[1],
    interventionCode: body.interventionCode as string,
    interventionLabel: interventionCatalog.label,
    frequency: body.frequency as string,
    priority: body.priority as InterventionPriority,
    createdAt: new Date().toISOString(),
    records: [],
  };
  detail.interventions = [...detail.interventions, intervention];
  return jsonResponse(intervention);
}

function handleEvaluationsRoute(
  url: string,
  method: string,
  body: Record<string, unknown>,
  state: CarePlanServerState,
): MockedResponse | undefined {
  const match = /^\/api\/care-plan-outcomes\/([^/]+)\/evaluations$/.exec(url);
  if (!match || method !== "POST") return undefined;
  const outcomeId = match[1];
  const detail = [...state.details.values()].find((d) => d.outcomes.some((o) => o.id === outcomeId));
  const outcome = detail?.outcomes.find((o) => o.id === outcomeId);
  if (!outcome) return errorResponse("Resultado não encontrado");
  const evaluation = {
    id: state.nextId("eval"),
    outcomeId,
    score: body.score as number,
    professionalId: null,
    notes: (body.notes as string | null) ?? null,
    evaluatedAt: new Date().toISOString(),
  };
  outcome.evaluations = [evaluation, ...outcome.evaluations];
  outcome.currentScore = evaluation.score;
  outcome.attainment = (evaluation.score - outcome.baselineScore) / (outcome.targetScore - outcome.baselineScore);
  outcome.isAchieved = evaluation.score >= outcome.targetScore;
  return jsonResponse(evaluation);
}

function handleRecordsRoute(url: string, method: string, state: CarePlanServerState): MockedResponse | undefined {
  const match = /^\/api\/care-plan-interventions\/([^/]+)\/records$/.exec(url);
  if (!match || method !== "POST") return undefined;
  const interventionId = match[1];
  const detail = [...state.details.values()].find((d) => d.interventions.some((i) => i.id === interventionId));
  const intervention = detail?.interventions.find((i) => i.id === interventionId);
  if (!intervention) return errorResponse("Intervenção não encontrada");
  const record = {
    id: state.nextId("rec"),
    interventionId,
    professionalId: null,
    notes: null,
    performedAt: new Date().toISOString(),
  };
  intervention.records = [record, ...intervention.records];
  return jsonResponse(record);
}

function handleTaxonomySearchRoutes(url: string): MockedResponse | undefined {
  if (/^\/api\/taxonomy\/diagnoses\/[^/]+\/linked-terms$/.test(url)) {
    return jsonResponse({ outcomes: [outcomeCatalog], interventions: [interventionCatalog] });
  }
  const catalogByKind: Record<string, NursingDiagnosisDto | NursingOutcomeDto | NursingInterventionDto> = {
    diagnoses: diagnosisCatalog,
    outcomes: outcomeCatalog,
    interventions: interventionCatalog,
  };
  for (const [kind, catalogItem] of Object.entries(catalogByKind)) {
    if (url.startsWith(`/api/taxonomy/${kind}?q=`)) {
      const term = decodeURIComponent(url.split("q=")[1] ?? "");
      return jsonResponse(term.length >= 2 ? [catalogItem] : []);
    }
  }
  return undefined;
}

/** Backend fake com estado em memória — reflete mutações como a API real faria. */
function createCarePlanServer() {
  let counter = 0;
  const state: CarePlanServerState = {
    plans: [],
    details: new Map(),
    nextId: (prefix: string) => `${prefix}-${(counter += 1)}`,
  };

  return function handle({ url, init }: FetchCall): MockedResponse {
    const method = init?.method ?? "GET";
    const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {};

    const routeHandlers: Array<() => MockedResponse | undefined> = [
      () => handleStaticPatientRoutes(url),
      () => handleCarePlansListRoute(url, method, body, state),
      () => handleCarePlanByIdRoute(url, method, state),
      () => handleDiagnosesRoute(url, method, body, state),
      () => handleOutcomesRoute(url, method, body, state),
      () => handleInterventionsRoute(url, method, body, state),
      () => handleEvaluationsRoute(url, method, body, state),
      () => handleRecordsRoute(url, method, state),
      () => handleTaxonomySearchRoutes(url),
    ];
    for (const routeHandler of routeHandlers) {
      const result = routeHandler();
      if (result) return result;
    }
    return errorResponse(`URL não mapeada no mock: ${method} ${url}`);
  };
}

async function openCarePlanTab() {
  fireEvent.click(screen.getByText(/Plano de Cuidados \(SAE\)/));
}

/**
 * O `<select>` de condição do modal "Novo plano" mantém todas as `<option>`
 * no DOM (mesmo texto do título da condição) enquanto o modal está aberto —
 * aguarda o fechamento antes de buscar o título na lista de planos, evitando
 * casar com a option em vez do card recém-criado.
 */
async function waitForOpenPlanModalToClose() {
  await waitFor(() => expect(screen.queryByText("Novo plano de cuidados")).not.toBeInTheDocument());
}

describe("Feature: Plano de Cuidados (SAE) na página do paciente", () => {
  it("Dado nenhum plano, Quando abrir a aba, Então mostra estado vazio e permite abrir um plano", async () => {
    mockFetch(createCarePlanServer());
    await renderDetail();
    await screen.findByText("Maria Souza");

    await openCarePlanTab();
    expect(await screen.findByText("Nenhum plano de cuidados aberto.")).toBeInTheDocument();

    fireEvent.click(screen.getByText("+ Novo plano"));
    fireEvent.change(screen.getByLabelText("Condição associada"), { target: { value: "cond-1" } });
    fireEvent.click(screen.getByText("Abrir plano"));
    await waitForOpenPlanModalToClose();

    const planTitle = await screen.findByText("Úlcera venosa perna E");
    const planCard = planTitle.closest("li")!;
    expect(within(planCard).getByText("Ativo")).toBeInTheDocument();
  });

  it("Dado plano geral sem condição, Quando abrir, Então rotula como plano geral do paciente", async () => {
    mockFetch(createCarePlanServer());
    await renderDetail();
    await screen.findByText("Maria Souza");
    await openCarePlanTab();

    fireEvent.click(screen.getByText("+ Novo plano"));
    fireEvent.click(screen.getByText("Abrir plano"));

    expect(await screen.findByText("Plano geral do paciente")).toBeInTheDocument();
  });

  it("Dado plano aberto, Quando percorrer o ciclo completo, Então diagnóstico → resultado → intervenção → avaliação refletem no painel", async () => {
    mockFetch(createCarePlanServer());
    await renderDetail();
    await screen.findByText("Maria Souza");
    await openCarePlanTab();

    fireEvent.click(screen.getByText("+ Novo plano"));
    fireEvent.change(screen.getByLabelText("Condição associada"), { target: { value: "cond-1" } });
    fireEvent.click(screen.getByText("Abrir plano"));
    await waitForOpenPlanModalToClose();
    await screen.findByText("Úlcera venosa perna E");

    fireEvent.click(screen.getByText("Ver plano"));
    await screen.findByText("Nenhum diagnóstico prescrito.");

    // Diagnóstico real
    fireEvent.click(screen.getByText("+ Diagnóstico"));
    fireEvent.change(screen.getByLabelText("Buscar diagnóstico (NANDA-I)"), {
      target: { value: "pele" },
    });
    fireEvent.click(await screen.findByText(/Integridade da pele prejudicada/));
    fireEvent.change(screen.getByLabelText("Relacionado a (etiologia)"), {
      target: { value: "Umidade excessiva por exsudato" },
    });
    fireEvent.change(screen.getByLabelText("Evidenciado por (características definidoras)"), {
      target: { value: "Ruptura da epiderme" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prescrever diagnóstico" }));

    expect(
      await screen.findByText(/relacionado a Umidade excessiva por exsudato, evidenciado por Ruptura da epiderme/),
    ).toBeInTheDocument();

    // Resultado NOC — sugestão ligada ao diagnóstico aparece direto
    fireEvent.click(screen.getByText("+ Resultado"));
    fireEvent.click(await screen.findByText(/Integridade tissular: pele e mucosas/));
    fireEvent.click(screen.getByText("Prescrever resultado"));

    await waitFor(() => expect(screen.getByText("Basal 1")).toBeInTheDocument());
    expect(screen.getByText("Atual —")).toBeInTheDocument();

    // Intervenção NIC
    fireEvent.click(screen.getByText("+ Intervenção"));
    fireEvent.click(await screen.findByText(/Cuidados com lesões/));
    fireEvent.change(screen.getByLabelText("Frequência *"), {
      target: { value: "A cada troca de placa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prescrever intervenção" }));

    await screen.findByText(/A cada troca de placa/);

    // Registrar execução
    fireEvent.click(screen.getByText("Registrar execução"));
    await screen.findByText(/Última execução:/);

    // Avaliar resultado — atinge a meta (basal=1, meta=3 por padrão do formulário)
    fireEvent.click(screen.getByText("Avaliar"));
    const anchorLabel = outcomeCatalog.scaleAnchors[2];
    fireEvent.click(await screen.findByText(new RegExp(anchorLabel)));
    fireEvent.click(screen.getByText("Registrar avaliação"));

    await waitFor(() => expect(screen.getByText("Meta atingida")).toBeInTheDocument());

    // Resolver plano — some as ações de prescrição
    fireEvent.click(screen.getByText("Resolver plano"));
    await waitFor(() => expect(screen.getAllByText("Resolvido").length).toBeGreaterThan(0));
    expect(screen.queryByText("+ Diagnóstico")).not.toBeInTheDocument();
    expect(screen.queryByText("Resolver plano")).not.toBeInTheDocument();
  });

  it("Dado diagnóstico de risco, Quando prescrever, Então esconde o campo de evidência", async () => {
    mockFetch(createCarePlanServer());
    await renderDetail();
    await screen.findByText("Maria Souza");
    await openCarePlanTab();

    fireEvent.click(screen.getByText("+ Novo plano"));
    fireEvent.click(screen.getByText("Abrir plano"));
    await screen.findByText("Plano geral do paciente");
    fireEvent.click(screen.getByText("Ver plano"));
    await screen.findByText("Nenhum diagnóstico prescrito.");

    fireEvent.click(screen.getByText("+ Diagnóstico"));
    fireEvent.change(screen.getByLabelText("Buscar diagnóstico (NANDA-I)"), {
      target: { value: "pele" },
    });
    fireEvent.click(await screen.findByText(/Integridade da pele prejudicada/));
    fireEvent.click(screen.getByText("Risco"));

    expect(screen.getByLabelText("Relacionado a (etiologia)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Evidenciado por (características definidoras)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Promoção da saúde"));
    expect(screen.queryByLabelText("Relacionado a (etiologia)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Prescrever diagnóstico" }));
    expect(await screen.findByText(/Integridade da pele prejudicada/)).toBeInTheDocument();
  });

  it("Dado diagnóstico não selecionado, Quando submeter, Então exibe erro de validação do formulário", async () => {
    mockFetch(createCarePlanServer());
    await renderDetail();
    await screen.findByText("Maria Souza");
    await openCarePlanTab();

    fireEvent.click(screen.getByText("+ Novo plano"));
    fireEvent.click(screen.getByText("Abrir plano"));
    await screen.findByText("Plano geral do paciente");
    fireEvent.click(screen.getByText("Ver plano"));
    await screen.findByText("Nenhum diagnóstico prescrito.");

    fireEvent.click(screen.getByText("+ Diagnóstico"));
    fireEvent.click(screen.getByRole("button", { name: "Prescrever diagnóstico" }));

    expect(await screen.findByText("Selecione um diagnóstico do catálogo")).toBeInTheDocument();
  });
});
