// Unit tests for path-scope validation under SIDECOACH_PROJECT_ROOT.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SidecoachToolError } from '../../src/errors';
import { resolveProjectRoot, validatePathInRoot } from '../../src/project-root';
import { test, assert } from '../harness';

function mkTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sidecoach-mcp-pr-'));
}

export async function run(): Promise<void> {
  await test('project-root resolves explicit override', async () => {
    const root = mkTempRoot();
    try {
      const res = resolveProjectRoot(root);
      // On macOS /tmp is a symlink to /private/tmp; realpath the expected too.
      assert.strictEqual(res, fs.realpathSync.native(root));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await test('project-root throws INVALID_INPUT for non-existent path', async () => {
    try {
      resolveProjectRoot('/this/path/does/not/exist/at/all/xyz123');
      assert.fail('expected throw');
    } catch (err) {
      assert.ok(err instanceof SidecoachToolError);
      assert.strictEqual((err as SidecoachToolError).code, 'INVALID_INPUT');
    }
  });

  await test('project-root throws INVALID_INPUT when target is a file', async () => {
    const root = mkTempRoot();
    const file = path.join(root, 'f.txt');
    fs.writeFileSync(file, 'hi');
    try {
      resolveProjectRoot(file);
      assert.fail('expected throw');
    } catch (err) {
      assert.ok(err instanceof SidecoachToolError);
      assert.strictEqual((err as SidecoachToolError).code, 'INVALID_INPUT');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await test('validatePathInRoot accepts relative path inside root', async () => {
    const root = mkTempRoot();
    fs.mkdirSync(path.join(root, 'sub'));
    fs.writeFileSync(path.join(root, 'sub', 'a.ts'), 'x');
    try {
      const realRoot = fs.realpathSync.native(root);
      const res = validatePathInRoot('sub/a.ts', realRoot);
      assert.strictEqual(res, path.join(realRoot, 'sub', 'a.ts'));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await test('validatePathInRoot accepts absolute path inside root', async () => {
    const root = mkTempRoot();
    const realRoot = fs.realpathSync.native(root);
    fs.writeFileSync(path.join(realRoot, 'a.ts'), 'x');
    try {
      const res = validatePathInRoot(path.join(realRoot, 'a.ts'), realRoot);
      assert.strictEqual(res, path.join(realRoot, 'a.ts'));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await test('validatePathInRoot rejects ".." escape via INVALID_INPUT', async () => {
    const root = mkTempRoot();
    try {
      const realRoot = fs.realpathSync.native(root);
      validatePathInRoot('../escape', realRoot);
      assert.fail('expected throw');
    } catch (err) {
      assert.ok(err instanceof SidecoachToolError);
      assert.strictEqual((err as SidecoachToolError).code, 'INVALID_INPUT');
      assert.match((err as SidecoachToolError).message, /escapes the project root/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await test('validatePathInRoot rejects absolute escape', async () => {
    const root = mkTempRoot();
    try {
      const realRoot = fs.realpathSync.native(root);
      validatePathInRoot('/etc', realRoot);
      assert.fail('expected throw');
    } catch (err) {
      assert.ok(err instanceof SidecoachToolError);
      assert.strictEqual((err as SidecoachToolError).code, 'INVALID_INPUT');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await test('validatePathInRoot rejects symlink that points outside root', async () => {
    const root = mkTempRoot();
    const realRoot = fs.realpathSync.native(root);
    const linkTarget = path.join(realRoot, 'inside-link');
    const outsideTarget = mkTempRoot(); // separate temp dir
    try {
      fs.symlinkSync(outsideTarget, linkTarget);
      try {
        validatePathInRoot('inside-link', realRoot);
        assert.fail('expected throw');
      } catch (err) {
        assert.ok(err instanceof SidecoachToolError);
        assert.strictEqual((err as SidecoachToolError).code, 'INVALID_INPUT');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outsideTarget, { recursive: true, force: true });
    }
  });

  await test('validatePathInRoot empty string rejected', async () => {
    const root = mkTempRoot();
    try {
      const realRoot = fs.realpathSync.native(root);
      validatePathInRoot('', realRoot);
      assert.fail('expected throw');
    } catch (err) {
      assert.ok(err instanceof SidecoachToolError);
      assert.strictEqual((err as SidecoachToolError).code, 'INVALID_INPUT');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
