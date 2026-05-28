"use strict";
// Tool 14: sidecoach_state_list_keys - enumerate live keys in the in-process
// state store, optionally filtered by prefix.
//
// Results capped at 100 keys per call. `truncated` is true when more matches
// exist than were returned; callers can narrow the prefix to drill down.
// `totalMatches` reports the pre-cap count so callers know the real size.
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.definition = void 0;
const errors_1 = require("../errors");
const schemas_1 = require("../schemas");
const state_store_1 = require("../state-store");
exports.definition = {
    name: 'sidecoach_state_list_keys',
    description: 'List currently-live keys in the sidecoach MCP session state store. Optional prefix filter. ' +
        'Capped at 100 keys per call - the response includes totalMatches + truncated to surface overflow.',
    inputSchema: schemas_1.stateListKeysShape,
    timeoutMs: 5000,
};
const handler = async (input, _deps) => {
    const store = (0, state_store_1.getSharedStore)();
    let result;
    try {
        result = store.listKeys(input.prefix);
    }
    catch (err) {
        if (err instanceof state_store_1.StoreError) {
            throw new errors_1.SidecoachToolError('INVALID_INPUT', err.message, {
                errorMessage: `code=${err.code} limit=${err.limit} observed=${err.observed}`,
            });
        }
        throw err;
    }
    return {
        data: result,
        summary: `sidecoach_state_list_keys: ${result.keys.length} returned ` +
            `(${result.totalMatches} matched${result.truncated ? ', truncated' : ''})`,
    };
};
exports.handler = handler;
//# sourceMappingURL=state-list-keys.js.map