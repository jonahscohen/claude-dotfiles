// Unit test for tier2-visual-copy domain rules.
// Run: npx ts-node src/__tests__/tier2-visual-copy.test.ts
//
// Verifies: unique rule ids, correct domains, positive + negative fixtures per
// group, absent-markup N/A pass, and that copywriting rules surface as advisory
// (severity 'low').

import {
  TIER2_VISUAL_COPY_RULES,
  DARK_MODE_RULES,
  CHART_SELECTION_RULES,
  TIER2_MOTION_RULES,
  CHAR_SUBSTITUTION_RULES,
  COPYWRITING_RULES,
  CHART_SELECTION_MATRIX,
  recommendChart,
} from '../domains/tier2-visual-copy';
import { DomainValidationRule, DomainCheckContext } from '../extended-domain-validator';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(label);
  }
}

function ruleById(id: string): DomainValidationRule {
  const r = TIER2_VISUAL_COPY_RULES.find((x) => x.id === id);
  if (!r) throw new Error(`rule ${id} not found`);
  return r;
}

function run(id: string, ctx: DomainCheckContext) {
  return ruleById(id).checkFunction(ctx);
}

// ---------------------------------------------------------------------------
// 1. Structural: unique ids + expected domains + counts
// ---------------------------------------------------------------------------
const ids = TIER2_VISUAL_COPY_RULES.map((r) => r.id);
assert(new Set(ids).size === ids.length, 'rule ids are unique');
assert(TIER2_VISUAL_COPY_RULES.length === 18, `expected 18 rules, got ${TIER2_VISUAL_COPY_RULES.length}`);

assert(DARK_MODE_RULES.every((r) => r.domain === 'color'), 'dark-mode rules use color domain');
assert(CHART_SELECTION_RULES.every((r) => r.domain === 'data-visualization'), 'chart rules use data-visualization domain');
assert(TIER2_MOTION_RULES.every((r) => r.domain === 'motion'), 'motion rules use motion domain');
assert(CHAR_SUBSTITUTION_RULES.every((r) => r.domain === 'typography'), 'char-sub rules use typography domain');
assert(COPYWRITING_RULES.every((r) => r.domain === 'ux-writing'), 'copy rules use ux-writing domain');

// ruleId inside result matches the rule's id
assert(
  TIER2_VISUAL_COPY_RULES.every((r) => r.checkFunction({}).ruleId === r.id),
  'every result.ruleId matches rule.id'
);

// ---------------------------------------------------------------------------
// 2. Copywriting rules surface as advisory (severity 'low')
// ---------------------------------------------------------------------------
assert(COPYWRITING_RULES.every((r) => r.severity === 'low'), 'all copywriting rules are advisory (low severity)');

// ---------------------------------------------------------------------------
// 3. Absent-markup => N/A pass for every rule
// ---------------------------------------------------------------------------
assert(
  TIER2_VISUAL_COPY_RULES.every((r) => r.checkFunction({}).passed === true),
  'all rules pass (N/A) when no markup is present'
);

// ---------------------------------------------------------------------------
// 4. Dark-mode positive + negative
// ---------------------------------------------------------------------------
assert(
  run('DARKMODE_001', { html: '<html>', cssRules: ['@media (prefers-color-scheme: dark){}', ':root{color-scheme:dark}'] }).passed,
  'DARKMODE_001 passes when color-scheme:dark declared'
);
assert(
  !run('DARKMODE_001', { html: '<meta name="theme-color" content="#000">', cssRules: ['@media (prefers-color-scheme: dark){ body{} }'] }).passed,
  'DARKMODE_001 fails when dark intent but no color-scheme'
);
assert(
  run('DARKMODE_001', { html: '<div>light only page</div>', cssRules: ['.a{color:red}'] }).passed,
  'DARKMODE_001 N/A passes with no dark-mode intent'
);
assert(
  !run('DARKMODE_003', { html: '<select><option>x</option></select>', cssRules: ['select{ padding: 4px }'] }).passed,
  'DARKMODE_003 fails when select lacks explicit bg+color'
);
assert(
  run('DARKMODE_003', { html: '<select></select>', cssRules: ['select{ background-color:#111; color:#eee }'] }).passed,
  'DARKMODE_003 passes when select sets bg+color'
);
assert(
  run('DARKMODE_003', { html: '<div>no select here</div>' }).passed,
  'DARKMODE_003 N/A passes with no select'
);

// ---------------------------------------------------------------------------
// 5. Chart selection positive + negative + matrix/recommend helper
// ---------------------------------------------------------------------------
assert(
  !run('CHART_003', { html: '<svg class="chart"><rect/></svg>' }).passed,
  'CHART_003 fails when chart has no text/table fallback'
);
assert(
  run('CHART_003', { html: '<figure><svg class="chart"></svg><figcaption>Revenue by month</figcaption></figure>' }).passed,
  'CHART_003 passes with a figcaption fallback'
);
assert(
  run('CHART_003', { html: '<div>just text, no chart</div>' }).passed,
  'CHART_003 N/A passes with no chart'
);
assert(run('CHART_001', { html: '<canvas class="chart"></canvas>' }).passed, 'CHART_001 is advisory pass when chart present');
assert(CHART_SELECTION_RULES.find((r) => r.id === 'CHART_001')!.severity === 'low', 'CHART_001 is advisory severity');
assert(Object.keys(CHART_SELECTION_MATRIX).length >= 5, 'chart matrix has >=5 types');
assert(CHART_SELECTION_MATRIX.bar.dataVolume.svgMax === 1000, 'bar matrix encodes svg threshold');
assert(recommendChart('show the trend over time')[0].type === 'line', 'recommendChart maps trend->line');
assert(recommendChart('correlation between two variables')[0].type === 'scatter', 'recommendChart maps correlation->scatter');
assert(recommendChart('')[0] !== undefined, 'recommendChart falls back to defaults for empty intent');

