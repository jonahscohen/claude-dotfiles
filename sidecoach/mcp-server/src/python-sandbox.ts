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

import { execFile, spawn } from 'child_process';

// ---------------------------------------------------------------------------
// Security contract - these values are asserted by a unit test. Changing any
// of them is a deliberate security decision, not an incidental tweak.
// ---------------------------------------------------------------------------

/** No network namespace at all - egress is impossible from inside. */
export const NET_FLAG = ['--network', 'none'] as const;
/** Memory ceiling. Allocation past this OOM-kills the container (exit 137). */
export const MEMORY_FLAG = ['--memory', '256m'] as const;
/** Half a core. Bounds a busy loop's blast radius until the timeout fires. */
export const CPUS_FLAG = ['--cpus', '0.5'] as const;
/** Root filesystem is read-only - no persistence, no tampering with the image. */
export const READONLY_FLAG = ['--read-only'] as const;
/** The only writable surface, capped at 64m and wiped with the container. */
export const TMPFS_FLAG = ['--tmpfs', '/tmp:size=64m'] as const;
/** Drop to an unprivileged user; never run code as root. */
export const USER_FLAG = ['--user', 'nobody'] as const;

/** Default image. Override via SIDECOACH_PYTHON_IMAGE. */
export const DEFAULT_PYTHON_IMAGE = 'python:3-slim';

/** Container hard-kill budget (ms). The per-tool timeout MUST be >= this. */
export const CONTAINER_TIMEOUT_MS = 10_000;

/** Cap on captured stdout/stderr bytes before truncation marker. */
export const MAX_OUTPUT_BYTES = 64 * 1024;

export function resolveImage(): string {
  const raw = process.env.SIDECOACH_PYTHON_IMAGE;
  return raw && raw.trim().length > 0 ? raw.trim() : DEFAULT_PYTHON_IMAGE;
}

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
export function buildDockerArgs(opts: DockerArgsOptions): string[] {
  return [
    'run',
    '--rm',
    '-i',
    '--name',
    opts.containerName,
    ...NET_FLAG,
    ...MEMORY_FLAG,
    ...CPUS_FLAG,
    ...READONLY_FLAG,
    ...TMPFS_FLAG,
    ...USER_FLAG,
    opts.image,
    'python3',
    '-',
  ];
}

// ---------------------------------------------------------------------------
// Runtime probe (docker | podman), cached per process.
// ---------------------------------------------------------------------------

export interface ProbeResult {
  ok: boolean;
  /** The runtime binary found on PATH ('docker' | 'podman'). */
  runtime?: 'docker' | 'podman';
  reason?: string;
}

let CACHED_PROBE: ProbeResult | null = null;

function tryVersion(binary: 'docker' | 'podman'): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(binary, ['--version'], { timeout: 5_000 }, (err) => {
      if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
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
export async function probeRuntime(): Promise<ProbeResult> {
  if (CACHED_PROBE) return CACHED_PROBE;
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
export function _resetRuntimeProbe(): void {
  CACHED_PROBE = null;
}

// ---------------------------------------------------------------------------
// Container execution.
// ---------------------------------------------------------------------------

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

const DAEMON_DOWN_RE = /cannot connect to the docker daemon|is the docker daemon running|connection refused|cannot connect to podman|daemon is not running/i;

function clampBytes(buf: string): { text: string; truncated: boolean } {
  if (Buffer.byteLength(buf, 'utf8') <= MAX_OUTPUT_BYTES) {
    return { text: buf, truncated: false };
  }
  // Slice by characters until under the byte cap (cheap, good enough).
  let text = buf.slice(0, MAX_OUTPUT_BYTES);
  while (Buffer.byteLength(text, 'utf8') > MAX_OUTPUT_BYTES) {
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
export function runInContainer(opts: RunOptions): Promise<RunResult> {
  const args = buildDockerArgs({ image: opts.image, containerName: opts.containerName });
  const startedAt = Date.now();

  return new Promise<RunResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let settled = false;

    const child = spawn(opts.runtime, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    const finish = (extra: Partial<RunResult>): void => {
      if (settled) return;
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
      execFile(opts.runtime, ['kill', opts.containerName], { timeout: 5_000 }, () => undefined);
      try {
        child.kill('SIGKILL');
      } catch {
        // already gone
      }
    }, opts.timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes <= MAX_OUTPUT_BYTES * 2) stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes <= MAX_OUTPUT_BYTES * 2) stderr += chunk.toString('utf8');
    });

    child.on('error', (err) => {
      finish({ spawnError: err as NodeJS.ErrnoException });
    });

    child.on('close', (code, signal) => {
      finish({ exitCode: code, signal });
    });

    // Stream the code in, then close stdin so `python3 -` runs.
    try {
      child.stdin.write(opts.code);
      child.stdin.end();
    } catch (err) {
      finish({ spawnError: err as NodeJS.ErrnoException });
    }
  });
}
