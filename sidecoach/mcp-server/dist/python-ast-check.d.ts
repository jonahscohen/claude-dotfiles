/** Result of the static screen. */
export type AstCheckResult = {
    ok: true;
} | {
    ok: false;
    violation: string;
};
/**
 * Replace the CONTENTS of string literals and comments with spaces so the
 * detectors below only see real code tokens. Newlines are preserved so
 * line/statement structure (which the import regexes rely on) stays intact.
 *
 * Handles: # comments; single/double quotes; triple-quoted strings; string
 * prefixes (r/b/u/f and 2-char combos, case-insensitive). Backslash is always
 * treated as an escape inside a string (even raw strings) - this can only
 * neutralize MORE than strictly necessary, which is the safe direction.
 */
export declare function neutralize(code: string): string;
/**
 * Screen Python source for forbidden constructs. Returns the FIRST violation
 * found (ordered most-specific-first) or `{ ok: true }`.
 */
export declare function checkPythonCode(code: string): AstCheckResult;
//# sourceMappingURL=python-ast-check.d.ts.map