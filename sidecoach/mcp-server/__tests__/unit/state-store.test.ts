// Unit tests for the in-process state store. Covers happy paths, expiry,
// every overflow rejection, sweep semantics, and list-cap behavior.
//
// Uses a mock clock so TTL tests are deterministic - no real setTimeout, no
// flaky 1ms-of-real-time waits.

import {
  STATE_DEFAULT_TTL_MS,
  STATE_LIST_KEYS_CAP,
  STATE_MAX_ENTRIES,
  STATE_MAX_KEY_BYTES,
  STATE_MAX_TTL_MS,
  STATE_MAX_VALUE_BYTES,
  StateStore,
  StoreError,
} from '../../src/state-store';
import { test, assert } from '../harness';

function makeClock(initial = 1_000_000) {
  let now = initial;
  return {
    read: () => now,
    advance: (delta: number) => {
      now += delta;
    },
    set: (v: number) => {
      now = v;
    },
  };
}

function newStore() {
  const clock = makeClock();
  const store = new StateStore(() => clock.read());
  return { store, clock };
}

export async function run(): Promise<void> {
  await test('state-store set/get round-trip returns same value', async () => {
    const { store } = newStore();
    const setRes = store.set('k', 'v');
    assert.strictEqual(setRes.key, 'k');
    assert.strictEqual(setRes.totalEntries, 1);
    assert.ok(setRes.expiresAt > 0);

    const getRes = store.get('k');
    assert.strictEqual(getRes.key, 'k');
    assert.strictEqual(getRes.value, 'v');
    assert.ok(getRes.expiresAt && getRes.expiresAt === setRes.expiresAt);
  });

  await test('state-store get on missing key returns value=null', async () => {
    const { store } = newStore();
    const res = store.get('nonexistent');
    assert.strictEqual(res.value, null);
    assert.strictEqual(res.expiresAt, undefined);
  });

  await test('state-store get expires lazily after TTL', async () => {
    const { store, clock } = newStore();
    store.set('k', 'v', 100);
    assert.strictEqual(store.get('k').value, 'v');
    clock.advance(101);
    const res = store.get('k');
    assert.strictEqual(res.value, null);
    assert.strictEqual(store.size(), 0, 'expired entry should be dropped on read');
  });

  await test('state-store default TTL applied when ttlMs omitted', async () => {
    const { store, clock } = newStore();
    const res = store.set('k', 'v');
    // 30 min after the mock clock baseline.
    assert.strictEqual(res.expiresAt, clock.read() + STATE_DEFAULT_TTL_MS);
  });

  await test('state-store explicit TTL respected', async () => {
    const { store, clock } = newStore();
    const res = store.set('k', 'v', 5_000);
    assert.strictEqual(res.expiresAt, clock.read() + 5_000);
  });

  await test('state-store delete returns deleted=true for existing key', async () => {
    const { store } = newStore();
    store.set('k', 'v');
    const res = store.delete('k');
    assert.strictEqual(res.deleted, true);
    assert.strictEqual(store.size(), 0);
  });

  await test('state-store delete returns deleted=false for missing key', async () => {
    const { store } = newStore();
    const res = store.delete('missing');
    assert.strictEqual(res.deleted, false);
  });

  await test('state-store list_keys returns all live keys sorted', async () => {
    const { store } = newStore();
    store.set('zebra', 'v');
    store.set('apple', 'v');
    store.set('mango', 'v');
    const res = store.listKeys();
    assert.deepStrictEqual(
      res.keys.map((k) => k.key),
      ['apple', 'mango', 'zebra'],
    );
    assert.strictEqual(res.totalMatches, 3);
    assert.strictEqual(res.truncated, false);
  });

  await test('state-store list_keys filters by prefix', async () => {
    const { store } = newStore();
    store.set('user:1', 'v');
    store.set('user:2', 'v');
    store.set('session:1', 'v');
    const res = store.listKeys('user:');
    assert.deepStrictEqual(
      res.keys.map((k) => k.key),
      ['user:1', 'user:2'],
    );
    assert.strictEqual(res.totalMatches, 2);
  });

  await test('state-store list_keys drops expired entries on call', async () => {
    const { store, clock } = newStore();
    store.set('live', 'v', 10_000);
    store.set('stale', 'v', 100);
    clock.advance(500);
    const res = store.listKeys();
    assert.deepStrictEqual(res.keys.map((k) => k.key), ['live']);
    assert.strictEqual(store.size(), 1, 'sweep should have dropped stale');
  });

  await test('state-store list_keys caps at STATE_LIST_KEYS_CAP', async () => {
    const { store } = newStore();
    const n = STATE_LIST_KEYS_CAP + 5;
    for (let i = 0; i < n; i++) {
      store.set(`k${String(i).padStart(4, '0')}`, 'v');
    }
    const res = store.listKeys();
    assert.strictEqual(res.keys.length, STATE_LIST_KEYS_CAP);
    assert.strictEqual(res.totalMatches, n);
    assert.strictEqual(res.truncated, true);
  });

  await test('state-store key over cap raises KEY_TOO_LARGE', async () => {
    const { store } = newStore();
    const bigKey = 'x'.repeat(STATE_MAX_KEY_BYTES + 1);
    try {
      store.set(bigKey, 'v');
      assert.fail('expected StoreError');
    } catch (err) {
      assert.ok(err instanceof StoreError);
      assert.strictEqual((err as StoreError).code, 'KEY_TOO_LARGE');
    }
  });

  await test('state-store empty key raises KEY_TOO_LARGE', async () => {
    const { store } = newStore();
    try {
      store.set('', 'v');
      assert.fail('expected StoreError');
    } catch (err) {
      assert.ok(err instanceof StoreError);
      assert.strictEqual((err as StoreError).code, 'KEY_TOO_LARGE');
    }
  });

  await test('state-store value over cap raises VALUE_TOO_LARGE', async () => {
    const { store } = newStore();
    const bigValue = 'x'.repeat(STATE_MAX_VALUE_BYTES + 1);
    try {
      store.set('k', bigValue);
      assert.fail('expected StoreError');
    } catch (err) {
      assert.ok(err instanceof StoreError);
      assert.strictEqual((err as StoreError).code, 'VALUE_TOO_LARGE');
    }
  });

  await test('state-store TTL below 1 raises INVALID_TTL', async () => {
    const { store } = newStore();
    try {
      store.set('k', 'v', 0);
      assert.fail('expected StoreError');
    } catch (err) {
      assert.ok(err instanceof StoreError);
      assert.strictEqual((err as StoreError).code, 'INVALID_TTL');
    }
  });

  await test('state-store TTL above max raises INVALID_TTL', async () => {
    const { store } = newStore();
    try {
      store.set('k', 'v', STATE_MAX_TTL_MS + 1);
      assert.fail('expected StoreError');
    } catch (err) {
      assert.ok(err instanceof StoreError);
      assert.strictEqual((err as StoreError).code, 'INVALID_TTL');
    }
  });

  await test('state-store overflow at STATE_MAX_ENTRIES raises TOO_MANY_ENTRIES', async () => {
    const { store } = newStore();
    for (let i = 0; i < STATE_MAX_ENTRIES; i++) {
      store.set(`k${i}`, 'v');
    }
    assert.strictEqual(store.size(), STATE_MAX_ENTRIES);
    try {
      store.set('one-too-many', 'v');
      assert.fail('expected StoreError');
    } catch (err) {
      assert.ok(err instanceof StoreError);
      assert.strictEqual((err as StoreError).code, 'TOO_MANY_ENTRIES');
    }
  });

  await test('state-store overwrite of existing key past cap still succeeds', async () => {
    const { store } = newStore();
    for (let i = 0; i < STATE_MAX_ENTRIES; i++) {
      store.set(`k${i}`, 'v');
    }
    // Overwriting `k0` should not be blocked - it's not a NEW entry.
    const res = store.set('k0', 'new-value');
    assert.strictEqual(res.totalEntries, STATE_MAX_ENTRIES);
    assert.strictEqual(store.get('k0').value, 'new-value');
  });

  await test('state-store sweep on set frees a slot for new entries', async () => {
    const { store, clock } = newStore();
    for (let i = 0; i < STATE_MAX_ENTRIES; i++) {
      store.set(`k${i}`, 'v', 100); // expires soon
    }
    clock.advance(101);
    // After clock advance, ALL entries are stale. set() sweeps them, freeing room.
    const res = store.set('post-sweep', 'v', 10_000);
    assert.strictEqual(res.totalEntries, 1);
  });

  await test('state-store non-string key rejected as KEY_TOO_LARGE', async () => {
    const { store } = newStore();
    try {
      store.set(42 as unknown as string, 'v');
      assert.fail('expected StoreError');
    } catch (err) {
      assert.ok(err instanceof StoreError);
      assert.strictEqual((err as StoreError).code, 'KEY_TOO_LARGE');
    }
  });

  await test('state-store non-string value rejected as VALUE_TOO_LARGE', async () => {
    const { store } = newStore();
    try {
      store.set('k', { obj: true } as unknown as string);
      assert.fail('expected StoreError');
    } catch (err) {
      assert.ok(err instanceof StoreError);
      assert.strictEqual((err as StoreError).code, 'VALUE_TOO_LARGE');
    }
  });
}
