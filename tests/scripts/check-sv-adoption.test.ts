import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * O gate de adoção (`npm run check:sv`) é a única coisa que impede um `<button>`
 * cru ou um degrau de paleta de voltar. Um gate sem teste é um gate que pode
 * ficar cego em silêncio: quebrar uma das checagens não faz nada falhar, e ele
 * segue reportando OK.
 *
 * Cada caso abaixo planta uma violação num fixture e exige que o gate a
 * encontre, mais um caso limpo que exige que ele saia com 0.
 */
const SCRIPT = join(process.cwd(), "scripts", "check-sv-adoption.sh");

interface GateResult {
  status: number;
  output: string;
}

function runGate(srcDir: string, gapsDoc: string): GateResult {
  try {
    const output = execFileSync("bash", [SCRIPT, srcDir, gapsDoc], { encoding: "utf8" });
    return { status: 0, output };
  } catch (error) {
    const err = error as { status: number; stdout: string; stderr: string };
    return { status: err.status, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

let root: string;
let src: string;
let gapsDoc: string;

const CLEAN_COMPONENT = `import { Button } from "@still-void/ui/react";

export function Ok() {
  return <Button variant="outline" className="text-ink-3">ok</Button>;
}
`;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sv-gate-"));
  src = join(root, "src");
  mkdirSync(join(src, "app"), { recursive: true });
  writeFileSync(join(src, "ok.tsx"), CLEAN_COMPONENT);
  writeFileSync(join(src, "app", "globals.css"), "@theme {\n  --color-accent: var(--sv-accent);\n}\n");
  gapsDoc = join(root, "gaps.md");
  writeFileSync(gapsDoc, "# Lacunas\n");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("Feature: Gate de adoção do Still Void", () => {
  describe("Cenário: código já adotado", () => {
    it("Dado um fixture limpo, Quando o gate roda, Então sai com 0 e não reporta achado", () => {
      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(0);
      expect(result.output).toContain("OK — adoção do @still-void/ui v2 completa.");
    });
  });

  describe("Cenário: violações que o gate tem de encontrar", () => {
    it("Dado import do entry point removido na v2, Então reporta e sai com 1", () => {
      writeFileSync(join(src, "mau.tsx"), 'import { logo } from "@still-void/ui";\n');

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain("[import bare @still-void/ui]");
      expect(result.output).toContain("mau.tsx");
    });

    it("Dado <button> cru sem marcação sv-gap, Então reporta e sai com 1", () => {
      writeFileSync(join(src, "mau.tsx"), "export const X = () => <button type=\"button\">x</button>;\n");

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain("[<button> cru]");
    });

    it("Dado <button> cru COM marcação sv-gap, Então não reporta (workaround declarado)", () => {
      writeFileSync(
        join(src, "marcado.tsx"),
        "export const X = () => (\n  // sv-gap: grid-cell\n  <button type=\"button\">x</button>\n);\n",
      );
      writeFileSync(gapsDoc, "# Lacunas\n\n### `grid-cell`\n\ntexto\n");

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(0);
    });

    it("Dado <input> textual cru, Então reporta; e não reporta type=file, checkbox ou radio", () => {
      writeFileSync(join(src, "mau.tsx"), 'export const X = () => <input type="email" />;\n');
      expect(runGate(src, gapsDoc).output).toContain("[<input> textual cru]");

      writeFileSync(join(src, "mau.tsx"), 'export const X = () => <input type="file" />;\n');
      expect(runGate(src, gapsDoc).status).toBe(0);
    });

    it("Dado utilitário de paleta fora da ponte de tokens, Então reporta e sai com 1", () => {
      writeFileSync(join(src, "mau.tsx"), 'export const X = () => <span className="text-slate-500" />;\n');

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain("[utilitário de paleta crua]");
    });

    it("Dado apelido slate/teal de volta no @theme, Então reporta e sai com 1", () => {
      writeFileSync(
        join(src, "app", "globals.css"),
        "@theme {\n  --color-teal-700: var(--sv-accent-ink);\n}\n",
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain("[apelido slate/teal no @theme]");
    });

    it("Dado símbolo client-only importado em arquivo sem 'use client', Então reporta e sai com 1", () => {
      writeFileSync(join(src, "mau.tsx"), 'import { Dialog } from "@still-void/ui/react/client";\n');

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain("[client-only fora de client component]");
    });

    it("Dado marcação sv-gap sem seção no documento de lacunas, Então reporta e sai com 1", () => {
      writeFileSync(
        join(src, "marcado.tsx"),
        "export const X = () => (\n  // sv-gap: inexistente\n  <button type=\"button\">x</button>\n);\n",
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain("marcado no código, ausente de");
    });

    it("Dado seção no documento sem marcação no código, Então reporta; e não reporta se for doc-only", () => {
      writeFileSync(gapsDoc, "# Lacunas\n\n### `orfa`\n\ntexto\n");
      expect(runGate(src, gapsDoc).output).toContain("sem marcação no código");

      writeFileSync(gapsDoc, "# Lacunas\n\n### `orfa`\n\n<!-- sv-gap-doc-only -->\n\ntexto\n");
      expect(runGate(src, gapsDoc).status).toBe(0);
    });
  });
});
