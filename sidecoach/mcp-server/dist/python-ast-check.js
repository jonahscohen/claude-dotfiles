"use strict";
// T-0025: static pre-screen for Python code BEFORE it reaches the sandbox.
//
// Defense-in-depth layer 1. The container flags (`--network none`,
// `--read-only`, `--user nobody`, memory/cpu caps) are the HARD security
// boundary; this check is the fast-fail UX/guard layer that rejects obviously
// dangerous code (os/subprocess/socket imports, dynamic import/eval/exec, and
// __builtins__ poking) before we pay the cost of spawning a container.
//
// Design choice - lexical scanner in TypeScript, NOT a shell-out to host
// `python3 -m ast`:
//   - The gate must ALWAYS run, even on a host with no python3 installed. The
//     only declared host dependency for this tool is the container runtime
//     (docker/podman); adding a second host runtime (python3) just to screen
//     input would create a path where the gate silently no-ops. Keeping the
//     check in-process guarantees it always fires.
//   - It is deterministic and unit-testable without any interpreter.
//   - The scanner first NEUTRALIZES string literals and comments (replacing
//     their contents with spaces) so a forbidden token inside a string -
//     e.g. print("import os") - is not a false positive, and a real
//     `import os` cannot hide behind a `#` trick. This removes the dominant
//     false-positive / false-negative vector that a naive regex-on-raw-source
//     would suffer.
//   - Because the container is the real boundary, an exotic obfuscation that
//     slips past the lexical screen still runs with no network, a read-only
//     FS, 256m RAM, and as `nobody`. The screen is a guard rail, not the wall.
Object.defineProperty(exports, "__esModule", { value: true });
exports.neutralize = neutralize;
exports.checkPythonCode = checkPythonCode;
/** Modules whose import is rejected outright. */
const FORBIDDEN_MODULES = new Set(['os', 'subprocess', 'socket']);
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
function neutralize(code) {
    let out = '';
    let i = 0;
    const n = code.length;
    while (i < n) {
        const c = code[i];
        // Line comment.
        if (c === '#') {
            while (i < n && code[i] !== '\n') {
                out += ' ';
                i += 1;
            }
            continue;
        }
        // Possible string literal, optionally with a 1-2 char prefix (r, b, f, u).
        let j = i;
        let prefixLen = 0;
        while (j < n && prefixLen < 2 && /[rbufRBUF]/.test(code[j])) {
            j += 1;
            prefixLen += 1;
        }
        if (j < n && (code[j] === '"' || code[j] === "'")) {
            // Emit spaces for the prefix chars.
            for (let k = i; k < j; k += 1)
                out += ' ';
            const quote = code[j];
            const isTriple = code.slice(j, j + 3) === quote + quote + quote;
            const delim = isTriple ? quote + quote + quote : quote;
            // Emit spaces for the opening delimiter.
            out += ' '.repeat(delim.length);
            let k = j + delim.length;
            let closed = false;
            while (k < n) {
                if (code[k] === '\\') {
                    // Escaped char - consume both, preserve any newline structure.
                    out += code[k + 1] === '\n' ? ' \n' : '  ';
                    k += 2;
                    continue;
                }
                if (code.slice(k, k + delim.length) === delim) {
                    out += ' '.repeat(delim.length);
                    k += delim.length;
                    closed = true;
                    break;
                }
                out += code[k] === '\n' ? '\n' : ' ';
                k += 1;
            }
            if (!closed) {
                // Unterminated string - everything to EOF was neutralized already.
            }
            i = k;
            continue;
        }
        // Ordinary character (includes prefix letters that were NOT a string).
        out += c;
        i += 1;
    }
    return out;
}
/**
 * Screen Python source for forbidden constructs. Returns the FIRST violation
 * found (ordered most-specific-first) or `{ ok: true }`.
 */
function checkPythonCode(code) {
    if (typeof code !== 'string') {
        return { ok: false, violation: 'code must be a string' };
    }
    const src = neutralize(code);
    // 1. Forbidden module imports: `import os`, `import os.path as p`,
    //    `import sys, socket`, `from subprocess import run`, etc.
    const importRe = /(?:^|[\n;])[ \t]*import[ \t]+([^\n;#]+)/g;
    let m;
    while ((m = importRe.exec(src)) !== null) {
        for (const part of m[1].split(',')) {
            const root = part.trim().split(/[\s.]/)[0];
            if (FORBIDDEN_MODULES.has(root)) {
                return { ok: false, violation: `forbidden import: ${root}` };
            }
        }
    }
    const fromRe = /(?:^|[\n;])[ \t]*from[ \t]+([.\w]+)[ \t]+import\b/g;
    while ((m = fromRe.exec(src)) !== null) {
        const root = m[1].replace(/^\.+/, '').split('.')[0];
        if (root && FORBIDDEN_MODULES.has(root)) {
            return { ok: false, violation: `forbidden import: ${root}` };
        }
    }
    // 2. Dynamic import.
    if (/\b__import__\b/.test(src)) {
        return { ok: false, violation: 'forbidden builtin: __import__' };
    }
    // 3. eval / exec / compile (call form).
    const builtinCall = /\b(eval|exec|compile)\s*\(/.exec(src);
    if (builtinCall) {
        return { ok: false, violation: `forbidden builtin: ${builtinCall[1]}` };
    }
    // 4. Any poking at __builtins__ (covers getattr(__builtins__, ...),
    //    __builtins__["..."], __builtins__.__import__, etc.).
    if (/__builtins__/.test(src)) {
        const violation = /getattr/.test(src)
            ? 'getattr on __builtins__'
            : '__builtins__ access';
        return { ok: false, violation };
    }
    return { ok: true };
}
//# sourceMappingURL=python-ast-check.js.map