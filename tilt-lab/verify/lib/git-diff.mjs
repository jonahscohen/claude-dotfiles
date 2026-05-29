// Diff awareness: figure out which effects changed so a run can focus on them.
// Looks at staged + unstaged + untracked paths under runtime/effects/<id>/ and
// app/ (an app-shell change touches every effect's surface, so that widens scope).
import { execSync } from 'node:child_process';
import { TILT_ROOT } from './catalog.mjs';

function gitLines(cmd) {
  try {
    return execSync(cmd, { cwd: TILT_ROOT, encoding: 'utf8' })
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Returns { effects: Set<id>, appChanged: boolean, files: string[] }.
 * `effects` is the set of effect ids with changed files under runtime/effects/<id>/.
 * `appChanged` is true when the playground shell (app/ or runtime root) changed,
 * which means "test everything" is the safer interpretation.
 */
export function changedScope() {
  const files = new Set([
    ...gitLines('git diff --name-only HEAD'),
    ...gitLines('git ls-files --others --exclude-standard'),
  ]);
  const effects = new Set();
  let appChanged = false;
  for (const f of files) {
    const m = f.match(/(?:^|\/)?runtime\/effects\/([^/]+)\//);
    if (m) {
      effects.add(m[1]);
      continue;
    }
    if (f.startsWith('app/') || /^runtime\/[^/]+\.ts$/.test(f)) appChanged = true;
  }
  return { effects, appChanged, files: [...files] };
}
