import { describe, it, expect, vi } from "vitest";
import { ensureLinkBestEffort } from "@/lib/patient-link";
import type { ProfessionalPatientLinkRepository } from "@/domain/clinical/professional-patient-link";

describe("Feature: ensureLinkBestEffort (issue #42)", () => {
  it("Dado ensureLink bem-sucedido, Quando chamar, Então propaga a chamada normalmente", async () => {
    const links = { ensureLink: vi.fn().mockResolvedValue(undefined) } as unknown as
      ProfessionalPatientLinkRepository;

    await ensureLinkBestEffort(links, "prof-1", "patient-1");

    expect(links.ensureLink).toHaveBeenCalledWith("prof-1", "patient-1");
  });

  it("Dado ensureLink falhando, Quando chamar, Então NÃO lança — registra e segue (melhor esforço)", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const links = {
      ensureLink: vi.fn().mockRejectedValue(new Error("banco indisponível")),
    } as unknown as ProfessionalPatientLinkRepository;

    try {
      await expect(ensureLinkBestEffort(links, "prof-1", "patient-1")).resolves.toBeUndefined();
      expect(errorLog).toHaveBeenCalled();
    } finally {
      errorLog.mockRestore();
    }
  });
});
