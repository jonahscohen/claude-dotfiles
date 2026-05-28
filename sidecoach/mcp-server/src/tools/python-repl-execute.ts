// T-0025: Tool 21 - sidecoach_python_repl_execute.
//
// One-shot Python execution inside a locked-down container. Two defensive
// layers:
//   1. Static screen (python-ast-check) rejects os/subprocess/socket imports,
//      __import__/eval/exec/compile, and __builtins__ poking BEFORE a container
//      is ever spawned -> INVALID_INPUT naming the violation.
//   2. The container itself (--network none, --read-only, 256m / 0.5cpu caps,
//      --tmpfs /tmp, --user nobody) is the hard boundary. Code is streamed over
//      stdin; a hard timeout kills the container, not just the client.
//
// Graceful degradation: no docker/podman on PATH -> DOWNSTREAM_UNAVAILABLE.
// Daemon present-but-down -> DOWNSTREAM_UNAVAILABLE. The server never crashes.
//
// A non-zero container exit (a Python traceback, an OOM kill) is a NORMAL REPL
// result, not a tool error - it is returned as data with exitCode + stderr so
// the caller sees what happened. Only a hard timeout maps to TIMEOUT.

import { SidecoachToolError } from '../errors';
import { checkPythonCode } from '../python-ast-check';
import {
  CONTAINER_TIMEOUT_MS,
  probeRuntime,
  resolveImage,
  runInContainer,
} from '../python-sandbox';
import { pythonReplExecuteShape, type PythonReplExecuteInputT } from '../schemas';
import type { ToolDefinition, ToolHandler } from './types';

export const definition: ToolDefinition<typeof pythonReplExecuteShape> = {
  name: 'sidecoach_python_repl_execute',
  description:
    'Execute a one-shot Python snippet inside a locked-down container (docker or podman required on PATH). ' +
    'Sandbox: --network none, --read-only root FS, 256m memory, 0.5 CPU, /tmp tmpfs (64m), runs as nobody. ' +
    'Code is statically screened first: imports of os/subprocess/socket and use of __import__/eval/exec/compile/' +
    '__builtins__ are rejected as INVALID_INPUT before any container starts. Output capped at 64 KiB. ' +
    'Hard 10s container kill. Returns DOWNSTREAM_UNAVAILABLE if no container runtime is available.',
  inputSchema: pythonReplExecuteShape,
  // Per-tool budget MUST exceed the container hard-kill budget so the internal
  // timeout fires (and reports TIMEOUT) well before the wrapper's own race.
  timeoutMs: 30_000,
};

/** Counter for per-call container names (uniqueness within a process). */
let CALL_SEQ = 0;

export const handler: ToolHandler<PythonReplExecuteInputT> = async (input, deps) => {
  // Layer 0: runtime availability.
  const probe = await probeRuntime();
  if (!probe.ok || !probe.runtime) {
    throw new SidecoachToolError(
      'DOWNSTREAM_UNAVAILABLE',
      `Python REPL requires a container runtime: ${probe.reason ?? 'no docker/podman on PATH'}. ` +
        'Install Docker (https://docs.docker.com/get-docker/) or Podman.',
      { resource: 'docker' },
    );
  }

  // Layer 1: static screen before the container is spawned.
  const screen = checkPythonCode(input.code);
  if (!screen.ok) {
    throw new SidecoachToolError(
      'INVALID_INPUT',
      `python code rejected by static screen: ${screen.violation}`,
      { errorMessage: screen.violation },
    );
  }

  const image = resolveImage();
  const timeoutMs = input.timeoutMs ?? CONTAINER_TIMEOUT_MS;
  CALL_SEQ += 1;
  const containerName = `sidecoach-pyrepl-${process.pid}-${Date.now()}-${CALL_SEQ}`;

  const outcome = await runInContainer({
    runtime: probe.runtime,
    image,
    containerName,
    code: input.code,
    timeoutMs,
  });

  // Layer 2 results: classify the container outcome.
  if (outcome.spawnError && outcome.spawnError.code === 'ENOENT') {
    // Runtime vanished between probe and call.
    throw new SidecoachToolError(
      'DOWNSTREAM_UNAVAILABLE',
      `${probe.runtime} runtime vanished mid-call`,
      { resource: 'docker' },
    );
  }
  if (outcome.daemonDown) {
    throw new SidecoachToolError(
      'DOWNSTREAM_UNAVAILABLE',
      `${probe.runtime} daemon is not reachable. Is it running?`,
      { resource: 'docker' },
    );
  }
  if (outcome.timedOut) {
    throw new SidecoachToolError(
      'TIMEOUT',
      `python execution exceeded ${timeoutMs}ms; container killed`,
      { timeoutMs },
    );
  }

  const data = {
    image,
    runtime: probe.runtime,
    exitCode: outcome.exitCode,
    timedOut: false,
    oomKilled: outcome.oomKilled,
    stdout: outcome.stdout,
    stderr: outcome.stderr,
    durationMs: outcome.durationMs,
  };

  deps.logger.info('python_repl_execute complete', {
    runtime: probe.runtime,
    exitCode: outcome.exitCode,
    oomKilled: outcome.oomKilled,
    stdoutBytes: Buffer.byteLength(outcome.stdout, 'utf8'),
    stderrBytes: Buffer.byteLength(outcome.stderr, 'utf8'),
    durationMs: outcome.durationMs,
  });

  const verdict = outcome.oomKilled
    ? 'OOM-killed'
    : outcome.exitCode === 0
      ? 'ok'
      : `exit ${outcome.exitCode}`;
  return {
    data,
    summary: `sidecoach_python_repl_execute: ${verdict} in ${outcome.durationMs}ms (${probe.runtime})`,
  };
};
