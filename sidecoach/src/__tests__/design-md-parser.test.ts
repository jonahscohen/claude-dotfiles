import { parseDesignMd, findTokenLine } from '../design-md-parser';
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

// Regression: bodyLineNumbers
const synth = `---\ncolors:\n  red: "#FF0000"\n---\n\nLine 6`;
const parsedSynth = parseDesignMd(synth);
assertEqual(parsedSynth.bodyLineNumbers.frontmatterStart, 1, 'frontmatterStart for synth');
assertEqual(parsedSynth.bodyLineNumbers.frontmatterEnd, 4, 'frontmatterEnd for synth');
assertEqual(parsedSynth.bodyLineNumbers.bodyStart, 5, 'bodyStart for synth');

// Regression: findTokenLine path traversal (no leaf collision)
const collisionYaml = [
  '---',
  'colors:',
  '  brand:',
  '    red: "#FF0000"',
  '  text:',
  '    red: "#00FF00"',
  '---',
].join('\n');
assertEqual(findTokenLine(collisionYaml, 'colors.brand.red'), 4, 'finds nested brand.red');
assertEqual(findTokenLine(collisionYaml, 'colors.text.red'), 6, 'finds nested text.red, not brand.red');

console.log('design-md-parser regression test PASS');

import { detectTechStack } from '../project-context';
import * as path2 from 'path';

const dotfilesRoot = path2.resolve(__dirname, '../../..');
const stack = detectTechStack(dotfilesRoot);
assertEqual(typeof stack.framework, 'string', 'framework string');
assertEqual('hasAnimationLib' in stack, true, 'hasAnimationLib field');
console.log('detectTechStack test PASS');
