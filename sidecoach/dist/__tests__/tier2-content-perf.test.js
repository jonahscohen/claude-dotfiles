"use strict";
// T-0034 unit test for the Tier-2 content/perf domain rules.
// Run with: npx ts-node src/__tests__/tier2-content-perf.test.ts
//
// Asserts: unique rule ids; expected domains; positive fixtures pass; negative
// fixtures fail; and absent markup degrades to N/A (passed:true).
Object.defineProperty(exports, "__esModule", { value: true });
const tier2_content_perf_1 = require("../domains/tier2-content-perf");
function fail(msg) { console.error('FAIL: ' + msg); process.exit(1); }
function run(id, ctx) {
    const rule = tier2_content_perf_1.TIER2_CONTENT_PERF_RULES.find(r => r.id === id);
    if (!rule)
        fail(`rule ${id} not found`);
    return rule.checkFunction(ctx);
}
// --- 1. unique ids + correct domains + counts -----------------------------
const ids = tier2_content_perf_1.TIER2_CONTENT_PERF_RULES.map(r => r.id);
if (new Set(ids).size !== ids.length)
    fail('duplicate rule id detected');
if (ids.length !== 15)
    fail(`expected 15 rules, got ${ids.length}`);
if (tier2_content_perf_1.TIER2_CONTENT_RESILIENCE_RULES.length !== 4)
    fail('content-resilience should have 4 rules');
if (tier2_content_perf_1.TIER2_TOUCH_RULES.length !== 4)
    fail('touch should have 4 rules');
if (tier2_content_perf_1.TIER2_IMAGE_PERF_RULES.length !== 3)
    fail('image-perf should have 3 rules');
if (tier2_content_perf_1.TIER2_PERF_SPECIFICS_RULES.length !== 4)
    fail('perf-specifics should have 4 rules');
for (const r of tier2_content_perf_1.TIER2_CONTENT_RESILIENCE_RULES)
    if (r.domain !== 'polish')
        fail(`${r.id} domain should be polish`);
for (const r of tier2_content_perf_1.TIER2_TOUCH_RULES)
    if (r.domain !== 'responsive')
        fail(`${r.id} domain should be responsive`);
for (const r of [...tier2_content_perf_1.TIER2_IMAGE_PERF_RULES, ...tier2_content_perf_1.TIER2_PERF_SPECIFICS_RULES])
    if (r.domain !== 'performance')
        fail(`${r.id} domain should be performance`);
// every result echoes its own ruleId/domain
for (const r of tier2_content_perf_1.TIER2_CONTENT_PERF_RULES) {
    const res = r.checkFunction({});
    if (res.ruleId !== r.id)
        fail(`${r.id} returns mismatched ruleId ${res.ruleId}`);
    if (res.domain !== r.domain)
        fail(`${r.id} returns mismatched domain ${res.domain}`);
}
// --- 2. positive fixtures pass --------------------------------------------
const positive = {
    CONTENT_001: { html: '<div style="display:flex"><span style="text-overflow:ellipsis;min-width:0">x</span></div>' },
    CONTENT_002: { html: '<p class="description" style="overflow-wrap:break-word">x</p>' },
    CONTENT_003: { html: '<ul>{items.map(i => <li/>)}</ul>', componentTree: { code: 'if (items.length === 0) return <Empty/>' } },
    CONTENT_004: { html: '<div class="skeleton" style="height: 40px; width: 100px"></div>' },
    TOUCH_001: { html: '<button style="touch-action: manipulation">go</button>' },
    TOUCH_002: { html: '<button style="-webkit-tap-highlight-color: transparent">go</button>' },
    TOUCH_003: { html: '<div class="modal" style="overscroll-behavior: contain"></div>' },
    TOUCH_004: { html: '<input type="text" style="font-size: 16px">' },
    IMGPERF_001: { html: '<img src="a.png" width="100" height="80">' },
    IMGPERF_002: { html: '<img src="a.png" loading="lazy">' },
    IMGPERF_003: { html: '<img src="a.png" fetchpriority="high">' },
    PERFX_001: { html: "fetch('/x', { method: 'POST', headers: { 'Idempotency-Key': k } })" },
    PERFX_002: { html: "// latency-budget: 200ms\nfetch('/x')" },
    PERFX_003: { html: '<section style="content-visibility: auto"></section>' },
    PERFX_004: { html: '<div>static markup, no layout reads</div>' }
};
for (const [id, ctx] of Object.entries(positive)) {
    const res = run(id, ctx);
    if (!res.passed)
        fail(`${id} positive fixture should pass -> ${res.message}`);
}
// --- 3. negative fixtures fail --------------------------------------------
const negative = {
    CONTENT_001: { html: '<div style="display:flex"><span style="text-overflow:ellipsis">x</span></div>' }, // no min-width:0
    CONTENT_002: { html: '<p class="description">x</p>' }, // no wrap/clamp
    CONTENT_003: { html: '<ul>{items.map(i => <li/>)}</ul>' }, // no empty/error state
    CONTENT_004: { html: '<div class="skeleton"></div>' }, // no dimensions
    TOUCH_001: { html: '<button>go</button>' }, // no touch-action
    TOUCH_002: { html: '<button>go</button>' }, // no tap-highlight-color
    TOUCH_003: { html: '<div class="modal"></div>' }, // no overscroll-behavior
    TOUCH_004: { html: '<input type="text" style="font-size: 13px">' }, // sub-16px
    IMGPERF_001: { html: '<img src="a.png">' }, // no dimensions
    IMGPERF_002: { html: '<img src="a.png" width="10" height="10">' }, // no lazy
    IMGPERF_003: { html: '<img src="a.png" width="10" height="10">' }, // no fetchpriority
    PERFX_001: { html: "fetch('/x', { method: 'POST' })" }, // no idempotency key
    PERFX_002: { html: "fetch('/x')" }, // no latency budget
    PERFX_003: { html: '<section></section>' }, // no content-visibility
    PERFX_004: { html: 'const r = el.getBoundingClientRect();' } // layout read present
};
for (const [id, ctx] of Object.entries(negative)) {
    const res = run(id, ctx);
    if (res.passed)
        fail(`${id} negative fixture should fail -> ${res.message}`);
}
// --- 4. absent markup => N/A pass -----------------------------------------
for (const r of tier2_content_perf_1.TIER2_CONTENT_PERF_RULES) {
    const res = r.checkFunction({});
    if (!res.passed)
        fail(`${r.id} should be N/A pass on empty context -> ${res.message}`);
    if (!/N\/A/.test(res.message))
        fail(`${r.id} N/A message should say N/A -> ${res.message}`);
}
console.log(`tier2-content-perf test PASS (${ids.length} rules, all positive/negative/N-A assertions held)`);
//# sourceMappingURL=tier2-content-perf.test.js.map