export declare const STATE_MAX_KEY_BYTES = 4096;
export declare const STATE_MAX_VALUE_BYTES = 65536;
export declare const STATE_MAX_ENTRIES = 1000;
export declare const STATE_DEFAULT_TTL_MS: number;
export declare const STATE_MAX_TTL_MS: number;
export declare const STATE_LIST_KEYS_CAP = 100;
export type StoreErrorCode = 'KEY_TOO_LARGE' | 'VALUE_TOO_LARGE' | 'TOO_MANY_ENTRIES' | 'INVALID_TTL';
export declare class StoreError extends Error {
    readonly code: StoreErrorCode;
    readonly limit: number;
    readonly observed: number;
    constructor(code: StoreErrorCode, message: string, limit: number, observed: number);
}
export interface SetResult {
    key: string;
    expiresAt: number;
    /** Total entries AFTER the set (post-sweep + insert). */
    totalEntries: number;
}
export interface GetResult {
    key: string;
    value: string | null;
    /** Present only when the key was live; absent when expired or missing. */
    expiresAt?: number;
}
export interface DeleteResult {
    key: string;
    deleted: boolean;
}
export interface ListKeysResult {
    keys: Array<{
        key: string;
        expiresAt: number;
    }>;
    /** Total live keys matching the prefix, before the page cap. */
    totalMatches: number;
    /** True when totalMatches > keys.length (caller hit the cap). */
    truncated: boolean;
}
/**
 * Allow tests to inject a mock clock. Production callers omit this and the
 * store uses `Date.now()`. The signature is parameterless to match Date.now.
 */
export type Clock = () => number;
export declare class StateStore {
    private readonly store;
    private readonly clock;
    constructor(clock?: Clock);
    /**
     * Test seam - read-only entry count. Includes expired entries that have
     * not yet been swept. Not exposed via the tool surface.
     */
    size(): number;
    /**
     * Test seam - drop everything. Not exposed via the tool surface.
     */
    reset(): void;
    set(rawKey: unknown, rawValue: unknown, ttlMs?: number): SetResult;
    get(rawKey: unknown): GetResult;
    delete(rawKey: unknown): DeleteResult;
    listKeys(prefix?: string): ListKeysResult;
    private validateKey;
    private validateValue;
    private validateTtl;
    /**
     * Drop entries whose expiresAt has passed. Called on mutating writes and
     * on listKeys (never on get - get does its own lazy single-key check).
     */
    private sweepExpired;
}
export declare function getSharedStore(): StateStore;
/** Test helper - drop the singleton so the next call rebuilds it. */
export declare function resetSharedStore(): void;
//# sourceMappingURL=state-store.d.ts.map