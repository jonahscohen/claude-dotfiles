"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// T-0032: Tailwind/shadcn token-utility carve-out for the hex-in-interactive-state
// and border-radius-literal-drift checks. In Tailwind context, token-backed
// utilities (bg-primary/90, rounded-md/rounded-lg) and token channels
// (hsl(var(--token)), calc(var(--radius) - 2px)) are token-compliant and PASS.
// Outside Tailwind context, raw hex in :hover and multiple raw radius literals
// STILL flag (strict behavior unchanged).
const taste_validator_1 = require("../taste-validator");
// Realistic shadcn-style document: @tailwind directive, hsl(var(--token)) theme
// channel, the rounded-* scale derived from --radius via calc(), token utility
// classNames including hover:bg-primary/90, and a :hover block that styles via a
// token channel with an incidental hex shadow.
const TAILWIND_HTML = `<!doctype html>
<html><head>
<style>
@tailwind base;
:root { --primary: 240 6% 10%; --radius: 0.5rem; }
.rounded-md { border-radius: calc(var(--radius) - 2px); }
.rounded-lg { border-radius: var(--radius); }
.rounded-sm { border-radius: calc(var(--radius) - 4px); }
.rounded-xl { border-radius: calc(var(--radius) + 4px); }
.btn { background-color: hsl(var(--primary)); }
.btn:hover { background-color: hsl(var(--primary) / 0.9); box-shadow: 0 1px 2px #00000010; }
</style>
</head>
<body>
  <button class="btn rounded-md hover:bg-primary/90">Save</button>
  <div class="card rounded-lg text-muted-foreground border-input">Card</div>
</body></html>`;
// Plain CSS project (no Tailwind markers): a CSS var is defined, a :hover block
// uses raw hex, and three distinct raw border-radius literals are present.
const PLAIN_HTML = `<!doctype html>
<html><head>
<style>
:root { --c-brand: #1a1a1a; }
.card { border-radius: 3px; }
.panel { border-radius: 7px; }
.modal { border-radius: 11px; }
.btn:hover { background: #abc123; }
</style>
</head>
<body><button class="btn">Save</button></body></html>`;
const tailwind = (0, taste_validator_1.validateTaste)(TAILWIND_HTML);
const plain = (0, taste_validator_1.validateTaste)(PLAIN_HTML);
const checks = [];
// Tailwind context: both checks PASS (carve-out applies).
checks.push([
    'Tailwind: rounded-md + rounded-lg (token-derived radii) NOT flagged',
    !tailwind.some((v) => v.ruleId === 'taste/border-radius-inconsistency'),
]);
checks.push([
    'Tailwind: bg-primary/90 token-driven :hover NOT flagged',
    !tailwind.some((v) => v.ruleId === 'taste/hex-in-interactive-state'),
]);
// Non-Tailwind context: both checks STILL flag (strict behavior unchanged).
checks.push([
    'Plain: multiple raw border-radius literals STILL flag',
    plain.some((v) => v.ruleId === 'taste/border-radius-inconsistency'),
]);
checks.push([
    'Plain: raw #abc123 in :hover with CSS vars STILL flags',
    plain.some((v) => v.ruleId === 'taste/hex-in-interactive-state'),
]);
let allPass = true;
for (const [label, ok] of checks) {
    console.log(ok ? `PASS ${label}` : `FAIL ${label}`);
    if (!ok)
        allPass = false;
}
console.log(allPass
    ? 'taste-validator-tailwind-tokens PASS'
    : 'taste-validator-tailwind-tokens FAIL');
process.exit(allPass ? 0 : 1);
//# sourceMappingURL=taste-validator-tailwind-tokens.test.js.map