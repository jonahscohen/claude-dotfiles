// Tool 12: sidecoach_state_get - read a key from the in-process state store.
//
// Missing or expired keys are NOT errors - they return {value: null}. This
// matches how callers normally use a TTL store: "is the cached value still
// here? if not, recompute and set it."

import { SidecoachToolError } from '../errors';
import { stateGetShape, type StateGetInputT } from '../schemas';
import { StoreError, getSharedStore } from '../state-store';
import type { ToolDefinition, ToolHandler } from './types';

export const definition: ToolDefinition<typeof stateGetShape> = {
  name: 'sidecoach_state_get',
  description:
    'Read a key from the sidecoach MCP session state store. Returns {key, value, expiresAt} ' +
    'when present and live; {key, value: null} when missing or expired (expiry is lazy on read).',
  inputSchema: stateGetShape,
  timeoutMs: 5_000,
};

export const handler: ToolHandler<StateGetInputT> = async (input, _deps) => {
  const store = getSharedStore();
  let result;
  try {
    result = store.get(input.key);
  } catch (err) {
    if (err instanceof StoreError) {
      throw new SidecoachToolError('INVALID_INPUT', err.message, {
        errorMessage: `code=${err.code} limit=${err.limit} observed=${err.observed}`,
      });
    }
    throw err;
  }
  const summary = result.value === null
    ? `sidecoach_state_get: key="${result.key}" miss`
    : `sidecoach_state_get: key="${result.key}" hit (${Buffer.byteLength(result.value, 'utf8')} bytes)`;
  return {
    data: result,
    summary,
  };
};
