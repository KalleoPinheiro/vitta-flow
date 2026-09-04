import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * O gate de adoção (`npm run check:sv`) é a única coisa que impede um `<button>`
 * cru ou um degrau de paleta de voltar. Um gate sem teste é um gate que pode
 * ficar cego em silêncio: quebrar uma das checagens não faz nada falhar, e ele
 * segue reportando OK.
 *
 * Cada caso abaixo planta uma violação num fixture e exige que o gate a
 * encontre, mais um caso limpo que exige que ele saia com 0.
 */
const SCRIPT = join(process.cwd(), 'scripts', 'check-sv-adoption.sh');

interface GateResult {
  status: number;
  output: string;
}

function runGate(srcDir: string, gapsDoc: string): GateResult {
  try {
    const output = execFileSync('bash', [SCRIPT, srcDir, gapsDoc], {
      encoding: 'utf8',
    });
    return { status: 0, output };
  } catch (error) {
    const err = error as { status: number; stdout: string; stderr: string };
    return {
      status: err.status,
      output: `${err.stdout ?? ''}${err.stderr ?? ''}`,
    };
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
  root = mkdtempSync(join(tmpdir(), 'sv-gate-'));
  src = join(root, 'src');
  mkdirSync(join(src, 'app'), { recursive: true });
  writeFileSync(join(src, 'ok.tsx'), CLEAN_COMPONENT);
  writeFileSync(
    join(src, 'app', 'globals.css'),
    '@theme {\n  --color-accent: var(--sv-accent);\n}\n',
  );
  gapsDoc = join(root, 'gaps.md');
  writeFileSync(gapsDoc, '# Lacunas\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('Feature: Gate de adoção do Still Void', () => {
  describe('Cenário: código já adotado', () => {
    it('Dado um fixture limpo, Quando o gate roda, Então sai com 0 e não reporta achado', () => {
      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(0);
      expect(result.output).toContain(
        'OK — adoção do @still-void/ui v2 completa.',
      );
    });
  });

  describe('Cenário: violações que o gate tem de encontrar', () => {
    it('Dado import do entry point removido na v2, Então reporta e sai com 1', () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        'import { logo } from "@still-void/ui";\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        '✗ [import bare @still-void/ui] 1 achado(s)',
      );
      expect(result.output).toContain('mau.tsx');
    });

    it('Dado import do entry point removido com aspas simples, Então também reporta (estilo de citação não escapa do gate)', () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        "import { logo } from '@still-void/ui';\n",
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        '✗ [import bare @still-void/ui] 1 achado(s)',
      );
      expect(result.output).toContain('mau.tsx');
    });

    it('Dado import por efeito colateral do entry point removido, Então reporta (não há cláusula from para casar)', () => {
      writeFileSync(join(src, 'mau.tsx'), 'import "@still-void/ui";\n');

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        '✗ [import bare @still-void/ui] 1 achado(s)',
      );
      expect(result.output).toContain('mau.tsx');
    });

    it('Dado espaço extra antes do especificador, Então reporta (formatação não escapa do gate)', () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        'import { logo } from   "@still-void/ui";\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        '✗ [import bare @still-void/ui] 1 achado(s)',
      );
      expect(result.output).toContain('mau.tsx');
    });

    it('Dado <button> cru sem marcação sv-gap, Então reporta e sai com 1', () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        'export const X = () => <button type="button">x</button>;\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain('✗ [<button> cru] 1 achado(s)');
    });

    it('Dado <button> cru COM marcação sv-gap, Então não reporta (workaround declarado)', () => {
      writeFileSync(
        join(src, 'marcado.tsx'),
        'export const X = () => (\n  // sv-gap: grid-cell\n  <button type="button">x</button>\n);\n',
      );
      writeFileSync(gapsDoc, '# Lacunas\n\n### `grid-cell`\n\ntexto\n');

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(0);
    });

    it('Dado <input> textual cru, Então reporta e sai com 1', () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        'export const X = () => <input type="email" />;\n',
      );

      const result = runGate(src, gapsDoc);

      // O rótulo sozinho não serve de prova: ele é impresso tanto no estado ✓
      // quanto no ✗. A prova é o marcador de falha, a contagem e o arquivo.
      expect(result.status).toBe(1);
      expect(result.output).toContain('✗ [<input> textual cru] 1 achado(s)');
      expect(result.output).toContain('mau.tsx');
    });

    it('Dado <input> de tipo file, checkbox ou radio, Então não é contado pela checagem <input> textual cru (é escopo da checagem [10])', () => {
      for (const type of ['file', 'checkbox', 'radio']) {
        writeFileSync(
          join(src, 'mau.tsx'),
          `export const X = () => <input type="${type}" />;\n`,
        );

        const result = runGate(src, gapsDoc);

        expect(result.output, `type=${type}`).toContain(
          '✓ [<input> textual cru]',
        );
      }
    });

    it('Dado <select> cru sem marcação sv-gap, Então reporta e sai com 1', () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        'export const X = () => <select value="a" onChange={() => {}}><option value="a">a</option></select>;\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain('✗ [<select> cru] 1 achado(s)');
      expect(result.output).toContain('mau.tsx');
    });

    it('Dado <select> cru COM marcação sv-gap, Então não reporta (workaround declarado)', () => {
      writeFileSync(
        join(src, 'marcado.tsx'),
        'export const X = () => (\n  // sv-gap: native-select\n  <select value="a" onChange={() => {}}><option value="a">a</option></select>\n);\n',
      );
      writeFileSync(gapsDoc, '# Lacunas\n\n### `native-select`\n\ntexto\n');

      const result = runGate(src, gapsDoc);

      expect(result.output).toContain('✓ [<select> cru]');
    });

    it('Dado <textarea> cru sem marcação sv-gap, Então reporta e sai com 1', () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        'export const X = () => <textarea rows={2} />;\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain('✗ [<textarea> cru] 1 achado(s)');
      expect(result.output).toContain('mau.tsx');
    });

    it('Dado <textarea> cru COM marcação sv-gap, Então não reporta (workaround declarado)', () => {
      writeFileSync(
        join(src, 'marcado.tsx'),
        'export const X = () => (\n  // sv-gap: textarea\n  <textarea rows={2} />\n);\n',
      );
      writeFileSync(gapsDoc, '# Lacunas\n\n### `textarea`\n\ntexto\n');

      const result = runGate(src, gapsDoc);

      expect(result.output).toContain('✓ [<textarea> cru]');
    });

    it('Dado <input type="file|checkbox|radio"> cru sem marcação sv-gap, Então reporta e sai com 1', () => {
      for (const type of ['file', 'checkbox', 'radio']) {
        writeFileSync(
          join(src, 'mau.tsx'),
          `export const X = () => <input type="${type}" />;\n`,
        );

        const result = runGate(src, gapsDoc);

        expect(result.status, `type=${type}`).toBe(1);
        expect(result.output).toContain(
          '✗ [<input type="file|checkbox|radio"> cru] 1 achado(s)',
        );
        expect(result.output).toContain('mau.tsx');
      }
    });

    it('Dado <input type="file"> cru COM marcação sv-gap, Então não reporta (workaround declarado)', () => {
      writeFileSync(
        join(src, 'marcado.tsx'),
        'export const X = () => (\n  // sv-gap: upload-legado\n  <input type="file" />\n);\n',
      );
      writeFileSync(gapsDoc, '# Lacunas\n\n### `upload-legado`\n\ntexto\n');

      const result = runGate(src, gapsDoc);

      expect(result.output).toContain(
        '✓ [<input type="file|checkbox|radio"> cru]',
      );
    });

    it('Dado <table> cru sem marcação sv-gap, Então reporta e sai com 1', () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        'export const X = () => (\n  <table>\n    <tbody>\n      <tr>\n        <td>a</td>\n      </tr>\n    </tbody>\n  </table>\n);\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain('✗ [<table> cru] 1 achado(s)');
      expect(result.output).toContain('mau.tsx');
    });

    it('Dado <table> cru COM marcação sv-gap, Então não reporta (workaround declarado)', () => {
      writeFileSync(
        join(src, 'marcado.tsx'),
        'export const X = () => (\n  // sv-gap: table-legado\n  <table>\n    <tbody>\n      <tr>\n        <td>a</td>\n      </tr>\n    </tbody>\n  </table>\n);\n',
      );
      writeFileSync(gapsDoc, '# Lacunas\n\n### `table-legado`\n\ntexto\n');

      const result = runGate(src, gapsDoc);

      expect(result.output).toContain('✓ [<table> cru]');
    });

    it('Dado accentButton cru sem marcação sv-gap, Então reporta e sai com 1', () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        'import { accentButton } from "@/lib/ui";\nexport const X = () => <button type="button" className={accentButton}>x</button>;\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        '✗ [accentButton/nativeField/src/lib/ui.ts]',
      );
      expect(result.output).toContain('mau.tsx');
    });

    it('Dado nativeField cru sem marcação sv-gap, Então reporta e sai com 1', () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        'import { nativeField } from "@/lib/ui";\nexport const X = () => <select className={nativeField} />;\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        '✗ [accentButton/nativeField/src/lib/ui.ts]',
      );
      expect(result.output).toContain('mau.tsx');
    });

    it('Dado accentButton cru COM marcação sv-gap, Então não reporta (workaround declarado)', () => {
      writeFileSync(
        join(src, 'marcado.tsx'),
        'export const X = () => (\n  // sv-gap: accent-legado\n  <button type="button" className={accentButton}>x</button>\n);\n',
      );
      writeFileSync(gapsDoc, '# Lacunas\n\n### `accent-legado`\n\ntexto\n');

      const result = runGate(src, gapsDoc);

      expect(result.output).toContain(
        '✓ [accentButton/nativeField/src/lib/ui.ts]',
      );
    });

    it('Dado src/lib/ui.ts existente, Então reporta e sai com 1 mesmo sem accentButton/nativeField no resto do código', () => {
      mkdirSync(join(src, 'lib'), { recursive: true });
      writeFileSync(
        join(src, 'lib', 'ui.ts'),
        'export const somethingElse = 1;\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        '✗ [accentButton/nativeField/src/lib/ui.ts]',
      );
      expect(result.output).toContain('arquivo não deveria mais existir');
    });

    it('Dado nem accentButton/nativeField nem src/lib/ui.ts, Então não reporta', () => {
      const result = runGate(src, gapsDoc);

      expect(result.output).toContain(
        '✓ [accentButton/nativeField/src/lib/ui.ts]',
      );
    });

    it('Dado <Table> sem text-black em src/app/documentos/**, Então reporta e sai com 1', () => {
      mkdirSync(join(src, 'app', 'documentos', 'plano-cuidados'), {
        recursive: true,
      });
      writeFileSync(
        join(src, 'app', 'documentos', 'plano-cuidados', 'mau.tsx'),
        'export const X = () => <Table className="w-full border-collapse text-xs">conteúdo</Table>;\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        '✗ [override text-black ausente em tabela de documentos] 1 achado(s)',
      );
      expect(result.output).toContain('mau.tsx');
    });

    it('Dado <TableHead> sem text-black em src/app/documentos/**, Então reporta e sai com 1', () => {
      mkdirSync(join(src, 'app', 'documentos', 'relatorio'), {
        recursive: true,
      });
      writeFileSync(
        join(src, 'app', 'documentos', 'relatorio', 'mau.tsx'),
        'export const X = () => <TableHead className="py-1 pr-2">Data</TableHead>;\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        '✗ [override text-black ausente em tabela de documentos] 1 achado(s)',
      );
      expect(result.output).toContain('mau.tsx');
    });

    it('Dado <Table>/<TableHead> COM text-black em src/app/documentos/**, Então não reporta (caso limpo, espelha as páginas reais)', () => {
      mkdirSync(join(src, 'app', 'documentos', 'plano-cuidados'), {
        recursive: true,
      });
      writeFileSync(
        join(src, 'app', 'documentos', 'plano-cuidados', 'ok.tsx'),
        'export const X = () => (\n  <Table className="w-full border-collapse text-xs text-black">\n    <TableHead className="py-1 pr-2 text-black">Data</TableHead>\n  </Table>\n);\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.output).toContain(
        '✓ [override text-black ausente em tabela de documentos]',
      );
    });

    it('Dado <Table> sem text-black FORA de src/app/documentos/**, Então não reporta (fora do escopo do override de impressão)', () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        'export const X = () => <Table className="w-full">conteúdo</Table>;\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.output).toContain(
        '✓ [override text-black ausente em tabela de documentos]',
      );
    });

    it('Dado utilitário de paleta fora da ponte de tokens, Então reporta e sai com 1', () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        'export const X = () => <span className="text-slate-500" />;\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        '✗ [utilitário de paleta crua] 1 achado(s)',
      );
    });

    it('Dado apelido slate/teal de volta no @theme, Então reporta e sai com 1', () => {
      writeFileSync(
        join(src, 'app', 'globals.css'),
        '@theme {\n  --color-teal-700: var(--sv-accent-ink);\n}\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        '✗ [apelido slate/teal no @theme] 1 achado(s)',
      );
    });

    it("Dado símbolo client-only importado em arquivo sem 'use client', Então reporta e sai com 1", () => {
      writeFileSync(
        join(src, 'mau.tsx'),
        'import { Dialog } from "@still-void/ui/react/client";\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        '✗ [client-only fora de client component] 1 achado(s)',
      );
    });

    it("Dado símbolo client-only com a diretiva 'use client' em aspas simples, Então NÃO reporta", () => {
      writeFileSync(
        join(src, 'ok.tsx'),
        '\'use client\';\nimport { Dialog } from "@still-void/ui/react/client";\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.output).toContain(
        '✓ [client-only fora de client component]',
      );
    });

    it("Dado a diretiva 'use client' recuada, Então NÃO reporta (o parser do Next aceita espaço à esquerda)", () => {
      writeFileSync(
        join(src, 'ok.tsx'),
        '  "use client";\nimport { Dialog } from "@still-void/ui/react/client";\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.output).toContain(
        '✓ [client-only fora de client component]',
      );
    });

    it('Dado marcação sv-gap sem seção no documento de lacunas, Então reporta e sai com 1', () => {
      writeFileSync(
        join(src, 'marcado.tsx'),
        'export const X = () => (\n  // sv-gap: inexistente\n  <button type="button">x</button>\n);\n',
      );

      const result = runGate(src, gapsDoc);

      expect(result.status).toBe(1);
      expect(result.output).toContain('marcado no código, ausente de');
    });

    it('Dado seção no documento sem marcação no código, Então reporta; e não reporta se for doc-only', () => {
      writeFileSync(gapsDoc, '# Lacunas\n\n### `orfa`\n\ntexto\n');
      expect(runGate(src, gapsDoc).output).toContain('sem marcação no código');

      writeFileSync(
        gapsDoc,
        '# Lacunas\n\n### `orfa`\n\n<!-- sv-gap-doc-only -->\n\ntexto\n',
      );
      expect(runGate(src, gapsDoc).status).toBe(0);
    });
  });
});
