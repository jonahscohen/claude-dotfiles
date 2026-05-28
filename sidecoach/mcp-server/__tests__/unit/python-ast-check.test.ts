// T-0025: unit tests for the static Python screen. Every forbidden pattern
// from the spec is exercised for rejection, and the neutralizer is proven to
// avoid false positives on tokens that live inside strings/comments.

import { checkPythonCode, neutralize } from '../../src/python-ast-check';
import { test, assert } from '../harness';

export async function run(): Promise<void> {
  // --- rejections: forbidden imports ------------------------------------

  await test('reject: import os', () => {
    const r = checkPythonCode('import os\nprint(os.getcwd())');
    assert.strictEqual(r.ok, false);
    assert.ok(!r.ok && r.violation.includes('os'));
  });

  await test('reject: import subprocess', () => {
    const r = checkPythonCode('import subprocess');
    assert.strictEqual(r.ok, false);
    assert.ok(!r.ok && r.violation.includes('subprocess'));
  });

  await test('reject: import socket', () => {
    const r = checkPythonCode('import socket');
    assert.strictEqual(r.ok, false);
    assert.ok(!r.ok && r.violation.includes('socket'));
  });

  await test('reject: from os import getcwd', () => {
    const r = checkPythonCode('from os import getcwd');
    assert.strictEqual(r.ok, false);
    assert.ok(!r.ok && r.violation.includes('os'));
  });

  await test('reject: import os.path (dotted)', () => {
    const r = checkPythonCode('import os.path as p');
    assert.strictEqual(r.ok, false);
  });

  await test('reject: comma import "import sys, socket"', () => {
    const r = checkPythonCode('import sys, socket');
    assert.strictEqual(r.ok, false);
    assert.ok(!r.ok && r.violation.includes('socket'));
  });

  await test('reject: from subprocess import run', () => {
    const r = checkPythonCode('from subprocess import run');
    assert.strictEqual(r.ok, false);
  });

  // --- rejections: dynamic exec/import ----------------------------------

  await test('reject: __import__', () => {
    const r = checkPythonCode('__import__("os").system("id")');
    assert.strictEqual(r.ok, false);
    assert.ok(!r.ok && r.violation.includes('__import__'));
  });

  await test('reject: eval(...)', () => {
    const r = checkPythonCode('x = eval("1+1")');
    assert.strictEqual(r.ok, false);
    assert.ok(!r.ok && r.violation.includes('eval'));
  });

  await test('reject: exec(...)', () => {
    const r = checkPythonCode('exec("print(1)")');
    assert.strictEqual(r.ok, false);
    assert.ok(!r.ok && r.violation.includes('exec'));
  });

  await test('reject: compile(...)', () => {
    const r = checkPythonCode('compile("1", "<s>", "eval")');
    assert.strictEqual(r.ok, false);
    assert.ok(!r.ok && r.violation.includes('compile'));
  });

  await test('reject: getattr on __builtins__', () => {
    const r = checkPythonCode('getattr(__builtins__, "eval")');
    assert.strictEqual(r.ok, false);
    assert.ok(!r.ok && /__builtins__/.test(r.violation));
  });

  await test('reject: bare __builtins__ access', () => {
    const r = checkPythonCode('b = __builtins__["__import__"]');
    assert.strictEqual(r.ok, false);
  });

  // --- acceptances ------------------------------------------------------

  await test('accept: plain arithmetic', () => {
    assert.strictEqual(checkPythonCode('print(2 + 2)').ok, true);
  });

  await test('accept: allowed import (math)', () => {
    assert.strictEqual(checkPythonCode('import math\nprint(math.pi)').ok, true);
  });

  await test('accept: allowed import (urllib) - network blocked by container, not screen', () => {
    assert.strictEqual(checkPythonCode('import urllib.request').ok, true);
  });

  await test('accept: getattr on a non-builtins object', () => {
    assert.strictEqual(checkPythonCode('class C: pass\ngetattr(C(), "x", None)').ok, true);
  });

  // --- neutralizer: no false positives ----------------------------------

  await test('no false positive: "import os" inside a string literal', () => {
    assert.strictEqual(checkPythonCode('print("import os is dangerous")').ok, true);
  });

  await test('no false positive: forbidden word in a comment', () => {
    assert.strictEqual(checkPythonCode('x = 1  # do not import socket here').ok, true);
  });

  await test('no false positive: eval as a substring (evaluate)', () => {
    assert.strictEqual(checkPythonCode('def evaluate(n):\n    return n * 2\nprint(evaluate(3))').ok, true);
  });

  await test('no false positive: triple-quoted docstring mentioning subprocess', () => {
    const code = 'def f():\n    """uses subprocess in theory\n    import os maybe"""\n    return 1\nprint(f())';
    assert.strictEqual(checkPythonCode(code).ok, true);
  });

  await test('still catches real import AFTER a decoy string', () => {
    const r = checkPythonCode('print("import os")\nimport socket');
    assert.strictEqual(r.ok, false);
    assert.ok(!r.ok && r.violation.includes('socket'));
  });

  await test('neutralize replaces string contents with spaces, preserves newlines', () => {
    const out = neutralize('a = "hello\nworld"\nb = 2');
    assert.ok(!out.includes('hello'));
    assert.ok(out.includes('a = '));
    assert.ok(out.includes('b = 2'));
    // newline inside the string is preserved so line structure is intact
    assert.strictEqual((out.match(/\n/g) || []).length, 2);
  });
}
