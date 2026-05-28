// T-0020: Ralph-mode relentless cross-flow iteration.
//
// Distinct from T-0009 (retry-control.ts): T-0009 caps per-handler iteration
// (the polish handler retries polish up to 5 times). T-0020 is CROSS-flow -
// it chains polish -> audit -> critique -> polish -> audit -> ... until ALL
// flows report clean OR a hard cap fires.
//
// The loop runs to convergence (zero findings across all flows in the chain),
// stall (the same finding-signature repeats maxNoProgressIterations times in
// a row), or cap (maxGlobalIterations reached without convergence).
//
// Auto-fix gap (forward-compat): today's sidecoach handlers REPORT findings
// but do not have a fix-mode that applies changes. Without an applyFixes
// step, each iteration produces the same findings, the progress signature
// matches, and the loop halts at maxNoProgressIterations. When handlers
// acquire fix-mode (or an LLM-driven fix step is wired between iterations),
// pass it via opts.applyFixes - the loop will call it after collecting
// findings and before the next iteration, so signatures naturally evolve as
// fixes land.

import * as crypto from 'crypto';

import { FlowId } from './types';
import { FlowExecutionContext, FlowExecutionResult } from './flow-handler';

/**
 * Default flow chain for ralph-mode. Mirrors the T-0020 spec from TASKS.md:
 * tactical-polish -> multi-lens-audit -> design-critique. Each iteration walks
 * this chain in order.
 */
export const DEFAULT_RALPH_FLOW_CHAIN: FlowId[] = [
  'flowJ_tactical_polish',
  'flowK_multi_lens_audit',
  'flowL_design_critique',
];

export const DEFAULT_RALPH_MAX_GLOBAL_ITERATIONS = 10;
export const DEFAULT_RALPH_MAX_NO_PROGRESS_ITERATIONS = 3;

/** Status of a completed ralph loop. */
export type RalphStatus = 'converged' | 'stalled' | 'capped' | 'error';

/**
 * A single finding produced by a flow during one ralph iteration. The shape
 * is intentionally narrow - a finding only needs a stable identity (flowId +
 * validator + ruleId + filePath when relevant) so its presence in successive
 * iterations can be detected via the progress signature. The optional fields
 * carry forward to the caller for surfacing in logs/reports.
 */
export interface RalphFinding {
  flowId: FlowId;
  validator: string;
  ruleId: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'error';
  message?: string;
  filePath?: string;
}

/**
 * Snapshot of one (iteration, flow) pair within the loop. Stored on the
 * RalphResult so callers can inspect the trajectory after the fact.
 */
export interface RalphIterationFlow {
  iteration: number;
  flowId: FlowId;
  findings: RalphFinding[];
  /** Total finding count for this flow on this iteration (cached for log readability). */
  findingCount: number;
  /** When the underlying flow handler errored out, this is the message. */
  error?: string;
}

/**
 * Snapshot of a full iteration across the flow chain. Each iteration record
 * holds one entry per flow in flowChain.
 */
export interface RalphIteration {
  iteration: number;
  flowResults: RalphIterationFlow[];
  /** Aggregate findings across every flow in this iteration. */
  allFindings: RalphFinding[];
  /** sha256-12 hash over the sorted finding identities (see computeProgressSignature). */
  signature: string;
}

export interface RalphResult {
  status: RalphStatus;
  iterations: number;
  /** Total findings remaining at the moment the loop exited. */
  totalFindings: number;
  /** Iteration-by-iteration trace. */
  history: RalphIteration[];
  /** Findings still outstanding when status === 'capped' or 'stalled'. */
  remainingFindings?: RalphFinding[];
  /** Signature that repeated and triggered the stall (status === 'stalled'). */
  lastSignature?: string;
  /** Log lines emitted during the loop. Captured for tests/post-hoc reporting. */
  log: string[];
  /** Top-level error message when status === 'error' (e.g. invalid config). */
  error?: string;
}

