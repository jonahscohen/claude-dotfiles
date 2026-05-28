"use strict";
// Tool 11: sidecoach_state_set - write a key/value pair to the in-process
// state store with optional TTL override.
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.definition = void 0;
const errors_1 = require("../errors");
const schemas_1 = require("../schemas");
const state_store_1 = require("../state-store");
exports.definition = {
    name: 'sidecoach_state_set',
    description: 'Write a key/value pair to the sidecoach MCP session state store. ' +
        'Default TTL 30 min; override via ttlMs (1ms..24h). Caps: key 4 KiB, value 64 KiB, total 1000 entries. ' +
        'Returns expiresAt + the post-write total entry count.',
    inputSchema: schemas_1.stateSetShape,
    timeoutMs: 5000,
};
const handler = async (input, _deps) => {
    const store = (0, state_store_1.getSharedStore)();
    let result;
    try {
        result = store.set(input.key, input.value, input.ttlMs);
    }
    catch (err) {
        if (err instanceof state_store_1.StoreError) {
            // KEY_TOO_LARGE / VALUE_TOO_LARGE are belt-and-braces - the Zod
            // schema already enforced them - but TOO_MANY_ENTRIES is purely a
            // runtime condition. Surface it as VALIDATOR_FAILURE so callers can
            // distinguish "caller bug" from "store full".
            if (err.code === 'TOO_MANY_ENTRIES') {
                throw new errors_1.SidecoachToolError('VALIDATOR_FAILURE', err.message, {
                    validator: 'state-store',
                    errorMessage: `code=${err.code} limit=${err.limit} observed=${err.observed}`,
                });
            }
            throw new errors_1.SidecoachToolError('INVALID_INPUT', err.message, {
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
exports.handler = handler;
//# sourceMappingURL=state-set.js.map