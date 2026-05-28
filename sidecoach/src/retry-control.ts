// Phase-gated retry control for sidecoach polish/audit/critique flow handlers.
//
// Caps iteration count at `maxCycles` (default 5) and halts early after
// `identicalErrorThreshold` (default 3) consecutive iterations producing the
// same error signature. Stops the failure mode where the orchestrator keeps
// re-running validators against an unchanged fix.
//
// Pattern adapted from OMC's autopilot flow (5-cycle cap + identical-error
// halt). T-0009 in TASKS.md tracks this work.

import * as crypto from 'crypto';

import { FlowExecutionContext, FlowExecutionResult } from './flow-handler';
import { FlowId } from './types';

export interface RetryConfig {
  maxCycles: number;
  identicalErrorThreshold: number;
}

export interface RetryState {
  cycleCount: number;
  errorSignatures: string[];
}

export interface ErrorSignatureInput {
  validator: string;
  failedRules: string[];
  filePath: string;
}

export type HaltReason = 'max_cycles' | 'identical_error_loop';

export interface HaltDecision {
  halt: boolean;
  reason?: HaltReason;
  message?: string;
  cycleCount: number;
  signature?: string;
  attemptCount?: number;
  lastErrorSignature?: string;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = Object.freeze({
  maxCycles: 5,
  identicalErrorThreshold: 3,
});

/**
 * Read retry config from context.metadata.retryConfig, applying defaults for
 * any missing field. Callers can override either field independently.
 */
export function readRetryConfig(context: FlowExecutionContext): RetryConfig {
  const provided = context.metadata?.retryConfig as Partial<RetryConfig> | undefined;
  return {
    maxCycles:
      typeof provided?.maxCycles === 'number' && provided.maxCycles > 0
        ? provided.maxCycles
        : DEFAULT_RETRY_CONFIG.maxCycles,
    identicalErrorThreshold:
      typeof provided?.identicalErrorThreshold === 'number' && provided.identicalErrorThreshold > 0
        ? provided.identicalErrorThreshold
        : DEFAULT_RETRY_CONFIG.identicalErrorThreshold,
  };
}

/**
 * Read retry state from context.metadata.retryState, returning a fresh-zero
 * state if not present. Fresh state means cycleCount=0 and no signatures
 * recorded - the next iteration is iteration 1.
 */
export function readRetryState(context: FlowExecutionContext): RetryState {
  const provided = context.metadata?.retryState as Partial<RetryState> | undefined;
  return {
    cycleCount: typeof provided?.cycleCount === 'number' ? provided.cycleCount : 0,
    errorSignatures: Array.isArray(provided?.errorSignatures) ? [...provided.errorSignatures] : [],
  };
}

/**
 * Compute a deterministic 12-char hex signature from a validator name, the
 * sorted list of failed rule IDs, and the file path being validated. Two
 * iterations producing the same set of failed rules in the same validator
 * against the same file collide on this signature - which is exactly the
 * "still broken in the same way" signal the identical-error halt watches for.
 */
export function computeErrorSignature(input: ErrorSignatureInput): string {
  const sortedRules = [...input.failedRules].sort();
  const payload = JSON.stringify({
    validator: input.validator,
    failedRules: sortedRules,
    filePath: input.filePath,
  });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 12);
}

/**
 * Evaluate halt conditions against current retry state. Called BEFORE running
 * the next iteration. Returns {halt: false} when iteration can proceed,
 * {halt: true, ...} when a cap is hit.
 *
 * Order matters: max_cycles is checked first so a maxed-out loop that also
 * happens to have identical errors halts as "max_cycles" (the broader cause)
 * rather than the narrower identical-error reason.
 */
export function evaluateHaltConditions(state: RetryState, config: RetryConfig): HaltDecision {
  // 1. Max cycles cap.
  if (state.cycleCount >= config.maxCycles) {
    const last = state.errorSignatures[state.errorSignatures.length - 1];
    return {
      halt: true,
      reason: 'max_cycles',
      message: `halted: max cycles reached (cycleCount=${state.cycleCount} maxCycles=${config.maxCycles})`,
      cycleCount: state.cycleCount,
      lastErrorSignature: last,
    };
  }

  // 2. Identical-error loop: last N entries all match, where N = threshold.
  // Only triggers when we have at least `threshold` signatures recorded.
  const threshold = config.identicalErrorThreshold;
  if (state.errorSignatures.length >= threshold) {
    const lastN = state.errorSignatures.slice(-threshold);
    const first = lastN[0];
    if (first && lastN.every((sig) => sig === first)) {
      return {
        halt: true,
        reason: 'identical_error_loop',
        message: `halted after ${threshold} identical attempts at signature=${first}`,
        cycleCount: state.cycleCount,
        signature: first,
        attemptCount: threshold,
      };
    }
  }

  return { halt: false, cycleCount: state.cycleCount };
}

/**
 * Append a new iteration to retry state. Returns a new state object - does
 * not mutate the input.
 */
export function recordIteration(state: RetryState, signature: string): RetryState {
  return {
    cycleCount: state.cycleCount + 1,
    errorSignatures: [...state.errorSignatures, signature],
  };
}

/**
 * Build a halt result with the right shape for a flow handler return. The
 * caller passes the handler's flowId and flowName for the result envelope and
 * an optional log-prefix used in the emitted console.log line.
 */
export function buildHaltResult(
  flowId: FlowId,
  flowName: string,
  decision: HaltDecision,
  validatorName: string,
  logPrefix?: string,
): FlowExecutionResult {
  // Emit the halt log so callers (and humans tailing the orchestrator) see
  // exactly why the loop stopped. The bash hook layer can grep for "halted:"
  // or "halted after" to surface these into the session summary.
  const prefix = logPrefix ? `${logPrefix} ` : '';
  if (decision.reason === 'max_cycles') {
    console.log(`${prefix}${decision.message}`);
  } else if (decision.reason === 'identical_error_loop') {
    console.log(
      `${prefix}${decision.message} (validator=${validatorName}, attemptCount=${decision.attemptCount})`,
    );
  }

  return {
    flowId,
    flowName,
    status: 'error',
    message:
      decision.reason === 'max_cycles'
        ? `Retry halted: max cycles reached (cycleCount=${decision.cycleCount})`
        : `Retry halted: ${decision.attemptCount} identical attempts at signature=${decision.signature}`,
    error: decision.message,
    executionMetadata: {
      enhancedContext: {
        retryHalt: {
          reason: decision.reason,
          cycleCount: decision.cycleCount,
          signature: decision.signature,
          lastErrorSignature: decision.lastErrorSignature,
          attemptCount: decision.attemptCount,
          validator: validatorName,
        },
      },
    },
  };
}

/**
 * Attach retry tracking to a successful (or partial-success) result so the
 * next invocation of the same handler can see updated state.
 */
export function attachRetryStateToResult(
  result: FlowExecutionResult,
  nextState: RetryState,
  config: RetryConfig,
): FlowExecutionResult {
  result.executionMetadata = result.executionMetadata || {};
  // Stash both state + config on enhancedContext so the orchestrator can
  // round-trip them into the next context.metadata.retry* slot without
  // reaching into result internals.
  result.executionMetadata.enhancedContext = {
    ...(result.executionMetadata.enhancedContext || {}),
    retryState: nextState,
    retryConfig: config,
  };
  return result;
}
