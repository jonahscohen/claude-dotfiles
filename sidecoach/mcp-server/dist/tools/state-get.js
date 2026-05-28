"use strict";
// Tool 12: sidecoach_state_get - read a key from the in-process state store.
//
// Missing or expired keys are NOT errors - they return {value: null}. This
// matches how callers normally use a TTL store: "is the cached value still
// here? if not, recompute and set it."
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.definition = void 0;
const errors_1 = require("../errors");
const schemas_1 = require("../schemas");
const state_store_1 = require("../state-store");
exports.definition = {
    name: 'sidecoach_state_get',
    description: 'Read a key from the sidecoach MCP session state store. Returns {key, value, expiresAt} ' +
        'when present and live; {key, value: null} when missing or expired (expiry is lazy on read).',
    inputSchema: schemas_1.stateGetShape,
    timeoutMs: 5000,
};
const handler = async (input, _deps) => {
    const store = (0, state_store_1.getSharedStore)();
    let result;
    try {
        result = store.get(input.key);
    }
    catch (err) {
        if (err instanceof state_store_1.StoreError) {
            throw new errors_1.SidecoachToolError('INVALID_INPUT', err.message, {
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
exports.handler = handler;
//# sourceMappingURL=state-get.js.map