// ---------------------------------------------------------------------------
// 6. Motion positive + negative
// ---------------------------------------------------------------------------
assert(
  run('MOTION_HF_001', { html: '<div class="tooltip"></div>', cssRules: ['.tooltip{ transition: opacity 120ms }'] }).passed,
  'MOTION_HF_001 passes when ephemeral UI defines a transition'
);
assert(
  !run('MOTION_HF_001', { html: '<div class="tooltip">hi</div>', cssRules: ['.tooltip{ color:#000 }'] }).passed,
  'MOTION_HF_001 fails when ephemeral UI has no transition'
);
assert(
  run('MOTION_HF_001', { html: '<div class="static-block"></div>' }).passed,
  'MOTION_HF_001 N/A passes with no ephemeral UI'
);
assert(
  !run('MOTION_PAIR_001', {
    html: '<div class="modal"></div><div class="overlay"></div>',
    cssRules: ['.modal{ transition: transform 200ms ease-out }', '.overlay{ transition: opacity 200ms linear }'],
  }).passed,
  'MOTION_PAIR_001 fails when modal and overlay use different easing'
);
assert(
  run('MOTION_PAIR_001', {
    html: '<div class="modal"></div><div class="overlay"></div>',
    cssRules: ['.modal{ transition: transform 200ms ease-out }', '.overlay{ transition: opacity 200ms ease-out }'],
  }).passed,
  'MOTION_PAIR_001 passes when modal and overlay share easing'
);
assert(
  run('MOTION_PAIR_001', { html: '<div class="lonely-modal"></div>' }).passed,
  'MOTION_PAIR_001 N/A passes when no pair present'
);

// ---------------------------------------------------------------------------
// 7. Char-substitution positive + negative
// ---------------------------------------------------------------------------
assert(!run('CHARSUB_001', { html: '<p>Loading...</p>' }).passed, 'CHARSUB_001 fails on three periods');
assert(run('CHARSUB_001', { html: '<p>Loading…</p>' }).passed, 'CHARSUB_001 passes on ellipsis glyph');
assert(!run('CHARSUB_002', { html: '<p>She said "hello"</p>' }).passed, 'CHARSUB_002 fails on straight quotes');
assert(run('CHARSUB_002', { html: '<p>She said “hello”</p>' }).passed, 'CHARSUB_002 passes on curly quotes');
assert(!run('CHARSUB_003', { html: '<p>Upload up to 10 MB files</p>' }).passed, 'CHARSUB_003 fails on unglued value+unit');
assert(run('CHARSUB_003', { html: '<p>Upload up to 10&nbsp;MB files</p>' }).passed, 'CHARSUB_003 passes with nbsp');
assert(
  !run('CHARSUB_004', { html: '<h2 id="intro">Intro</h2>', cssRules: ['h2{ font-size:24px }'] }).passed,
  'CHARSUB_004 fails when heading anchor lacks scroll-margin-top'
);
assert(
  run('CHARSUB_004', { html: '<h2 id="intro">Intro</h2>', cssRules: ['h2[id]{ scroll-margin-top:80px }'] }).passed,
  'CHARSUB_004 passes when scroll-margin-top present'
);
assert(run('CHARSUB_004', { html: '<h2>No anchor</h2>' }).passed, 'CHARSUB_004 N/A passes with no heading anchor');

// ---------------------------------------------------------------------------
// 8. Copywriting positive + negative
// ---------------------------------------------------------------------------
assert(!run('COPY_001', { html: '<p>The file was uploaded by the server.</p>' }).passed, 'COPY_001 flags passive voice');
assert(run('COPY_001', { html: '<p>We uploaded your file.</p>' }).passed, 'COPY_001 passes active voice');
assert(!run('COPY_002', { html: '<button>save settings</button>' }).passed, 'COPY_002 flags all-lowercase button');
assert(run('COPY_002', { html: '<button>Save Settings</button>' }).passed, 'COPY_002 passes Title Case button');
assert(!run('COPY_003', { html: '<button>Submit</button>' }).passed, 'COPY_003 flags generic Submit');
assert(run('COPY_003', { html: '<button>Create Account</button>' }).passed, 'COPY_003 passes specific label');
assert(
  !run('COPY_004', { html: '<div class="error">Invalid</div>' }).passed,
  'COPY_004 flags error with no recovery hint'
);
assert(
  run('COPY_004', { html: '<div class="error">Email is invalid. Use the format name@example.com.</div>' }).passed,
  'COPY_004 passes error that includes the fix'
);
assert(!run('COPY_005', { html: '<p>You have three items.</p>' }).passed, 'COPY_005 flags spelled-out count');
assert(run('COPY_005', { html: '<p>You have 3 items.</p>' }).passed, 'COPY_005 passes numeral count');

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log(`\nTIER2_VISUAL_COPY tests: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log('All assertions passed.');
