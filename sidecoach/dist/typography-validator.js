"use strict";
/**
 * Typography Validator
 *
 * Operationalizes the absorbed TypeUI typography rules. Pre-wiring these
 * rules lived in `_extracted/external/typeui-fundamentals/typography-principles.md`
 * but no validator consumed them, so violations shipped freely (yesterday's
 * marketing-site had `font-size: 3rem` headings inheriting `line-height: 1.55`
 * from body, a 1.55 ratio on a 51px heading that should be 1.05-1.20).
 *
 * Three rule layers:
 *
 * 1. Modular ratio validation. The project must declare exactly one ratio
 *    token from the enumerated set {1.125, 1.2, 1.25, 1.333, 1.414, 1.5,
 *    1.618}. Every emitted font-size must be derivable from base * ratio^n.
 *    Off-scale sizes fail with a remediation pointing at the nearest
 *    on-scale value.
 *
 * 2. Line-height tier validation. Every heading element with declared
 *    font-size has its line-height checked against the size-tiered range
 *    from TypeUI (body 1.4-1.6, headings 1.05-1.25 tighter as size grows,
 *    UI labels 1.0-1.2, captions 1.3-1.5).
 *
 * 3. Heading-size-by-role validation. h1/major-h2 reserved for display
 *    scale (>=30px). Modal/card titles capped at 18-24px. Inline list
 *    labels capped at smaller.
 *
 * Operates on parsed CSS rules from DomainCheckContext.cssRules. Soft-fails
 * on missing or malformed input - the validator is additive, not gating.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypographyValidator = void 0;
exports.typographyFindingsToGuidance = typographyFindingsToGuidance;
const reference_loader_1 = require("./reference-loader");
const ENUMERATED_RATIOS = [1.125, 1.2, 1.25, 1.333, 1.414, 1.5, 1.618];
function parsePxOrRem(input) {
    if (!input)
        return null;
    const trimmed = input.trim();
    const remMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*rem$/i);
    if (remMatch)
        return parseFloat(remMatch[1]) * 16;
    const pxMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*px$/i);
    if (pxMatch)
        return parseFloat(pxMatch[1]);
    const emMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*em$/i);
    if (emMatch)
        return parseFloat(emMatch[1]) * 16;
    const ptMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*pt$/i);
    if (ptMatch)
        return parseFloat(ptMatch[1]) * 1.333;
    return null;
}
function parseUnitless(input) {
    if (!input)
        return null;
    const trimmed = input.trim();
    const num = parseFloat(trimmed);
    if (Number.isFinite(num) && /^-?\d+(?:\.\d+)?\s*$/.test(trimmed))
        return num;
    return null;
}
function extractDeclarations(rule) {
    if (rule.declarations)
        return rule.declarations;
    if (rule.properties) {
        const out = {};
        for (const { property, value } of rule.properties)
            out[property] = value;
        return out;
    }
    return {};
}
/**
 * Decide which line-height tier applies to a given font-size in px.
 * Returns the matching tier or null when no tier matches (unusual sizes).
 */
