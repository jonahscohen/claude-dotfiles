// Project-root resolution + path-scope validation for the ast_grep tool.
//
// SIDECOACH_PROJECT_ROOT env var (defaults to process.cwd()) is the boundary
// under which ast-grep is allowed to operate. Every path argument from a
// caller is resolved against the root and rejected if it escapes via
// symlinks or `..` segments.
//
// This is a security-relevant module - if a caller can pass `../../../etc`
// and have the validator return it, we have an arbitrary-FS-read primitive
// through ast-grep. We use realpathSync.native to follow symlinks before
// comparing, and reject any relative result that starts with `..`.

import * as fs from 'fs';
import * as path from 'path';

import { SidecoachToolError } from './errors';

/** Env var name. Documented in README + DESIGN-EXTENSION.md. */
export const PROJECT_ROOT_ENV = 'SIDECOACH_PROJECT_ROOT';

/**
 * Resolve the project root from env or cwd. The result is a normalized
 * absolute path with all symlinks dereferenced. If the resolved path
 * does not exist or is not a directory, we throw INVALID_INPUT - the
 * caller misconfigured the env var.
 *
 * Cached at server startup via probeProjectRoot() on the registries
 * bundle (see `registries.ts`). Tests can pass an override.
 */
export function resolveProjectRoot(override?: string): string {
  const raw = override ?? process.env[PROJECT_ROOT_ENV] ?? process.cwd();
  const resolved = path.resolve(raw);
  let real: string;
  try {
    real = fs.realpathSync.native(resolved);
  } catch (err) {
    throw new SidecoachToolError(
      'INVALID_INPUT',
      `${PROJECT_ROOT_ENV}="${raw}" does not exist or is not readable`,
      {
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    );
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(real);
  } catch (err) {
    throw new SidecoachToolError(
      'INVALID_INPUT',
      `${PROJECT_ROOT_ENV}="${raw}" is unreadable`,
      {
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    );
  }
  if (!stat.isDirectory()) {
    throw new SidecoachToolError(
      'INVALID_INPUT',
      `${PROJECT_ROOT_ENV}="${raw}" is not a directory`,
    );
  }
  return real;
}

/**
 * Validate that `userPath` (which may be relative) resolves to a location
 * inside `projectRoot`. Returns the normalized absolute path on success;
 * throws SidecoachToolError(INVALID_INPUT) on escape.
 *
 * The validation steps:
 *   1. Resolve `userPath` against the root via path.resolve.
 *   2. Realpath to follow symlinks (this is what prevents the classic
 *      "symlink in the project root pointing to /etc" escape).
 *   3. Compute `relative(root, real)`. If it starts with `..` or is
 *      absolute, the path is outside the boundary.
 *
 * If the path doesn't exist yet, we still allow it - ast-grep handles
 * missing paths gracefully (no matches), and we don't want a transient
 * "not found" race to be an INVALID_INPUT. We still validate the
 * directory containing it, walking up until we find a path that exists.
 */
export function validatePathInRoot(userPath: string, projectRoot: string): string {
  if (typeof userPath !== 'string' || userPath.length === 0) {
    throw new SidecoachToolError('INVALID_INPUT', 'path must be a non-empty string');
  }
  // path.resolve treats absolute strings as-is and relative strings as
  // relative to cwd. We want relative-strings to be relative to the
  // project root, not cwd.
  const absolute = path.isAbsolute(userPath)
    ? path.resolve(userPath)
    : path.resolve(projectRoot, userPath);

  const real = realpathBestEffort(absolute);
  const rel = path.relative(projectRoot, real);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new SidecoachToolError(
      'INVALID_INPUT',
      `path escapes the project root (${projectRoot}): "${userPath}"`,
    );
  }
  return real;
}

/**
 * Try to realpath the given absolute path. If it doesn't exist, walk up
 * to the deepest ancestor that DOES exist and realpath that, then rejoin
 * the missing tail. This handles a caller asking about a path that hasn't
 * been written yet - common during a build's intermediate state.
 *
 * Symlink protection still holds: we follow symlinks for every component
 * that exists. The only difference is the leaf may not be a real path on
 * disk yet, which is fine for path-scope validation - we just need to know
 * "would this resolve inside the boundary if it existed".
 */
function realpathBestEffort(absolute: string): string {
  if (fs.existsSync(absolute)) {
    try {
      return fs.realpathSync.native(absolute);
    } catch {
      return absolute; // fall through; the existsSync race lost
    }
  }
  // Walk up.
  const segs = absolute.split(path.sep);
  // Drop one segment at a time until we hit an existing path.
  for (let i = segs.length - 1; i >= 1; i--) {
    const head = segs.slice(0, i).join(path.sep) || path.sep;
    if (fs.existsSync(head)) {
      let realHead: string;
      try {
        realHead = fs.realpathSync.native(head);
      } catch {
        realHead = head;
      }
      const tail = segs.slice(i).join(path.sep);
      return path.join(realHead, tail);
    }
  }
  return absolute;
}
