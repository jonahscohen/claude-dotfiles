"use strict";
// Tool 15: sidecoach_ast_grep - shell out to the `ast-grep` CLI binary and
// return structured matches.
//
// Sandbox model:
//   - The path arg is validated against SIDECOACH_PROJECT_ROOT (defaults to
//     cwd). Realpath-then-relativize catches symlink escapes.
//   - execFile spawns `ast-grep run --pattern <P> [--lang <L>] --json=stream
//     [path]`. shell=false, no shell interpolation possible.
//   - AbortController-tied 10s timeout (per-tool budget). Race against
//     setTimeout - if ast-grep ignores SIGTERM the parent timeout still
//     resolves with TIMEOUT.
//   - Output capped at maxResults (default 50, hard cap 100) and per-match
//     text capped at 500 chars (truncation marker preserved).
//   - DEPENDENCY_MISSING returned as DOWNSTREAM_UNAVAILABLE if `ast-grep` is
//     not on PATH. Probed lazily on first call so the server still starts
//     when the binary is absent.
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.definition = void 0;
exports._resetAstGrepProbe = _resetAstGrepProbe;
const child_process_1 = require("child_process");
const errors_1 = require("../errors");
const ast_grep_parser_1 = require("../ast-grep-parser");
const project_root_1 = require("../project-root");
const schemas_1 = require("../schemas");
exports.definition = {
    name: 'sidecoach_ast_grep',
    description: 'Run an ast-grep pattern search over project source. Requires the `ast-grep` CLI on PATH. ' +
        'Path scoped within SIDECOACH_PROJECT_ROOT (defaults to cwd). Bounded: 10s timeout, max 100 matches, ' +
        '500-char per-match text cap. Meta-variables: $NAME single node, $$$VARS multi-node. ' +
        'Returns DOWNSTREAM_UNAVAILABLE if the binary is missing.',
    inputSchema: schemas_1.astGrepShape,
    timeoutMs: 10000,
};
/** Hard cap on per-match text length surfaced to the caller. */
const MAX_MATCH_TEXT_CHARS = 500;
/** Default cap on returned matches when caller omits `maxResults`. */
const DEFAULT_MAX_RESULTS = 50;
/** Cap on raw CLI stdout we will buffer. Prevents OOM on a pattern that matches everything. */
const MAX_STDOUT_BYTES = 4 * 1024 * 1024; // 4 MiB
/** Cap on raw CLI stderr we will buffer. Anything beyond is dropped from the error message. */
const MAX_STDERR_BYTES = 32 * 1024;
/** Internal timeout (slightly under the wrapper's tool-budget so we can fail cleanly inside the handler). */
const INTERNAL_TIMEOUT_MS = 9500;
function bufferOrStringToString(value) {
    if (typeof value === 'string')
        return value;
    if (value && typeof value.toString === 'function') {
        return value.toString('utf8');
    }
    return '';
}
/**
 * Run the ast-grep CLI as a subprocess with shell=false, capped output buffers,
 * and a timeout-tied AbortController.
 */
