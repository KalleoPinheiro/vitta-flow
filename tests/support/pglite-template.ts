import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { inject } from 'vitest';

/**
 * Carrega o PGlite já migrado (tests/support/pglite-global-setup.ts) via
 * snapshot em vez de rodar `migrate()` de novo — mesma instância isolada por
 * arquivo de sempre, só que restaurada de um dump em vez de remontada do
 * zero (#111).
 */
export async function createPgliteFromTemplate(): Promise<PGlite> {
  const templatePath = inject('pgliteTemplatePath');
  const buffer = await fs.readFile(templatePath);
  return new PGlite({
    loadDataDir: new Blob([buffer]),
    extensions: { pg_trgm, btree_gist },
  });
}
