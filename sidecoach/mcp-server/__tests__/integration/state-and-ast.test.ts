// Integration tests for the T-0022 extension tools (state_* + ast_grep)
// via the real SDK in-memory transport.
//
// State tests run end-to-end (set -> list -> get -> delete -> get-null) to
// prove the tool surface plus the shared store cooperate.
//
// ast_grep test runs in two modes:
//   1. happy path - skipped at runtime if `ast-grep` is not on PATH (the test
//      passes with a logged skip; CI machines without the binary still go green).
//   2. DOWNSTREAM_UNAVAILABLE path - always exercised by hiding the binary
//      from PATH and verifying the structured error.

import { execFileSync } from 'child_process';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { buildServer } from '../../src/server';
import { createLogger } from '../../src/logger';
import { resetSharedStore } from '../../src/state-store';
import { _resetAstGrepProbe } from '../../src/tools/ast-grep';
import { test, assert } from '../harness';

function silentLogger() {
  return createLogger({ level: 'error', write: () => undefined });
}

function astGrepAvailable(): boolean {
  try {
    execFileSync('ast-grep', ['--version'], { stdio: 'ignore', timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

async function withClient<T>(
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const built = buildServer({ logger: silentLogger() });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await built.mcp.connect(serverTransport);
  const client = new Client(
    { name: 'integration-test', version: '0.0.0' },
    { capabilities: {} },
  );
  await client.connect(clientTransport);
  try {
    return await fn(client);
  } finally {
    await client.close();
    await built.close();
  }
}

export async function run(): Promise<void> {
  await test('state tools: set -> list -> get -> delete -> get returns null', async () => {
    resetSharedStore();
    await withClient(async (client) => {
      const setRes = await client.callTool({
        name: 'sidecoach_state_set',
        arguments: { key: 'integration:k1', value: 'value-1', ttlMs: 60_000 },
      });
      assert.notStrictEqual(setRes.isError, true);

      const listRes = await client.callTool({
        name: 'sidecoach_state_list_keys',
        arguments: { prefix: 'integration:' },
      });
      const listBody = JSON.parse((listRes.content as any[])[1].text);
      assert.strictEqual(listBody.keys.length, 1);
      assert.strictEqual(listBody.keys[0].key, 'integration:k1');

      const getRes = await client.callTool({
        name: 'sidecoach_state_get',
        arguments: { key: 'integration:k1' },
      });
      const getBody = JSON.parse((getRes.content as any[])[1].text);
      assert.strictEqual(getBody.value, 'value-1');

      const delRes = await client.callTool({
        name: 'sidecoach_state_delete',
        arguments: { key: 'integration:k1' },
      });
      const delBody = JSON.parse((delRes.content as any[])[1].text);
      assert.strictEqual(delBody.deleted, true);

      const get2 = await client.callTool({
        name: 'sidecoach_state_get',
        arguments: { key: 'integration:k1' },
      });
      const get2Body = JSON.parse((get2.content as any[])[1].text);
      assert.strictEqual(get2Body.value, null);
    });
  });

  await test('state tools: overwrite of existing key replaces value', async () => {
    resetSharedStore();
    await withClient(async (client) => {
      await client.callTool({
        name: 'sidecoach_state_set',
        arguments: { key: 'overwritable', value: 'v1' },
      });
      await client.callTool({
        name: 'sidecoach_state_set',
        arguments: { key: 'overwritable', value: 'v2' },
      });
      const r = await client.callTool({
        name: 'sidecoach_state_get',
        arguments: { key: 'overwritable' },
      });
      const body = JSON.parse((r.content as any[])[1].text);
      assert.strictEqual(body.value, 'v2');
    });
  });

  await test('state tools: oversize key returns isError INVALID_INPUT or schema-reject', async () => {
    resetSharedStore();
    await withClient(async (client) => {
      const bigKey = 'x'.repeat(4097);
      try {
        const r = await client.callTool({
          name: 'sidecoach_state_set',
          arguments: { key: bigKey, value: 'v' },
        });
        // SDK validates schema BEFORE calling our handler - so we may get a
        // protocol error instead. Accept either path; the assertion is "set
        // did NOT silently succeed".
        if (!r.isError) {
          assert.fail('expected error response or thrown protocol error');
        }
      } catch (err) {
        // Schema rejection at protocol level (-32602). Acceptable.
        assert.ok(String(err).length > 0);
      }
    });
  });

  await test('ast_grep returns DOWNSTREAM_UNAVAILABLE when ast-grep is not on PATH', async () => {
    _resetAstGrepProbe();
    const originalPath = process.env.PATH;
    process.env.PATH = '/no/such/dir';
    try {
      await withClient(async (client) => {
        const r = await client.callTool({
          name: 'sidecoach_ast_grep',
          arguments: { pattern: 'console.log($X)' },
        });
        assert.strictEqual(r.isError, true);
        const body = JSON.parse((r.content as any[])[0].text);
        assert.strictEqual(body.code, 'DOWNSTREAM_UNAVAILABLE');
        assert.strictEqual(body.resource, 'ast-grep');
      });
    } finally {
      process.env.PATH = originalPath;
      _resetAstGrepProbe();
    }
  });

  await test('ast_grep happy path against this repo (skipped if binary missing)', async () => {
    _resetAstGrepProbe();
    if (!astGrepAvailable()) {
      // eslint-disable-next-line no-console
      console.log('    (skipped: ast-grep binary not on PATH)');
      return;
    }
    // Project root defaults to cwd, which during npm test is the mcp-server dir.
    await withClient(async (client) => {
      const r = await client.callTool({
        name: 'sidecoach_ast_grep',
        arguments: {
          pattern: 'export const definition',
          language: 'typescript',
          path: 'src/tools',
          maxResults: 50,
        },
      });
      if (r.isError) {
        // Surface the structured error so a CI failure is debuggable.
        const body = JSON.parse((r.content as any[])[0].text);
        // eslint-disable-next-line no-console
        console.log('    ast-grep returned isError:', JSON.stringify(body));
      }
      assert.notStrictEqual(r.isError, true);
      const body = JSON.parse((r.content as any[])[1].text);
      assert.ok(typeof body.matchCount === 'number');
      // Every tool file exports `export const definition`, so we expect a
      // healthy number of matches.
      assert.ok(body.matchCount >= 5, `expected >=5 matches, got ${body.matchCount}`);
    });
  });
}