export interface RalphOptions {
  maxGlobalIterations?: number;
  maxNoProgressIterations?: number;
  flowChain?: FlowId[];
  /**
   * Injection point: invoked once per (iteration, flow). Implementations run
   * the underlying flow handler against the target and return the findings
   * the validators surfaced. Tests use a mock; production callers wire a
   * real handler-runner here.
   *
   * If omitted, the loop short-circuits with an error - the loop has no
   * default way to invoke flows without a runner, by design (handlers carry
   * non-trivial setup that the loop itself should not hard-code).
   */
  runFlow?: RalphFlowRunner;
  /**
   * Forward-compat: invoked after findings are collected for an iteration
   * and before the next iteration starts. If unset, findings accumulate
   * unchanged - which is the documented "no fix-mode today" behavior.
   * Wire this once handlers grow a fix-mode (or an LLM-driven fix step
   * fits between iterations).
   */
  applyFixes?: RalphFixApplier;
  /** Log sink. Defaults to console.log. Set to a no-op to silence the loop. */
  logger?: (line: string) => void;
}

export type RalphFlowRunner = (input: {
  flowId: FlowId;
  target: string;
  iteration: number;
}) => Promise<RalphFlowRunOutput>;

export interface RalphFlowRunOutput {
  findings: RalphFinding[];
  /** Optional raw result for callers that want the full FlowExecutionResult shape. */
  rawResult?: FlowExecutionResult;
  /** Optional handler-level error. The loop records the error and continues with zero findings for this flow. */
  error?: string;
}

export type RalphFixApplier = (input: {
  iteration: number;
  findings: RalphFinding[];
  target: string;
}) => Promise<void>;

/**
 * Compute a deterministic 12-char hex signature from the set of findings
 * collected during one iteration. Two iterations producing the same findings
 * in any order yield the same signature - which is the "no progress" signal
 * the stall check watches for. Findings are serialized by their stable
 * identity (flowId + validator + ruleId + filePath) so ephemeral fields like
 * message do not destabilize the signature.
 */
export function computeProgressSignature(findings: RalphFinding[]): string {
  const identities = findings
    .map((f) => `${f.flowId}|${f.validator}|${f.ruleId}|${f.filePath || ''}`)
    .sort();
  const payload = JSON.stringify(identities);
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 12);
}

/**
 * Helper to extract findings from a FlowExecutionResult. Provided for
 * convenience to runners that invoke the real handlers - they can map the
 * handler's validationResults / executionMetadata into RalphFinding[] using
 * this routine. Not used inside runRalphLoop itself (the runner is the only
 * thing that knows how its handlers shaped their results).
 */
export function extractFindingsFromFlowResult(
  flowId: FlowId,
  result: FlowExecutionResult,
): RalphFinding[] {
  const findings: RalphFinding[] = [];
  const validationResults = result.validationResults || [];
  for (const vr of validationResults) {
    if (!vr || vr.status === 'pass') continue;
    const failed: string[] = Array.isArray(vr.failedRules) ? vr.failedRules : [];
    for (const ruleId of failed) {
      findings.push({
        flowId,
        validator: vr.domain || 'unknown',
        ruleId,
        severity: vr.status === 'fail' ? 'critical' : undefined,
        message: vr.message,
      });
    }
  }
  return findings;
}

function defaultLogger(line: string): void {
  console.log(line);
}

/**
 * Run a relentless cross-flow loop against `target`. See module header for
 * the contract and the auto-fix gap discussion.
 */