function tierForSize(sizePx, tiers) {
    // Tier ranges are encoded in the LineHeightTier.fontSizeRange string in the
    // form "14-18px" or "72px+". Parse each and find the tier whose range
    // contains the size.
    for (const tier of tiers) {
        const range = tier.fontSizeRange.replace(/\s+/g, '').toLowerCase();
        const plusMatch = range.match(/^(\d+(?:\.\d+)?)px\+$/);
        if (plusMatch) {
            const min = parseFloat(plusMatch[1]);
            if (sizePx >= min)
                return tier;
            continue;
        }
        const rangeMatch = range.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)px$/);
        if (rangeMatch) {
            const min = parseFloat(rangeMatch[1]);
            const max = parseFloat(rangeMatch[2]);
            if (sizePx >= min && sizePx <= max)
                return tier;
        }
    }
    return null;
}
function isHeadingSelector(selector) {
    return /(?:^|[\s>+~,(:])h[1-6](?:[\s>+~,)$:.\[]|$)/i.test(selector);
}
function isUiSelector(selector) {
    return /\b(?:button|input|label|nav|menu|tab|chip|badge|tag)\b/i.test(selector);
}
function isCaptionSelector(selector) {
    return /\b(?:caption|small|figcaption|meta|footnote|legend|sub|sup)\b/i.test(selector);
}
function checkLineHeightTier(cssRules, tiers) {
    const findings = [];
    for (const rule of cssRules) {
        if (!rule.selector)
            continue;
        const decls = extractDeclarations(rule);
        const sizeRaw = decls['font-size'];
        const lhRaw = decls['line-height'];
        if (!sizeRaw || !lhRaw)
            continue;
        const sizePx = parsePxOrRem(sizeRaw);
        if (sizePx === null)
            continue;
        let lhValue = parseUnitless(lhRaw);
        if (lhValue === null) {
            // Could be a px or em line-height; convert to unitless ratio
            const lhPx = parsePxOrRem(lhRaw);
            if (lhPx !== null)
                lhValue = lhPx / sizePx;
        }
        if (lhValue === null)
            continue;
        // Decide which tier should apply
        const selectorLower = rule.selector.toLowerCase();
        const isHeading = isHeadingSelector(selectorLower);
        const isUi = isUiSelector(selectorLower);
        const isCaption = isCaptionSelector(selectorLower);
        const tier = isHeading
            ? tierForSize(sizePx, tiers.filter((t) => /heading/i.test(t.context))) ?? tierForSize(sizePx, tiers)
            : isUi
                ? tiers.find((t) => /label/i.test(t.context)) ?? null
                : isCaption
                    ? tiers.find((t) => /caption/i.test(t.context)) ?? null
                    : tierForSize(sizePx, tiers);
        if (!tier)
            continue;
        const [min, max] = tier.lineHeightRange;
        if (lhValue < min || lhValue > max) {
            const expectedRange = `${min}-${max}`;
            const isHeadingTooLoose = isHeading && lhValue > max;
            findings.push({
                severity: isHeadingTooLoose && sizePx >= 30 ? 'P0' : 'P1',
                rule: 'line-height-tier',
                selector: rule.selector,
                property: 'line-height',
                value: lhValue.toFixed(3),
                expected: expectedRange,
                message: `${rule.selector} has font-size ${sizePx.toFixed(0)}px and line-height ${lhValue.toFixed(3)} - outside the ${tier.context} tier range of ${expectedRange}. ${tier.why}`,
                remediation: `Set line-height between ${min} and ${max} for ${tier.context}. Display-size headings (>=30px) need tight line-height (1.05-1.20); when they inherit body line-height (typically 1.5+), they read as double-spaced. Add an explicit \`line-height: ${((min + max) / 2).toFixed(2)}\` on the heading rule.`,
            });
        }
    }
    return findings;
}
function checkHeadingSizeByRole(cssRules) {
    const findings = [];
    // Heading-by-role caps. These are absolute rules from TypeUI section 2.6.
    for (const rule of cssRules) {
        if (!rule.selector)
            continue;
        const decls = extractDeclarations(rule);
        const sizeRaw = decls['font-size'];
        if (!sizeRaw)
            continue;
        const sizePx = parsePxOrRem(sizeRaw);
        if (sizePx === null)
            continue;
        const selectorLower = rule.selector.toLowerCase();
        // Card titles cap at 20px
        if (/\.(?:card|tile)__?(?:title|heading|name)|\.(?:card|tile)\s+h[2-6]/.test(selectorLower)) {
            if (sizePx > 20) {
                findings.push({
                    severity: 'P1',
                    rule: 'heading-size-by-role',
                    selector: rule.selector,
                    property: 'font-size',
                    value: `${sizePx}px`,
                    expected: '<=20px',
                    message: `Card title at ${sizePx.toFixed(0)}px exceeds the 20px cap for in-card headings. Larger sizes compete with the page hero.`,
                    remediation: 'Reduce card title to <=20px. If you need emphasis inside a card, use weight or color, not size.',
                });
            }
        }
        // Modal titles cap at 18-24px AND smaller than page hero
        if (/\.(?:modal|dialog)__?title|\[role="dialog"\]\s+h[1-6]/.test(selectorLower)) {
            if (sizePx > 24) {
                findings.push({
                    severity: 'P1',
                    rule: 'heading-size-by-role',
                    selector: rule.selector,
                    property: 'font-size',
                    value: `${sizePx}px`,
                    expected: '18-24px',
                    message: `Modal title at ${sizePx.toFixed(0)}px exceeds the 24px cap. Modal titles should be smaller than the page hero behind them.`,
                    remediation: 'Reduce modal title to 18-24px. The page underneath should still own the visual hierarchy when the modal is open.',
                });
            }
        }
        // Footer column titles cap at 16px
        if (/\.(?:footer|site-footer)__?(?:column|col)__?(?:title|heading)/.test(selectorLower)) {
            if (sizePx > 16) {
                findings.push({
                    severity: 'P1',
                    rule: 'heading-size-by-role',
                    selector: rule.selector,
                    property: 'font-size',
                    value: `${sizePx}px`,
                    expected: '13-16px',
                    message: `Footer column title at ${sizePx.toFixed(0)}px exceeds the 16px cap. Footer columns are tertiary surfaces; their titles should not compete with section headings above.`,
                    remediation: 'Reduce footer column title to 13-16px.',
                });
            }
        }
    }
    return findings;
}
function checkModularRatio(cssRules, designTokens) {
    const findings = [];
    // Find declared ratio (the project should expose `--type-ratio` or
    // `typography.scale.ratio` in tokens)
    const declaredRatio = designTokens?.typography?.scale?.ratio ??
        designTokens?.['type-ratio'] ??
        null;
    if (declaredRatio !== null) {
        if (!ENUMERATED_RATIOS.includes(Number(declaredRatio))) {
            findings.push({
                severity: 'P1',
                rule: 'modular-ratio',
                property: 'type-ratio',
                value: String(declaredRatio),
                expected: ENUMERATED_RATIOS.join(' | '),
                message: `Declared type ratio ${declaredRatio} is not in the enumerated set ${ENUMERATED_RATIOS.join(', ')}. Off-scale ratios produce off-scale sizes and break the rhythm.`,
                remediation: `Pick exactly one ratio from {${ENUMERATED_RATIOS.join(', ')}}. Most projects work well with 1.25 (major third) or 1.333 (perfect fourth) for product UI, or 1.5+ for editorial brand work.`,
            });
        }
        // Find all font-size declarations and check if they map to base * ratio^n
        const base = designTokens?.typography?.scale?.base
            ? parsePxOrRem(String(designTokens.typography.scale.base))
            : 17;
        if (base !== null) {
            const ratio = Number(declaredRatio);
            const seenSizes = new Set();
            for (const rule of cssRules) {
                const decls = extractDeclarations(rule);
                const sizeRaw = decls['font-size'];
                if (!sizeRaw)
                    continue;
                const sizePx = parsePxOrRem(sizeRaw);
                if (sizePx === null)
                    continue;
                if (seenSizes.has(Math.round(sizePx * 100)))
                    continue;
                seenSizes.add(Math.round(sizePx * 100));
                // Compute the nearest n such that base * ratio^n == sizePx
                const n = Math.log(sizePx / base) / Math.log(ratio);
                const nearestN = Math.round(n);
                const onScaleValue = base * Math.pow(ratio, nearestN);
                const drift = Math.abs(sizePx - onScaleValue) / onScaleValue;
                if (drift > 0.05) {
                    findings.push({
                        severity: 'P2',
                        rule: 'modular-ratio',
                        selector: rule.selector,
                        property: 'font-size',
                        value: `${sizePx.toFixed(1)}px`,
                        expected: `${onScaleValue.toFixed(1)}px (base ${base}px * ratio^${nearestN})`,
                        message: `${rule.selector ?? '(rule)'} uses ${sizePx.toFixed(1)}px which is ${(drift * 100).toFixed(0)}% off the modular scale (nearest on-scale value: ${onScaleValue.toFixed(1)}px).`,
                        remediation: `Use ${onScaleValue.toFixed(1)}px or refactor to the next step above/below. Off-scale sizes accumulate and read as visual noise.`,
                    });
                }
            }
        }
    }
    return findings;
}
exports.TypographyValidator = {
    validate(ctx) {
        const cssRules = (ctx.cssRules || []);
        const tiers = (0, reference_loader_1.loadLineHeightTiers)();
        const findings = [];
        findings.push(...checkLineHeightTier(cssRules, tiers));
        findings.push(...checkHeadingSizeByRole(cssRules));
        findings.push(...checkModularRatio(cssRules, ctx.designTokens || {}));
        const rulesChecked = 3;
        const failedRules = new Set(findings.map((f) => f.rule)).size;
        const passCount = Math.max(0, rulesChecked - failedRules);
        const passRate = ((passCount / rulesChecked) * 100).toFixed(0) + '%';
        const p0 = findings.filter((f) => f.severity === 'P0').length;
        const p1 = findings.filter((f) => f.severity === 'P1').length;
        const summary = findings.length === 0
            ? `Typography validator: 0 findings. Modular ratio, line-height tiers, and heading-size-by-role all pass.`
            : `Typography validator: ${findings.length} findings (P0 ${p0} blocking, P1 ${p1} strong-rec). Pass: ${passCount}/${rulesChecked} rule classes (${passRate}).`;
        return { rulesChecked, findings, passCount, passRate, summary };
    },
};
/**
 * Convenience: convert a TypographyReport into guidance lines for a flow.
 */
function typographyFindingsToGuidance(report) {
    const lines = [report.summary];
    if (report.findings.length === 0)
        return lines;
    lines.push('');
    for (const f of report.findings) {
        const head = f.selector ? `${f.selector} { ${f.property}: ${f.value} }` : `${f.property}: ${f.value}`;
        lines.push(`[${f.severity}] ${f.rule}: ${head}`);
        lines.push(`    Expected: ${f.expected ?? '(per tier)'}`);
        lines.push(`    Why: ${f.message}`);
        lines.push(`    Fix: ${f.remediation}`);
        lines.push('');
    }
    return lines;
}
//# sourceMappingURL=typography-validator.js.map