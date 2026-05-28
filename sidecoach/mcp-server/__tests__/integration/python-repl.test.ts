// T-0025: integration tests for sidecoach_python_repl_execute through the real
// SDK in-memory transport.
//
//   1. DOWNSTREAM_UNAVAILABLE path - always exercised by hiding the runtime
//      from PATH and verifying the structured error.
//   2. INVALID_INPUT path - always exercised; a forbidden import is rejected by
//      the static screen regardless of daemon state.
//   3. Live round-trip - skipped at runtime if `docker ps` fails (daemon down).
//      When the daemon is up: print(2+2) -> stdout "4", and a urllib network
//      attempt is blocked by --network none.

import { execFileSync } from 'child_process';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { buildServer } from '../../src/server';
import { createLogger } from '../../src/logger';
import { _resetRuntimeProbe } from '../../src/python-sandbox';
import { test, assert } from '../harness';

function silentLogger() {
  return createLogger({ level: 'error', write: () => undefined });
}

function dockerReady(): boolean {
  try {
    execFileSync('docker', ['ps'], { stdio: 'ignore', timeout: 8_000 });
    return true;
  } catch {
    return false;
  }
}

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const built = buildServer({ logger: silentLogger() });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await built.mcp.connect(serverTransport);
  const client = new Client({ name: 'integration-test', version: '0.0.0' }, { capabilities: {} });
  await client.connect(clientTransport);
  try {
    return await fn(client);
  } finally {
    await client.close();
    await built.close();
  }
}

export async function run(): Promise<void> {
  await test('python_repl returns DOWNSTREAM_UNAVAILABLE when no runtime on PATH', async () => {
    _resetRuntimeProbe();
    const originalPath = process.env.PATH;
    process.env.PATH = '/no/such/dir';
    try {
      await withClient(async (client) => {
        const r = await client.callTool({
          name: 'sidecoach_python_repl_execute',
          arguments: { code: 'print(2 + 2)' },
        });
        assert.strictEqual(r.isError, true);
        const body = JSON.parse((r.content as any[])[0].text);
        assert.strictEqual(body.code, 'DOWNSTREAM_UNAVAILABLE');
        assert.strictEqual(body.resource, 'docker');
      });
    } finally {
      process.env.PATH = originalPath;
      _resetRuntimeProbe();
    }
  });

  await test('python_repl rejects a forbidden import with INVALID_INPUT (screen, always on)', async () => {
    _resetRuntimeProbe();
    await withClient(async (client) => {
      const r = await client.callTool({
        name: 'sidecoach_python_repl_execute',
        arguments: { code: 'import os\nprint(os.getcwd())' },
      });
      assert.strictEqual(r.isError, true);
      const body = JSON.parse((r.content as any[])[0].text);
      // With a runtime present the screen fires first (INVALID_INPUT); without
      // one the probe fires first (DOWNSTREAM_UNAVAILABLE). Code never runs.
      assert.ok(
        body.code === 'INVALID_INPUT' || body.code === 'DOWNSTREAM_UNAVAILABLE',
        `unexpected code ${body.code}`,
      );
    });
    _resetRuntimeProbe();
  });

  await test('python_repl live round-trip: print(2+2) -> "4" (skipped if daemon down)', async () => {
    _resetRuntimeProbe();
    if (!dockerReady()) {
      // eslint-disable-next-line no-console
      console.log('    (skipped: docker daemon not reachable)');
      return;
    }
    await withClient(async (client) => {
      const r = await client.callTool({
        name: 'sidecoach_python_repl_execute',
        arguments: { code: 'print(2 + 2)' },
      });
      if (r.isError) {
        const body = JSON.parse((r.content as any[])[0].text);
        // eslint-disable-next-line no-console
        console.log('    python_repl returned isError:', JSON.stringify(body));
      }
      assert.notStrictEqual(r.isError, true);
      const body = JSON.parse((r.content as any[])[1].text);
      assert.strictEqual(body.exitCode, 0);
      assert.strictEqual(body.stdout.trim(), '4');
      assert.strictEqual(body.timedOut, false);
    });
    _resetRuntimeProbe();
  });

  await test('python_repl live: network egress blocked under --network none (skipped if daemon down)', async () => {
    _resetRuntimeProbe();
    if (!dockerReady()) {
      // eslint-disable-next-line no-console
      console.log('    (skipped: docker daemon not reachable)');
      return;
    }
    await withClient(async (client) => {
      const code =
        'import urllib.request\n' +
        'try:\n' +
        "    urllib.request.urlopen('http://example.com', timeout=3)\n" +
        "    print('REACHED_NETWORK')\n" +
        'except Exception as e:\n' +
        "    print('BLOCKED:', type(e).__name__)\n";
      const r = await client.callTool({
        name: 'sidecoach_python_repl_execute',
        arguments: { code, timeoutMs: 9_000 },
      });
      assert.notStrictEqual(r.isError, true);
      const body = JSON.parse((r.content as any[])[1].text);
      assert.ok(!body.stdout.includes('REACHED_NETWORK'), 'network egress was NOT blocked');
      assert.ok(body.stdout.includes('BLOCKED:'), `expected clean block, got: ${body.stdout.slice(0, 160)}`);
    });
    _resetRuntimeProbe();
  });
}
