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

export const STATE_MAX_KEY_BYTES = 4096;
export const STATE_MAX_VALUE_BYTES = 65_536;
export const STATE_MAX_ENTRIES = 1000;
export const STATE_DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 min
export const STATE_MAX_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
export const STATE_LIST_KEYS_CAP = 100;

export type StoreErrorCode =
  | 'KEY_TOO_LARGE'
  | 'VALUE_TOO_LARGE'
  | 'TOO_MANY_ENTRIES'
  | 'INVALID_TTL';

export class StoreError extends Error {
  public readonly code: StoreErrorCode;
  public readonly limit: number;
  public readonly observed: number;

  constructor(code: StoreErrorCode, message: string, limit: number, observed: number) {
    super(message);
    this.name = 'StateStoreError';
    this.code = code;
    this.limit = limit;
    this.observed = observed;
  }
}

interface Entry {
  value: string;
  expiresAt: number; // epoch ms
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
  keys: Array<{ key: string; expiresAt: number }>;
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

export class StateStore {
  private readonly store = new Map<string, Entry>();
  private readonly clock: Clock;

  constructor(clock: Clock = Date.now) {
    this.clock = clock;
  }

  /**
   * Test seam - read-only entry count. Includes expired entries that have
   * not yet been swept. Not exposed via the tool surface.
   */
  public size(): number {
    return this.store.size;
  }

  /**
   * Test seam - drop everything. Not exposed via the tool surface.
   */
  public reset(): void {
    this.store.clear();
  }

  public set(rawKey: unknown, rawValue: unknown, ttlMs?: number): SetResult {
    const key = this.validateKey(rawKey);
    const value = this.validateValue(rawValue);
    const ttl = this.validateTtl(ttlMs);

    // Sweep BEFORE the cap check - an entry that just expired should free
    // its slot for the new write. This is also the only sweep that runs;
    // reads use lazy expiry so they never call here.
    this.sweepExpired();

    // If the key already exists, the set is an overwrite and doesn't grow
    // the map - skip the cap check in that case.
    if (!this.store.has(key) && this.store.size >= STATE_MAX_ENTRIES) {
      throw new StoreError(
        'TOO_MANY_ENTRIES',
        `state store at capacity: ${STATE_MAX_ENTRIES} entries`,
        STATE_MAX_ENTRIES,
        this.store.size,
      );
    }

    const expiresAt = this.clock() + ttl;
    this.store.set(key, { value, expiresAt });
    return { key, expiresAt, totalEntries: this.store.size };
  }

  public get(rawKey: unknown): GetResult {
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

  public delete(rawKey: unknown): DeleteResult {
    const key = this.validateKey(rawKey);
    const deleted = this.store.delete(key);
    return { key, deleted };
  }

  public listKeys(prefix?: string): ListKeysResult {
    // Sweep to ensure list does not surface stale entries. List can be the
    // first call after a long idle - sweeping here is the only place that
    // catches that case.
    this.sweepExpired();

    const trimmedPrefix = prefix ?? '';
    if (trimmedPrefix.length > STATE_MAX_KEY_BYTES) {
      // Defensive - schemas cap prefix at the same key cap, but make sure.
      throw new StoreError(
        'KEY_TOO_LARGE',
        `list_keys prefix exceeds key byte cap (${STATE_MAX_KEY_BYTES})`,
        STATE_MAX_KEY_BYTES,
        Buffer.byteLength(trimmedPrefix, 'utf8'),
      );
    }

    const matches: Array<{ key: string; expiresAt: number }> = [];
    for (const [key, entry] of this.store.entries()) {
      if (trimmedPrefix && !key.startsWith(trimmedPrefix)) continue;
      matches.push({ key, expiresAt: entry.expiresAt });
    }

    // Stable sort by key for deterministic test assertions + better UX.
    matches.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

    const totalMatches = matches.length;
    const capped = matches.slice(0, STATE_LIST_KEYS_CAP);
    return {
      keys: capped,
      totalMatches,
      truncated: totalMatches > capped.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  private validateKey(rawKey: unknown): string {
    if (typeof rawKey !== 'string') {
      throw new StoreError(
        'KEY_TOO_LARGE',
        `state key must be a string, got ${typeof rawKey}`,
        STATE_MAX_KEY_BYTES,
        0,
      );
    }
    const bytes = Buffer.byteLength(rawKey, 'utf8');
    if (bytes > STATE_MAX_KEY_BYTES) {
      throw new StoreError(
        'KEY_TOO_LARGE',
        `state key exceeds max ${STATE_MAX_KEY_BYTES} bytes (got ${bytes})`,
        STATE_MAX_KEY_BYTES,
        bytes,
      );
    }
    if (rawKey.length === 0) {
      throw new StoreError(
        'KEY_TOO_LARGE',
        'state key cannot be empty',
        STATE_MAX_KEY_BYTES,
        0,
      );
    }
    return rawKey;
  }

  private validateValue(rawValue: unknown): string {
    if (typeof rawValue !== 'string') {
      throw new StoreError(
        'VALUE_TOO_LARGE',
        `state value must be a string, got ${typeof rawValue}`,
        STATE_MAX_VALUE_BYTES,
        0,
      );
    }
    const bytes = Buffer.byteLength(rawValue, 'utf8');
    if (bytes > STATE_MAX_VALUE_BYTES) {
      throw new StoreError(
        'VALUE_TOO_LARGE',
        `state value exceeds max ${STATE_MAX_VALUE_BYTES} bytes (got ${bytes})`,
        STATE_MAX_VALUE_BYTES,
        bytes,
      );
    }
    return rawValue;
  }

  private validateTtl(ttlMs: number | undefined): number {
    if (ttlMs === undefined) return STATE_DEFAULT_TTL_MS;
    if (!Number.isFinite(ttlMs) || !Number.isInteger(ttlMs) || ttlMs < 1) {
      throw new StoreError(
        'INVALID_TTL',
        `ttlMs must be a positive integer (got ${String(ttlMs)})`,
        STATE_MAX_TTL_MS,
        Number.isFinite(ttlMs) ? Number(ttlMs) : 0,
      );
    }
    if (ttlMs > STATE_MAX_TTL_MS) {
      throw new StoreError(
        'INVALID_TTL',
        `ttlMs exceeds max ${STATE_MAX_TTL_MS} (got ${ttlMs})`,
        STATE_MAX_TTL_MS,
        ttlMs,
      );
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
  private sweepExpired(): void {
    const now = this.clock();
    // Collect keys first so we don't mutate the map mid-iteration.
    const toDrop: string[] = [];
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) toDrop.push(key);
    }
    for (const key of toDrop) {
      this.store.delete(key);
    }
  }
}

/**
 * Module-level singleton. The MCP server is one process; one store. Tests
 * can inject their own StateStore by constructing one directly.
 */
let SHARED: StateStore | null = null;

export function getSharedStore(): StateStore {
  if (!SHARED) SHARED = new StateStore();
  return SHARED;
}

/** Test helper - drop the singleton so the next call rebuilds it. */
export function resetSharedStore(): void {
  SHARED = null;
}
