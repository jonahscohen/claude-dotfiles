"use strict";
// T-0025: container runtime plumbing for the Python REPL tool.
//
// Two concerns live here, both pure-ish and unit-testable in isolation:
//   1. buildDockerArgs() - the EXACT `run` argument vector, including the
//      non-negotiable security flags. Unit-tested to assert the flags are
//      present and unchanged.
//   2. probeRuntime() / runInContainer() - discover docker|podman on PATH
//      (cached per process, mirroring ast-grep's probe-and-cache) and run a
//      one-shot container with stdin->stdout streaming, output caps, and a
//      hard timeout enforced by killing the container (not just the client).
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_OUTPUT_BYTES = exports.CONTAINER_TIMEOUT_MS = exports.DEFAULT_PYTHON_IMAGE = exports.USER_FLAG = exports.TMPFS_FLAG = exports.READONLY_FLAG = exports.CPUS_FLAG = exports.MEMORY_FLAG = exports.NET_FLAG = void 0;
exports.resolveImage = resolveImage;
exports.buildDockerArgs = buildDockerArgs;
exports.probeRuntime = probeRuntime;
exports._resetRuntimeProbe = _resetRuntimeProbe;
exports.runInContainer = runInContainer;
const child_process_1 = require("child_process");
// ---------------------------------------------------------------------------
// Security contract - these values are asserted by a unit test. Changing any
// of them is a deliberate security decision, not an incidental tweak.
// ---------------------------------------------------------------------------
/** No network namespace at all - egress is impossible from inside. */
exports.NET_FLAG = ['--network', 'none'];
/** Memory ceiling. Allocation past this OOM-kills the container (exit 137). */
exports.MEMORY_FLAG = ['--memory', '256m'];
/** Half a core. Bounds a busy loop's blast radius until the timeout fires. */
exports.CPUS_FLAG = ['--cpus', '0.5'];
/** Root filesystem is read-only - no persistence, no tampering with the image. */
exports.READONLY_FLAG = ['--read-only'];
/** The only writable surface, capped at 64m and wiped with the container. */
exports.TMPFS_FLAG = ['--tmpfs', '/tmp:size=64m'];
/** Drop to an unprivileged user; never run code as root. */
exports.USER_FLAG = ['--user', 'nobody'];
/** Default image. Override via SIDECOACH_PYTHON_IMAGE. */
exports.DEFAULT_PYTHON_IMAGE = 'python:3-slim';
/** Container hard-kill budget (ms). The per-tool timeout MUST be >= this. */
exports.CONTAINER_TIMEOUT_MS = 10000;
/** Cap on captured stdout/stderr bytes before truncation marker. */
exports.MAX_OUTPUT_BYTES = 64 * 1024;
function resolveImage() {
    const raw = process.env.SIDECOACH_PYTHON_IMAGE;
    return raw && raw.trim().length > 0 ? raw.trim() : exports.DEFAULT_PYTHON_IMAGE;
}
/**
 * Build the full argument vector for `<runtime> run ...`. Reads python from
 * stdin (`python3 -`) so caller code never lands on disk or in argv.
 *
 * The security flags are emitted in a fixed order. Tests assert each flag
 * pair is present and verbatim.
 */
function buildDockerArgs(opts) {
    return [
        'run',
        '--rm',
        '-i',
        '--name',
        opts.containerName,
        ...exports.NET_FLAG,
        ...exports.MEMORY_FLAG,
        ...exports.CPUS_FLAG,
        ...exports.READONLY_FLAG,
        ...exports.TMPFS_FLAG,
        ...exports.USER_FLAG,
        opts.image,
        'python3',
        '-',
    ];
}
let CACHED_PROBE = null;
function tryVersion(binary) {
    return new Promise((resolve) => {
        (0, child_process_1.execFile)(binary, ['--version'], { timeout: 5000 }, (err) => {
            if (err && err.code === 'ENOENT') {
                resolve(false);
                return;
            }
            // Even a non-zero exit means the binary EXISTS on PATH (which is what we
            // probe for). Daemon-down is handled later at `run` time.
            resolve(true);
        });
    });
}
/**
 * Probe for a container runtime on PATH. docker first, then podman. Cached for
 * the process lifetime (reset via _resetRuntimeProbe in tests).
 */
