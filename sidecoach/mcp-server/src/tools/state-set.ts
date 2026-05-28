// Tool 11: sidecoach_state_set - write a key/value pair to the in-process
// state store with optional TTL override.

import { SidecoachToolError } from '../errors';
import { stateSetShape, type StateSetInputT } from '../schemas';
import { StoreError, getSharedStore } from '../state-store';
import type { ToolDefinition, ToolHandler } from './types';

export const definition: ToolDefinition<typeof stateSetShape> = {
  name: 'sidecoach_state_set',
  description:
    'Write a key/value pair to the sidecoach MCP session state store. ' +
    'Default TTL 30 min; override via ttlMs (1ms..24h). Caps: key 4 KiB, value 64 KiB, total 1000 entries. ' +
    'Returns expiresAt + the post-write total entry count.',
  inputSchema: stateSetShape,
  timeoutMs: 5_000,
};

export const handler: ToolHandler<StateSetInputT> = async (input, _deps) => {
  const store = getSharedStore();
  let result;
  try {
    result = store.set(input.key, input.value, input.ttlMs);
  } catch (err) {
    if (err instanceof StoreError) {
      // KEY_TOO_LARGE / VALUE_TOO_LARGE are belt-and-braces - the Zod
      // schema already enforced them - but TOO_MANY_ENTRIES is purely a
      // runtime condition. Surface it as VALIDATOR_FAILURE so callers can
      // distinguish "caller bug" from "store full".
      if (err.code === 'TOO_MANY_ENTRIES') {
        throw new SidecoachToolError(
          'VALIDATOR_FAILURE',
          err.message,
          {
            validator: 'state-store',
            errorMessage: `code=${err.code} limit=${err.limit} observed=${err.observed}`,
          },
        );
      }
      throw new SidecoachToolError('INVALID_INPUT', err.message, {
        errorMessage: `code=${err.code} limit=${err.limit} observed=${err.observed}`,
      });
    }
    throw err;
  }
  return {
    data: result,
    summary: `sidecoach_state_set: key="${result.key}" expiresAt=${result.expiresAt} total=${result.totalEntries}`,
  };
};
