import { parseDesignMd } from '../design-md-parser';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURE_PATH = path.resolve(__dirname, '../../../reference/DESIGN.md');

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exit(1);
  }
}

const src = fs.readFileSync(FIXTURE_PATH, 'utf8');
const parsed = parseDesignMd(src);

assertEqual(parsed.colors.brand.red, '#DC2618', 'brand red');
assertEqual(parsed.colors.brand.ink, '#1A1F1B', 'brand ink');
assertEqual(parsed.typography.display.family.includes('Source Serif 4'), true, 'display family');
assertEqual(parsed.rounded.sm, '4px', 'radius sm');
assertEqual(parsed.motion.ease.out, 'cubic-bezier(0.2, 0, 0, 1)', 'easing out');
assertEqual(typeof parsed.bodyLineNumbers.bodyStart === 'number', true, 'body line numbers');

console.log('design-md-parser test PASS');
