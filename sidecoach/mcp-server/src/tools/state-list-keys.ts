// Tool 14: sidecoach_state_list_keys - enumerate live keys in the in-process
// state store, optionally filtered by prefix.
//
// Results capped at 100 keys per call. `truncated` is true when more matches
// exist than were returned; callers can narrow the prefix to drill down.
// `totalMatches` reports the pre-cap count so callers know the real size.

import { SidecoachToolError } from '../errors';
import { stateListKeysShape, type StateListKeysInputT } from '../schemas';
import { StoreError, getSharedStore } from '../state-store';
import type { ToolDefinition, ToolHandler } from './types';

export const definition: ToolDefinition<typeof stateListKeysShape> = {
  name: 'sidecoach_state_list_keys',
  description:
    'List currently-live keys in the sidecoach MCP session state store. Optional prefix filter. ' +
    'Capped at 100 keys per call - the response includes totalMatches + truncated to surface overflow.',
  inputSchema: stateListKeysShape,
  timeoutMs: 5_000,
};

export const handler: ToolHandler<StateListKeysInputT> = async (input, _deps) => {
  const store = getSharedStore();
  let result;
  try {
    result = store.listKeys(input.prefix);
  } catch (err) {
    if (err instanceof StoreError) {
      throw new SidecoachToolError('INVALID_INPUT', err.message, {
        errorMessage: `code=${err.code} limit=${err.limit} observed=${err.observed}`,
      });
    }
    throw err;
  }
  return {
    data: result,
    summary:
      `sidecoach_state_list_keys: ${result.keys.length} returned ` +
      `(${result.totalMatches} matched${result.truncated ? ', truncated' : ''})`,
  };
};
