// Unit tests for the ast-grep `--json=stream` parser. No real CLI involved;
// we hand-craft the stream and verify shape, capping, and skipping.

import { parseAstGrepStream } from '../../src/ast-grep-parser';
import { test, assert } from '../harness';

const MATCH_A = JSON.stringify({
  file: '/abs/proj/src/a.ts',
  text: 'console.log("a")',
  language: 'TypeScript',
  range: { start: { line: 4, column: 0 }, end: { line: 4, column: 16 } },
});

const MATCH_B = JSON.stringify({
  file: '/abs/proj/src/b.ts',
  text: 'console.log("b")',
  language: 'TypeScript',
  range: { start: { line: 9, column: 4 }, end: { line: 9, column: 20 } },
});

const INFO = JSON.stringify({ type: 'info', message: 'scanning' });

export async function run(): Promise<void> {
  await test('ast-grep parser extracts well-formed match', async () => {
    const res = parseAstGrepStream(MATCH_A + '\n', {
      maxResults: 10,
      maxMatchTextChars: 100,
    });
    assert.strictEqual(res.matches.length, 1);
    assert.strictEqual(res.matches[0].file, '/abs/proj/src/a.ts');
    // 0-indexed in CLI -> 1-indexed in output
    assert.strictEqual(res.matches[0].startLine, 5);
    assert.strictEqual(res.matches[0].endLine, 5);
    assert.strictEqual(res.matches[0].text, 'console.log("a")');
    assert.strictEqual(res.matches[0].language, 'TypeScript');
  });

  await test('ast-grep parser skips blank lines and informational records', async () => {
    const raw = ['', MATCH_A, INFO, '', MATCH_B, ''].join('\n');
    const res = parseAstGrepStream(raw, { maxResults: 10, maxMatchTextChars: 100 });
    assert.strictEqual(res.matches.length, 2);
    // Blank lines + INFO record (missing file/text/range) -> skipped
    assert.ok(res.linesSkipped >= 3);
  });

  await test('ast-grep parser truncates over-long match text with suffix', async () => {
    const longText = 'x'.repeat(1000);
    const raw =
      JSON.stringify({
        file: '/abs/proj/src/c.ts',
        text: longText,
        range: { start: { line: 0, column: 0 }, end: { line: 0, column: 1000 } },
      }) + '\n';
    const res = parseAstGrepStream(raw, { maxResults: 10, maxMatchTextChars: 100 });
    assert.strictEqual(res.matches.length, 1);
    assert.ok(res.matches[0].text.length <= 100);
    assert.ok(
      res.matches[0].text.endsWith('...[truncated]'),
      `expected truncation suffix, got: ${res.matches[0].text}`,
    );
  });

  await test('ast-grep parser caps at maxResults and flags truncated', async () => {
    const lines: string[] = [];
    for (let i = 0; i < 10; i++) {
      lines.push(
        JSON.stringify({
          file: `/abs/proj/src/${i}.ts`,
          text: 'x',
          range: { start: { line: 0, column: 0 }, end: { line: 0, column: 1 } },
        }),
      );
    }
    const res = parseAstGrepStream(lines.join('\n'), {
      maxResults: 3,
      maxMatchTextChars: 100,
    });
    assert.strictEqual(res.matches.length, 3);
    assert.strictEqual(res.truncated, true);
  });

  await test('ast-grep parser relativizes paths under projectRoot', async () => {
    const raw = MATCH_A + '\n';
    const res = parseAstGrepStream(raw, {
      maxResults: 10,
      maxMatchTextChars: 100,
      projectRoot: '/abs/proj',
    });
    assert.strictEqual(res.matches[0].file, 'src/a.ts');
  });

  await test('ast-grep parser leaves paths outside projectRoot unchanged', async () => {
    const raw =
      JSON.stringify({
        file: '/elsewhere/x.ts',
        text: 'x',
        range: { start: { line: 0, column: 0 }, end: { line: 0, column: 1 } },
      }) + '\n';
    const res = parseAstGrepStream(raw, {
      maxResults: 10,
      maxMatchTextChars: 100,
      projectRoot: '/abs/proj',
    });
    assert.strictEqual(res.matches[0].file, '/elsewhere/x.ts');
  });

  await test('ast-grep parser handles invalid JSON line as skip', async () => {
    const raw = MATCH_A + '\nthis is not json\n' + MATCH_B + '\n';
    const res = parseAstGrepStream(raw, { maxResults: 10, maxMatchTextChars: 100 });
    assert.strictEqual(res.matches.length, 2);
    assert.ok(res.linesSkipped >= 1);
  });

  await test('ast-grep parser handles missing required fields as skip', async () => {
    const missingRange = JSON.stringify({ file: '/abs/proj/x.ts', text: 'foo' });
    const missingFile = JSON.stringify({
      text: 'foo',
      range: { start: { line: 0, column: 0 }, end: { line: 0, column: 1 } },
    });
    const missingText = JSON.stringify({
      file: '/abs/proj/x.ts',
      range: { start: { line: 0, column: 0 }, end: { line: 0, column: 1 } },
    });
    const raw = [missingRange, missingFile, missingText, MATCH_A].join('\n');
    const res = parseAstGrepStream(raw, { maxResults: 10, maxMatchTextChars: 100 });
    assert.strictEqual(res.matches.length, 1, 'only MATCH_A should survive');
    assert.ok(res.linesSkipped >= 3);
  });

  await test('ast-grep parser handles totally empty input', async () => {
    const res = parseAstGrepStream('', { maxResults: 10, maxMatchTextChars: 100 });
    assert.strictEqual(res.matches.length, 0);
    assert.strictEqual(res.truncated, false);
  });
}
