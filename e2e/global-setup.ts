import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ADMIN_STORAGE_STATE_PATH,
  E2E_AUTH_PASSWORD,
  MAIN_BASE_URL,
  SEED_DATA_PATH,
  SESSION_COOKIE_NAME,
} from "./support/constants";

/**
 * Roda uma vez antes de toda a suíte (depois que o(s) `webServer` já respondem —
 * Playwright só chama `globalSetup` após a checagem de `url` do webServer passar).
 *
 * 1. Loga como admin (senha mestre) no servidor principal e salva o cookie de
 *    sessão como `storageState` — reaproveitado por padrão em todos os specs
 *    (ver `use.storageState` em `playwright.config.ts`).
 * 2. Semeia dados base via REST (profissional, procedimentos com kit, insumos
 *    com lote) e grava os IDs em `e2e/support/seed-data.json` para os specs.
 */

interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

async function post<T>(cookie: string | null, url: string, data: unknown): Promise<T> {
  const response = await fetch(`${MAIN_BASE_URL}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(data),
  });
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || !body.success || body.data === null) {
    throw new Error(`Seed POST ${url} falhou (${response.status}): ${body.error ?? "?"}`);
  }
  return body.data;
}

async function put<T>(cookie: string, url: string, data: unknown): Promise<T> {
  const response = await fetch(`${MAIN_BASE_URL}${url}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(data),
  });
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || !body.success || body.data === null) {
    throw new Error(`Seed PUT ${url} falhou (${response.status}): ${body.error ?? "?"}`);
  }
  return body.data;
}

async function loginAsAdmin(): Promise<string> {
  const response = await fetch(`${MAIN_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: E2E_AUTH_PASSWORD }),
  });
  const body = (await response.json()) as Envelope<{ ok: boolean }>;
  if (!response.ok || !body.success) {
    throw new Error(
      `Login mestre falhou no global-setup (${response.status}): ${body.error ?? "?"}. ` +
        "Verifique se AUTH_SECRET/AUTH_PASSWORD do webServer principal batem com e2e/support/constants.ts.",
    );
  }
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Login mestre não retornou Set-Cookie");
  }
  // Formato: "vitta_session=xxx; Path=/; HttpOnly; SameSite=Lax" — só o par nome=valor interessa.
  const pair = setCookie.split(";")[0];
  if (!pair.startsWith(`${SESSION_COOKIE_NAME}=`)) {
    throw new Error(`Cookie de sessão inesperado: ${pair}`);
  }
  return pair;
}

async function writeStorageState(cookiePair: string): Promise<void> {
  const value = cookiePair.slice(`${SESSION_COOKIE_NAME}=`.length);
  const expires = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const storageState = {
    cookies: [
      {
        name: SESSION_COOKIE_NAME,
        value,
        domain: "localhost",
        path: "/",
        expires,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
  await mkdir(path.dirname(ADMIN_STORAGE_STATE_PATH), { recursive: true });
  await writeFile(ADMIN_STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));
}

interface SeedIds {
  professionalId: string;
  procedureWithKitId: string;
  procedureNoKitId: string;
  supplyIds: [string, string];
  batchLabel: string;
}

async function seedBaseData(cookie: string): Promise<SeedIds> {
  const professional = await post<{ id: string }>(cookie, "/api/professionals", {
    fullName: "Enf. Semente E2E",
    registry: "COREN-SP 000001",
  });

  const procedureWithKit = await post<{ id: string }>(cookie, "/api/procedures", {
    name: "Troca de bolsa de colostomia (seed E2E)",
    priceCents: 18000,
    durationMinutes: 45,
  });

  const procedureNoKit = await post<{ id: string }>(cookie, "/api/procedures", {
    name: "Curativo especializado (seed E2E)",
    priceCents: 12000,
    durationMinutes: 30,
  });

  const supplyOne = await post<{ id: string }>(cookie, "/api/supplies", {
    name: "Bolsa colostomia 1 peça 60mm (seed E2E)",
    unit: "un",
    minQty: 5,
    priceCents: 3500,
  });
  const supplyTwo = await post<{ id: string }>(cookie, "/api/supplies", {
    name: "Placa protetora (seed E2E)",
    unit: "un",
    minQty: 5,
    priceCents: 2200,
  });

  // Kit do procedimento: baixado automaticamente ao concluir uma consulta.
  await put(cookie, `/api/procedures/${procedureWithKit.id}/kit`, {
    items: [{ supplyId: supplyOne.id, quantity: 1 }],
  });

  // Lote de entrada com validade — alimenta o insight de vencimento em materiais.
  const batchLabel = "L-E2E-0001";
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();
  await post(cookie, `/api/supplies/${supplyOne.id}/movements`, {
    type: "in",
    quantity: 50,
    reason: "Compra inicial — seed E2E",
    batchLabel,
    expiresAt,
  });
  await post(cookie, `/api/supplies/${supplyTwo.id}/movements`, {
    type: "in",
    quantity: 50,
    reason: "Compra inicial — seed E2E",
    batchLabel: "L-E2E-0002",
    expiresAt,
  });

  return {
    professionalId: professional.id,
    procedureWithKitId: procedureWithKit.id,
    procedureNoKitId: procedureNoKit.id,
    supplyIds: [supplyOne.id, supplyTwo.id],
    batchLabel,
  };
}

export default async function globalSetup(): Promise<void> {
  const cookie = await loginAsAdmin();
  await writeStorageState(cookie);
  const seed = await seedBaseData(cookie);
  await mkdir(path.dirname(SEED_DATA_PATH), { recursive: true });
  await writeFile(SEED_DATA_PATH, JSON.stringify(seed, null, 2));
  // Catálogo de taxonomias (NANDA-I/NOC/NIC) — subset curado de estomaterapia.
  await post(cookie, "/api/admin/taxonomy/import", {});
}
