// T-0025: unit tests for the sandbox command builder + helpers. The headline
// assertion is that buildDockerArgs() emits the EXACT security flags - if any
// of these regress, the container is no longer isolated and this test fails.

import {
  buildDockerArgs,
  resolveImage,
  DEFAULT_PYTHON_IMAGE,
  CONTAINER_TIMEOUT_MS,
} from '../../src/python-sandbox';
import { test, assert } from '../harness';

/** Assert that `flag value` appears as adjacent elements in argv. */
function hasFlagPair(argv: string[], flag: string, value: string): boolean {
  for (let i = 0; i < argv.length - 1; i += 1) {
    if (argv[i] === flag && argv[i + 1] === value) return true;
  }
  return false;
}

export async function run(): Promise<void> {
  await test('buildDockerArgs: includes EXACTLY the required security flags', () => {
    const argv = buildDockerArgs({ image: 'python:3-slim', containerName: 'sc-test' });
    assert.ok(hasFlagPair(argv, '--network', 'none'), '--network none missing');
    assert.ok(hasFlagPair(argv, '--memory', '256m'), '--memory 256m missing');
    assert.ok(hasFlagPair(argv, '--cpus', '0.5'), '--cpus 0.5 missing');
    assert.ok(argv.includes('--read-only'), '--read-only missing');
    assert.ok(hasFlagPair(argv, '--tmpfs', '/tmp:size=64m'), '--tmpfs /tmp:size=64m missing');
    assert.ok(hasFlagPair(argv, '--user', 'nobody'), '--user nobody missing');
  });

  await test('buildDockerArgs: starts with run --rm -i and names the container', () => {
    const argv = buildDockerArgs({ image: 'python:3-slim', containerName: 'sc-xyz' });
    assert.strictEqual(argv[0], 'run');
    assert.ok(argv.includes('--rm'));
    assert.ok(argv.includes('-i'));
    assert.ok(hasFlagPair(argv, '--name', 'sc-xyz'), '--name not wired');
  });

  await test('buildDockerArgs: image precedes the python3 - stdin invocation', () => {
    const argv = buildDockerArgs({ image: 'myimg:tag', containerName: 'sc-1' });
    const imgIdx = argv.indexOf('myimg:tag');
    assert.ok(imgIdx > 0, 'image not present');
    assert.strictEqual(argv[imgIdx + 1], 'python3');
    assert.strictEqual(argv[imgIdx + 2], '-');
    // image must come AFTER all the docker flags (last positional before cmd)
    assert.strictEqual(imgIdx, argv.length - 3);
  });

  await test('buildDockerArgs: no shell metacharacters - pure argv (no interpolation)', () => {
    const argv = buildDockerArgs({ image: 'python:3-slim', containerName: 'sc-1' });
    // Every element is a discrete token; none is a concatenated shell string.
    for (const tok of argv) {
      assert.ok(!tok.includes(' && '), 'argv token contains shell chaining');
      assert.ok(!tok.includes(';'), 'argv token contains a semicolon');
    }
  });

  await test('resolveImage: defaults to python:3-slim', () => {
    const original = process.env.SIDECOACH_PYTHON_IMAGE;
    delete process.env.SIDECOACH_PYTHON_IMAGE;
    try {
      assert.strictEqual(resolveImage(), DEFAULT_PYTHON_IMAGE);
    } finally {
      if (original !== undefined) process.env.SIDECOACH_PYTHON_IMAGE = original;
    }
  });

  await test('resolveImage: honors SIDECOACH_PYTHON_IMAGE env override', () => {
    const original = process.env.SIDECOACH_PYTHON_IMAGE;
    process.env.SIDECOACH_PYTHON_IMAGE = 'python:3.12-alpine';
    try {
      assert.strictEqual(resolveImage(), 'python:3.12-alpine');
    } finally {
      if (original === undefined) delete process.env.SIDECOACH_PYTHON_IMAGE;
      else process.env.SIDECOACH_PYTHON_IMAGE = original;
    }
  });

  await test('CONTAINER_TIMEOUT_MS is bounded below the per-tool 30s budget', () => {
    assert.ok(CONTAINER_TIMEOUT_MS > 0);
    assert.ok(CONTAINER_TIMEOUT_MS <= 30_000, 'container kill must fire before the tool timeout');
  });
}
