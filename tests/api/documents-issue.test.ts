import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { jsonRequest } from "../support/request";

process.env.VITTA_DB_DRIVER = "pglite";

interface Envelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

interface IssuanceResponse {
  documentNumber: string;
  issuedAt: string;
}

describe("Feature: emissão persistida de documentos (#94, DOC-01) — POST /api/documents/issue", () => {
  const issue = async (documentType: string, resourceId: string) => {
    const route = await import("@/app/api/documents/issue/route");
    const response = await route.POST(
      jsonRequest("/api/documents/issue", "POST", { documentType, resourceId }),
    );
    const json = (await response.json()) as Envelope<IssuanceResponse>;
    return { response, json };
  };

  describe("Cenário: idempotência", () => {
    it("Dado o mesmo documentType e resourceId, Quando emitir duas vezes, Então devolve o mesmo número e data", async () => {
      const resourceId = `apt-${Date.now()}`;
      const { json: first } = await issue("atestado", resourceId);
      const { json: second } = await issue("atestado", resourceId);

      expect(first.data.documentNumber).toBe(second.data.documentNumber);
      expect(first.data.issuedAt).toBe(second.data.issuedAt);
    });

    it("Dado resourceId diferente, Quando emitir, Então devolve número diferente", async () => {
      const { json: first } = await issue("atestado", `apt-a-${Date.now()}`);
      const { json: second } = await issue("atestado", `apt-b-${Date.now()}`);

      expect(first.data.documentNumber).not.toBe(second.data.documentNumber);
    });

    it("Dado o mesmo resourceId em documentType diferente, Quando emitir, Então trata como documentos distintos", async () => {
      const resourceId = `shared-${Date.now()}`;
      const { json: attestation } = await issue("atestado", resourceId);
      const { json: consent } = await issue("consentimento", resourceId);

      expect(attestation.data.documentNumber).not.toBe(consent.data.documentNumber);
      expect(attestation.data.documentNumber.startsWith("ATST-")).toBe(true);
      expect(consent.data.documentNumber.startsWith("TCLE-")).toBe(true);
    });
  });

  describe("Cenário: validação", () => {
    it("Dado documentType inválido, Quando emitir, Então responde 400", async () => {
      const { response } = await issue("nota-fiscal", "res-1");
      expect(response.status).toBe(400);
    });
  });

  describe("Cenário: autenticação", () => {
    it("Dado nenhuma sessão, Quando POST /api/documents/issue, Então 401", async () => {
      const route = await import("@/app/api/documents/issue/route");
      const noCookieRequest = new NextRequest("http://localhost/api/documents/issue", {
        method: "POST",
        body: JSON.stringify({ documentType: "atestado", resourceId: "apt-1" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await route.POST(noCookieRequest);

      expect(response.status).toBe(401);
    });
  });
});
