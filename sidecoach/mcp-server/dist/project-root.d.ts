/** Env var name. Documented in README + DESIGN-EXTENSION.md. */
export declare const PROJECT_ROOT_ENV = "SIDECOACH_PROJECT_ROOT";
/**
 * Resolve the project root from env or cwd. The result is a normalized
 * absolute path with all symlinks dereferenced. If the resolved path
 * does not exist or is not a directory, we throw INVALID_INPUT - the
 * caller misconfigured the env var.
 *
 * Cached at server startup via probeProjectRoot() on the registries
 * bundle (see `registries.ts`). Tests can pass an override.
 */
export declare function resolveProjectRoot(override?: string): string;
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
export declare function validatePathInRoot(userPath: string, projectRoot: string): string;
//# sourceMappingURL=project-root.d.ts.map