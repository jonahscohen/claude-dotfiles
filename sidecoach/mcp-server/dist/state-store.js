"use strict";
// In-process key/value state store with TTL expiry and hard bounds.
//
// T-0022 (close OMC gap #4) extends the sidecoach MCP server with a small,
// scoped state store so agents can carry intermediate values across tool
// calls inside the same MCP session. The store lives on the heap of one
// MCP server process; it has no on-disk artifact, no IPC, and no cross-
// session bleed because each stdio MCP connection is a fresh process.
//
// Bounds (from DESIGN-EXTENSION.md):
//   - key       max 4 KiB
//   - value     max 64 KiB (the caller is expected to JSON.stringify
//                if their payload is non-string; storing a string keeps
//                the byte accounting trivial)
//   - entries   max 1000
//   - ttlMs     1ms .. 24h, default 30 min
//
// Expiry strategy: LAZY on read + a single sweep on every mutating write.
// No setInterval, no event-loop pinning. Worst case the map carries
// stale entries until the next write; the per-call expiry check in `get`
// hides them from callers.
//
// All caps are enforced INSIDE the store (defense in depth - the Zod
// schemas already reject oversize values at the tool boundary, but the
// store is also unit-tested with raw inputs and must guard itself).
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateStore = exports.StoreError = exports.STATE_LIST_KEYS_CAP = exports.STATE_MAX_TTL_MS = exports.STATE_DEFAULT_TTL_MS = exports.STATE_MAX_ENTRIES = exports.STATE_MAX_VALUE_BYTES = exports.STATE_MAX_KEY_BYTES = void 0;
exports.getSharedStore = getSharedStore;
exports.resetSharedStore = resetSharedStore;
exports.STATE_MAX_KEY_BYTES = 4096;
exports.STATE_MAX_VALUE_BYTES = 65536;
exports.STATE_MAX_ENTRIES = 1000;
exports.STATE_DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 min
exports.STATE_MAX_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
exports.STATE_LIST_KEYS_CAP = 100;
class StoreError extends Error {
    constructor(code, message, limit, observed) {
        super(message);
        this.name = 'StateStoreError';
        this.code = code;
        this.limit = limit;
        this.observed = observed;
    }
}
exports.StoreError = StoreError;
class StateStore {
    constructor(clock = Date.now) {
        this.store = new Map();
        this.clock = clock;
    }
    /**
     * Test seam - read-only entry count. Includes expired entries that have
     * not yet been swept. Not exposed via the tool surface.
     */
    size() {
        return this.store.size;
    }
    /**
     * Test seam - drop everything. Not exposed via the tool surface.
     */
    reset() {
        this.store.clear();
    }
    set(rawKey, rawValue, ttlMs) {
        const key = this.validateKey(rawKey);
        const value = this.validateValue(rawValue);
        const ttl = this.validateTtl(ttlMs);
        // Sweep BEFORE the cap check - an entry that just expired should free
        // its slot for the new write. This is also the only sweep that runs;
        // reads use lazy expiry so they never call here.
        this.sweepExpired();
        // If the key already exists, the set is an overwrite and doesn't grow
        // the map - skip the cap check in that case.
        if (!this.store.has(key) && this.store.size >= exports.STATE_MAX_ENTRIES) {
            throw new StoreError('TOO_MANY_ENTRIES', `state store at capacity: ${exports.STATE_MAX_ENTRIES} entries`, exports.STATE_MAX_ENTRIES, this.store.size);
        }
        const expiresAt = this.clock() + ttl;
        this.store.set(key, { value, expiresAt });
        return { key, expiresAt, totalEntries: this.store.size };
    }
    get(rawKey) {
        const key = this.validateKey(rawKey);
        const entry = this.store.get(key);
        if (!entry) {
            return { key, value: null };
        }
        if (entry.expiresAt <= this.clock()) {
            // Lazy expiry - drop the stale entry so it doesn't count against the
            // cap and won't appear in list_keys.
            this.store.delete(key);
            return { key, value: null };
        }
        return { key, value: entry.value, expiresAt: entry.expiresAt };
    }
    delete(rawKey) {
        const key = this.validateKey(rawKey);
        const deleted = this.store.delete(key);
        return { key, deleted };
    }
    listKeys(prefix) {
        // Sweep to ensure list does not surface stale entries. List can be the
        // first call after a long idle - sweeping here is the only place that
        // catches that case.
        this.sweepExpired();
        const trimmedPrefix = prefix ?? '';
        if (trimmedPrefix.length > exports.STATE_MAX_KEY_BYTES) {
            // Defensive - schemas cap prefix at the same key cap, but make sure.
            throw new StoreError('KEY_TOO_LARGE', `list_keys prefix exceeds key byte cap (${exports.STATE_MAX_KEY_BYTES})`, exports.STATE_MAX_KEY_BYTES, Buffer.byteLength(trimmedPrefix, 'utf8'));
        }
        const matches = [];
        for (const [key, entry] of this.store.entries()) {
            if (trimmedPrefix && !key.startsWith(trimmedPrefix))
                continue;
            matches.push({ key, expiresAt: entry.expiresAt });
        }
        // Stable sort by key for deterministic test assertions + better UX.
        matches.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        const totalMatches = matches.length;
        const capped = matches.slice(0, exports.STATE_LIST_KEYS_CAP);
        return {
            keys: capped,
            totalMatches,
            truncated: totalMatches > capped.length,
        };
    }
    // ---------------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------------
    validateKey(rawKey) {
        if (typeof rawKey !== 'string') {
            throw new StoreError('KEY_TOO_LARGE', `state key must be a string, got ${typeof rawKey}`, exports.STATE_MAX_KEY_BYTES, 0);
        }
        const bytes = Buffer.byteLength(rawKey, 'utf8');
        if (bytes > exports.STATE_MAX_KEY_BYTES) {
            throw new StoreError('KEY_TOO_LARGE', `state key exceeds max ${exports.STATE_MAX_KEY_BYTES} bytes (got ${bytes})`, exports.STATE_MAX_KEY_BYTES, bytes);
        }
        if (rawKey.length === 0) {
            throw new StoreError('KEY_TOO_LARGE', 'state key cannot be empty', exports.STATE_MAX_KEY_BYTES, 0);
        }
        return rawKey;
    }
    validateValue(rawValue) {
        if (typeof rawValue !== 'string') {
            throw new StoreError('VALUE_TOO_LARGE', `state value must be a string, got ${typeof rawValue}`, exports.STATE_MAX_VALUE_BYTES, 0);
        }
        const bytes = Buffer.byteLength(rawValue, 'utf8');
        if (bytes > exports.STATE_MAX_VALUE_BYTES) {
            throw new StoreError('VALUE_TOO_LARGE', `state value exceeds max ${exports.STATE_MAX_VALUE_BYTES} bytes (got ${bytes})`, exports.STATE_MAX_VALUE_BYTES, bytes);
        }
        return rawValue;
    }
    validateTtl(ttlMs) {
        if (ttlMs === undefined)
            return exports.STATE_DEFAULT_TTL_MS;
        if (!Number.isFinite(ttlMs) || !Number.isInteger(ttlMs) || ttlMs < 1) {
            throw new StoreError('INVALID_TTL', `ttlMs must be a positive integer (got ${String(ttlMs)})`, exports.STATE_MAX_TTL_MS, Number.isFinite(ttlMs) ? Number(ttlMs) : 0);
        }
        if (ttlMs > exports.STATE_MAX_TTL_MS) {
            throw new StoreError('INVALID_TTL', `ttlMs exceeds max ${exports.STATE_MAX_TTL_MS} (got ${ttlMs})`, exports.STATE_MAX_TTL_MS, ttlMs);
        }
        return ttlMs;
    }
    // ---------------------------------------------------------------------------
    // Sweep
    // ---------------------------------------------------------------------------
    /**
     * Drop entries whose expiresAt has passed. Called on mutating writes and
     * on listKeys (never on get - get does its own lazy single-key check).
     */
    sweepExpired() {
        const now = this.clock();
        // Collect keys first so we don't mutate the map mid-iteration.
        const toDrop = [];
        for (const [key, entry] of this.store.entries()) {
            if (entry.expiresAt <= now)
                toDrop.push(key);
        }
        for (const key of toDrop) {
            this.store.delete(key);
        }
    }
}
exports.StateStore = StateStore;
/**
 * Module-level singleton. The MCP server is one process; one store. Tests
 * can inject their own StateStore by constructing one directly.
 */
let SHARED = null;
function getSharedStore() {
    if (!SHARED)
        SHARED = new StateStore();
    return SHARED;
}
/** Test helper - drop the singleton so the next call rebuilds it. */
function resetSharedStore() {
    SHARED = null;
}
//# sourceMappingURL=state-store.js.map