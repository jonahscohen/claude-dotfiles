// Reads the effect catalog straight from the runtime manifests on disk.
// Each runtime/effects/<id>/manifest.json is the source of truth for an effect's
// id, display name, and tunable param specs.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const TILT_ROOT = join(HERE, '..', '..');
const EFFECTS_DIR = join(TILT_ROOT, 'runtime', 'effects');

// Non-catalog effects: present on disk as built-in reference/test fixtures but
// intentionally excluded from the live UI catalog (mirrors CATALOG_EXCLUDE in
// runtime/index.ts). The verifier drives the live catalog, so it skips these.
const NON_CATALOG = new Set(['gradient']);

/** Load every effect manifest present on disk, keyed nothing - returned as array. */
export function loadCatalog() {
  const dirs = readdirSync(EFFECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const out = [];
  for (const id of dirs) {
    if (NON_CATALOG.has(id)) continue;
    const mPath = join(EFFECTS_DIR, id, 'manifest.json');
    if (!existsSync(mPath)) continue;
    try {
      const mft = JSON.parse(readFileSync(mPath, 'utf8'));
      out.push(mft);
    } catch {
      // skip malformed manifest; the build/tsc step is the place that fails on it
    }
  }
  return out;
}