async function probeRuntime() {
    if (CACHED_PROBE)
        return CACHED_PROBE;
    if (await tryVersion('docker')) {
        CACHED_PROBE = { ok: true, runtime: 'docker' };
        return CACHED_PROBE;
    }
    if (await tryVersion('podman')) {
        CACHED_PROBE = { ok: true, runtime: 'podman' };
        return CACHED_PROBE;
    }
    CACHED_PROBE = {
        ok: false,
        reason: 'neither docker nor podman found on PATH',
    };
    return CACHED_PROBE;
}
/** Test seam - clear the probe cache so tests can switch PATH between cases. */
function _resetRuntimeProbe() {
    CACHED_PROBE = null;
}
const DAEMON_DOWN_RE = /cannot connect to the docker daemon|is the docker daemon running|connection refused|cannot connect to podman|daemon is not running/i;
function clampBytes(buf) {
    if (Buffer.byteLength(buf, 'utf8') <= exports.MAX_OUTPUT_BYTES) {
        return { text: buf, truncated: false };
    }
    // Slice by characters until under the byte cap (cheap, good enough).
    let text = buf.slice(0, exports.MAX_OUTPUT_BYTES);
    while (Buffer.byteLength(text, 'utf8') > exports.MAX_OUTPUT_BYTES) {
        text = text.slice(0, text.length - 256);
    }
    return { text: text + '\n...[truncated]', truncated: true };
}
/**
 * Run one-shot Python code inside a fresh, locked-down container. Streams the
 * code over stdin and captures stdout/stderr (byte-capped). On timeout we
 * abort the client AND issue `<runtime> kill <name>` so the container itself
 * dies rather than leaking - the in-process timeout alone cannot guarantee the
 * container stops.
 */
function runInContainer(opts) {
    const args = buildDockerArgs({ image: opts.image, containerName: opts.containerName });
    const startedAt = Date.now();
    return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let stdoutBytes = 0;
        let stderrBytes = 0;
        let timedOut = false;
        let settled = false;
        const child = (0, child_process_1.spawn)(opts.runtime, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        const finish = (extra) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            const out = clampBytes(stdout);
            const err = clampBytes(stderr);
            const exitCode = extra.exitCode ?? null;
            const daemonDown = DAEMON_DOWN_RE.test(stderr);
            resolve({
                stdout: out.text,
                stderr: err.text,
                exitCode,
                signal: extra.signal ?? null,
                timedOut,
                oomKilled: exitCode === 137 && !timedOut,
                daemonDown,
                spawnError: extra.spawnError,
                durationMs: Date.now() - startedAt,
            });
        };
        const timer = setTimeout(() => {
            timedOut = true;
            // Kill the container itself (the client process exiting does NOT stop
            // the container under all runtimes). Fire-and-forget; --rm cleans up.
            (0, child_process_1.execFile)(opts.runtime, ['kill', opts.containerName], { timeout: 5000 }, () => undefined);
            try {
                child.kill('SIGKILL');
            }
            catch {
                // already gone
            }
        }, opts.timeoutMs);
        if (typeof timer.unref === 'function')
            timer.unref();
        child.stdout.on('data', (chunk) => {
            stdoutBytes += chunk.length;
            if (stdoutBytes <= exports.MAX_OUTPUT_BYTES * 2)
                stdout += chunk.toString('utf8');
        });
        child.stderr.on('data', (chunk) => {
            stderrBytes += chunk.length;
            if (stderrBytes <= exports.MAX_OUTPUT_BYTES * 2)
                stderr += chunk.toString('utf8');
        });
        child.on('error', (err) => {
            finish({ spawnError: err });
        });
        child.on('close', (code, signal) => {
            finish({ exitCode: code, signal });
        });
        // Stream the code in, then close stdin so `python3 -` runs.
        try {
            child.stdin.write(opts.code);
            child.stdin.end();
        }
        catch (err) {
            finish({ spawnError: err });
        }
    });
}
//# sourceMappingURL=python-sandbox.js.map