function runAstGrep(args, cwd) {
    return new Promise((resolve) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), INTERNAL_TIMEOUT_MS);
        if (typeof timer.unref === 'function')
            timer.unref();
        const child = (0, child_process_1.execFile)('ast-grep', args, {
            cwd,
            signal: controller.signal,
            maxBuffer: MAX_STDOUT_BYTES,
            timeout: INTERNAL_TIMEOUT_MS,
        }, (err, stdout, stderr) => {
            clearTimeout(timer);
            const stdoutStr = bufferOrStringToString(stdout);
            const stderrRaw = bufferOrStringToString(stderr);
            const stderrStr = stderrRaw.length > MAX_STDERR_BYTES
                ? stderrRaw.slice(0, MAX_STDERR_BYTES) + '...[truncated]'
                : stderrRaw;
            if (err) {
                const errno = err;
                const timedOut = controller.signal.aborted || errno.code === 'ETIMEDOUT';
                resolve({
                    stdout: stdoutStr,
                    stderr: stderrStr,
                    exitCode: typeof errno.code === 'number' ? errno.code : child.exitCode,
                    signal: child.signalCode ?? null,
                    timedOut,
                    spawnError: errno,
                });
                return;
            }
            resolve({
                stdout: stdoutStr,
                stderr: stderrStr,
                exitCode: child.exitCode,
                signal: child.signalCode ?? null,
                timedOut: false,
            });
        });
    });
}
/** Probe whether `ast-grep` is on PATH. Used at first call and cached per process. */
let CACHED_PROBE = null;
async function probeAstGrep() {
    if (CACHED_PROBE)
        return CACHED_PROBE;
    try {
        const outcome = await runAstGrep(['--version'], process.cwd());
        if (outcome.spawnError) {
            const code = outcome.spawnError.code;
            if (code === 'ENOENT') {
                CACHED_PROBE = { ok: false, reason: 'ast-grep binary not found on PATH' };
                return CACHED_PROBE;
            }
            CACHED_PROBE = { ok: false, reason: `ast-grep --version failed: ${outcome.spawnError.message}` };
            return CACHED_PROBE;
        }
        CACHED_PROBE = { ok: true };
        return CACHED_PROBE;
    }
    catch (err) {
        CACHED_PROBE = {
            ok: false,
            reason: err instanceof Error ? err.message : String(err),
        };
        return CACHED_PROBE;
    }
}
/** Test seam - reset the probe cache so tests can switch PATH between cases. */
function _resetAstGrepProbe() {
    CACHED_PROBE = null;
}
const handler = async (input, deps) => {
    const probe = await probeAstGrep();
    if (!probe.ok) {
        throw new errors_1.SidecoachToolError('DOWNSTREAM_UNAVAILABLE', `ast-grep CLI is not available: ${probe.reason ?? 'unknown reason'}. ` +
            'Install via `cargo install ast-grep` or `brew install ast-grep`.', { resource: 'ast-grep' });
    }
    let projectRoot;
    try {
        projectRoot = (0, project_root_1.resolveProjectRoot)();
    }
    catch (err) {
        if (err instanceof errors_1.SidecoachToolError)
            throw err;
        throw new errors_1.SidecoachToolError('INVALID_INPUT', `failed to resolve ${project_root_1.PROJECT_ROOT_ENV}`, { errorMessage: err instanceof Error ? err.message : String(err) });
    }
    const searchPath = (0, project_root_1.validatePathInRoot)(input.path ?? '.', projectRoot);
    const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;
    const args = ['run', '--pattern', input.pattern, '--json=stream'];
    if (input.language) {
        args.push('--lang', input.language);
    }
    args.push(searchPath);
    const startedAt = Date.now();
    const outcome = await runAstGrep(args, projectRoot);
    const durationMs = Date.now() - startedAt;
    if (outcome.spawnError && outcome.spawnError.code === 'ENOENT') {
        // PATH changed under us between probe and call. Treat as DOWNSTREAM_UNAVAILABLE.
        CACHED_PROBE = { ok: false, reason: 'ast-grep binary disappeared mid-session' };
        throw new errors_1.SidecoachToolError('DOWNSTREAM_UNAVAILABLE', 'ast-grep CLI vanished mid-call', { resource: 'ast-grep' });
    }
    if (outcome.timedOut) {
        throw new errors_1.SidecoachToolError('TIMEOUT', `ast-grep exceeded ${INTERNAL_TIMEOUT_MS}ms internal budget`, { timeoutMs: INTERNAL_TIMEOUT_MS });
    }
    // ast-grep exit codes:
    //   0 -> success (matches may be empty)
    //   non-zero -> usage error, pattern parse failure, etc.
    if (outcome.exitCode !== 0 && outcome.exitCode !== null) {
        throw new errors_1.SidecoachToolError('VALIDATOR_FAILURE', `ast-grep exited with code ${outcome.exitCode}`, {
            validator: 'ast-grep',
            errorMessage: outcome.stderr || 'no stderr',
        });
    }
    const parsed = (0, ast_grep_parser_1.parseAstGrepStream)(outcome.stdout, {
        maxResults,
        maxMatchTextChars: MAX_MATCH_TEXT_CHARS,
        projectRoot,
    });
    const result = {
        pattern: input.pattern,
        language: input.language ?? null,
        path: input.path ?? '.',
        projectRoot,
        matchCount: parsed.matches.length,
        truncated: parsed.truncated,
        matches: parsed.matches,
        durationMs,
        linesSeen: parsed.linesSeen,
        linesSkipped: parsed.linesSkipped,
    };
    deps.logger.info('ast_grep complete', {
        durationMs,
        matchCount: parsed.matches.length,
        truncated: parsed.truncated,
    });
    return {
        data: result,
        summary: `sidecoach_ast_grep: ${parsed.matches.length} match(es) in ${durationMs}ms` +
            (parsed.truncated ? ` (truncated at ${maxResults})` : ''),
    };
};
exports.handler = handler;
//# sourceMappingURL=ast-grep.js.map