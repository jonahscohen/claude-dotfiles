/** No network namespace at all - egress is impossible from inside. */
export declare const NET_FLAG: readonly ["--network", "none"];
/** Memory ceiling. Allocation past this OOM-kills the container (exit 137). */
export declare const MEMORY_FLAG: readonly ["--memory", "256m"];
/** Half a core. Bounds a busy loop's blast radius until the timeout fires. */
export declare const CPUS_FLAG: readonly ["--cpus", "0.5"];
/** Root filesystem is read-only - no persistence, no tampering with the image. */
export declare const READONLY_FLAG: readonly ["--read-only"];
/** The only writable surface, capped at 64m and wiped with the container. */
export declare const TMPFS_FLAG: readonly ["--tmpfs", "/tmp:size=64m"];
/** Drop to an unprivileged user; never run code as root. */
export declare const USER_FLAG: readonly ["--user", "nobody"];
/** Default image. Override via SIDECOACH_PYTHON_IMAGE. */
export declare const DEFAULT_PYTHON_IMAGE = "python:3-slim";
/** Container hard-kill budget (ms). The per-tool timeout MUST be >= this. */
export declare const CONTAINER_TIMEOUT_MS = 10000;
/** Cap on captured stdout/stderr bytes before truncation marker. */
export declare const MAX_OUTPUT_BYTES: number;
export declare function resolveImage(): string;
export interface DockerArgsOptions {
    image: string;
    containerName: string;
}
/**
 * Build the full argument vector for `<runtime> run ...`. Reads python from
 * stdin (`python3 -`) so caller code never lands on disk or in argv.
 *
 * The security flags are emitted in a fixed order. Tests assert each flag
 * pair is present and verbatim.
 */
export declare function buildDockerArgs(opts: DockerArgsOptions): string[];
export interface ProbeResult {
    ok: boolean;
    /** The runtime binary found on PATH ('docker' | 'podman'). */
    runtime?: 'docker' | 'podman';
    reason?: string;
}
/**
 * Probe for a container runtime on PATH. docker first, then podman. Cached for
 * the process lifetime (reset via _resetRuntimeProbe in tests).
 */
export declare function probeRuntime(): Promise<ProbeResult>;
/** Test seam - clear the probe cache so tests can switch PATH between cases. */
export declare function _resetRuntimeProbe(): void;
export interface RunOptions {
    runtime: 'docker' | 'podman';
    image: string;
    containerName: string;
    code: string;
    timeoutMs: number;
}
export interface RunResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    timedOut: boolean;
    oomKilled: boolean;
    /** True when the runtime binary exists but its daemon is unreachable. */
    daemonDown: boolean;
    spawnError?: NodeJS.ErrnoException;
    durationMs: number;
}
/**
 * Run one-shot Python code inside a fresh, locked-down container. Streams the
 * code over stdin and captures stdout/stderr (byte-capped). On timeout we
 * abort the client AND issue `<runtime> kill <name>` so the container itself
 * dies rather than leaking - the in-process timeout alone cannot guarantee the
 * container stops.
 */
export declare function runInContainer(opts: RunOptions): Promise<RunResult>;
//# sourceMappingURL=python-sandbox.d.ts.map