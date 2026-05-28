// Tool 13: sidecoach_state_delete - drop a key from the in-process state store.
//
// Deleting a missing key is not an error - it returns {deleted: false}. The
// caller can use this as an idempotent "ensure not present" operation.

import { SidecoachToolError } from '../errors';
import { stateDeleteShape, type StateDeleteInputT } from '../schemas';
import { StoreError, getSharedStore } from '../state-store';
import type { ToolDefinition, ToolHandler } from './types';

export const definition: ToolDefinition<typeof stateDeleteShape> = {
  name: 'sidecoach_state_delete',
  description:
    'Drop a key from the sidecoach MCP session state store. Returns {key, deleted: boolean}. ' +
    'Deleting a missing key is not an error.',
  inputSchema: stateDeleteShape,
  timeoutMs: 5_000,
};

export const handler: ToolHandler<StateDeleteInputT> = async (input, _deps) => {
  const store = getSharedStore();
  let result;
  try {
    result = store.delete(input.key);
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
    summary: `sidecoach_state_delete: key="${result.key}" deleted=${result.deleted}`,
  };
};