export async function runRalphLoop(
  target: string,
  opts: RalphOptions = {},
): Promise<RalphResult> {
  const log: string[] = [];
  const logger = opts.logger || defaultLogger;
  const emit = (line: string) => {
    log.push(line);
    logger(line);
  };

  const maxGlobalIterations =
    typeof opts.maxGlobalIterations === 'number' && opts.maxGlobalIterations > 0
      ? opts.maxGlobalIterations
      : DEFAULT_RALPH_MAX_GLOBAL_ITERATIONS;
  const maxNoProgressIterations =
    typeof opts.maxNoProgressIterations === 'number' && opts.maxNoProgressIterations > 0
      ? opts.maxNoProgressIterations
      : DEFAULT_RALPH_MAX_NO_PROGRESS_ITERATIONS;
  const flowChain = Array.isArray(opts.flowChain) && opts.flowChain.length > 0
    ? opts.flowChain
    : DEFAULT_RALPH_FLOW_CHAIN;

  // Config sanity: an empty flow chain is meaningless (the loop has nothing
  // to iterate). Return an error result rather than spinning a no-op cap.
  if (!Array.isArray(opts.flowChain) ? false : opts.flowChain.length === 0) {
    const msg = '[ralph] invalid config: flowChain is empty';
    emit(msg);
    return {
      status: 'error',
      iterations: 0,
      totalFindings: 0,
      history: [],
      log,
      error: msg,
    };
  }

  // Without a runFlow injection the loop has no way to invoke handlers.
  // The check is structural (no fallback path that hard-codes handler
  // invocation here) so the failure surfaces immediately rather than as
  // confusing zero-findings convergence.
  if (typeof opts.runFlow !== 'function') {
    const msg = '[ralph] invalid config: runFlow is required';
    emit(msg);
    return {
      status: 'error',
      iterations: 0,
      totalFindings: 0,
      history: [],
      log,
      error: msg,
    };
  }

  const runFlow = opts.runFlow;
  const history: RalphIteration[] = [];

  for (let iteration = 1; iteration <= maxGlobalIterations; iteration++) {
    const flowResults: RalphIterationFlow[] = [];
    const allFindings: RalphFinding[] = [];

    for (const flowId of flowChain) {
      let runOutput: RalphFlowRunOutput;
      try {
        runOutput = await runFlow({ flowId, target, iteration });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        emit(
          `[ralph] iter ${iteration}/${maxGlobalIterations}: ${flowId} runner threw: ${errMsg}`,
        );
        flowResults.push({
          iteration,
          flowId,
          findings: [],
          findingCount: 0,
          error: errMsg,
        });
        continue;
      }

      const findings = Array.isArray(runOutput.findings) ? runOutput.findings : [];
      flowResults.push({
        iteration,
        flowId,
        findings,
        findingCount: findings.length,
        error: runOutput.error,
      });
      allFindings.push(...findings);

      emit(
        `[ralph] iter ${iteration}/${maxGlobalIterations}: ${flowId} found ${findings.length} violations`,
      );
    }

    const signature = computeProgressSignature(allFindings);
    history.push({ iteration, flowResults, allFindings, signature });

    // Convergence: zero findings across every flow in this iteration.
    if (allFindings.length === 0) {
      emit(`[ralph] CONVERGED in ${iteration} iter`);
      return {
        status: 'converged',
        iterations: iteration,
        totalFindings: 0,
        history,
        log,
      };
    }

    // Stall: the last maxNoProgressIterations iterations all share the
    // same signature. Note that we count from the current iteration
    // backward, including it - so once we have maxNoProgressIterations
    // consecutive matches the loop stops.
    if (history.length >= maxNoProgressIterations) {
      const recent = history.slice(-maxNoProgressIterations);
      const recentSig = recent[0].signature;
      if (recentSig && recent.every((h) => h.signature === recentSig)) {
        emit(
          `[ralph] STALLED at iter ${iteration} (same signature ${recentSig} for ${maxNoProgressIterations} iter)`,
        );
        return {
          status: 'stalled',
          iterations: iteration,
          totalFindings: allFindings.length,
          remainingFindings: allFindings,
          history,
          lastSignature: recentSig,
          log,
        };
      }
    }

    // Forward-compat: if a fix-applier is wired, give it a chance to
    // mutate the target between iterations. Today this is a no-op for
    // every real caller; the loop is still useful as a diagnostic that
    // surfaces what would block convergence.
    if (typeof opts.applyFixes === 'function') {
      try {
        await opts.applyFixes({ iteration, findings: allFindings, target });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        emit(`[ralph] iter ${iteration}: applyFixes threw: ${errMsg} (continuing)`);
      }
    }
  }

  // Cap: hit maxGlobalIterations without convergence or stall.
  const finalFindings = history[history.length - 1]?.allFindings || [];
  emit(`[ralph] CAPPED at maxIter (${maxGlobalIterations})`);
  return {
    status: 'capped',
    iterations: maxGlobalIterations,
    totalFindings: finalFindings.length,
    remainingFindings: finalFindings,
    history,
    log,
  };
}

/**
 * Re-export of the FlowExecutionContext shape for callers that want to
 * build their own runFlow injection. Not used by the loop itself.
 */
export type { FlowExecutionContext };
