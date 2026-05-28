"use strict";
// Tool 13: sidecoach_state_delete - drop a key from the in-process state store.
//
// Deleting a missing key is not an error - it returns {deleted: false}. The
// caller can use this as an idempotent "ensure not present" operation.
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.definition = void 0;
const errors_1 = require("../errors");
const schemas_1 = require("../schemas");
const state_store_1 = require("../state-store");
exports.definition = {
    name: 'sidecoach_state_delete',
    description: 'Drop a key from the sidecoach MCP session state store. Returns {key, deleted: boolean}. ' +
        'Deleting a missing key is not an error.',
    inputSchema: schemas_1.stateDeleteShape,
    timeoutMs: 5000,
};
const handler = async (input, _deps) => {
    const store = (0, state_store_1.getSharedStore)();
    let result;
    try {
        result = store.delete(input.key);
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
        summary: `sidecoach_state_delete: key="${result.key}" deleted=${result.deleted}`,
    };
};
exports.handler = handler;
//# sourceMappingURL=state-delete.js.map