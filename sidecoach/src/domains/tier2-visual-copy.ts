// Tier 2 Visual + Copy domain rules for the Sidecoach extended validator.
//
// Adds dark-mode device mechanics, chart-type selection guidance, two motion
// rules, character-substitution typography lint, and opinionated UX copywriting
// defaults. Rules are static heuristics over ctx.html / ctx.cssRules /
// ctx.htmlElement and degrade to N/A (passed:true) when the relevant markup is
// absent, matching the graceful-missing-ctx style of extended-domain-validator.ts.
//
// source: vercel/web-interface-guidelines (MIT) - dark-mode, motion timing, copy defaults
// source: ui-ux-pro-max charts.csv (MIT) - chart-type selection matrix, a11y grades, library picks
//
// Domain names are matched to the existing validator: dark-mode rules use the
// 'color' domain, chart-selection uses 'data-visualization', motion uses
// 'motion', char-substitution uses 'typography', copywriting uses 'ux-writing'.
//
// NOTE: this module intentionally does NOT implement an emdash ban - that lives
// in content-guard.sh and must not be duplicated here.

import { DomainValidationRule, DomainCheckContext, DomainCheckResult } from '../extended-domain-validator';

// ---------------------------------------------------------------------------
// Shared helpers (inlined - the validator's formsHaystack/gestureHaystack are
// not exported; these mirror their shape so the lead does not need to export
// anything from extended-domain-validator.ts).
// ---------------------------------------------------------------------------

/** Combined raw markup/style text from every available channel. */
function rawHaystack(ctx: DomainCheckContext): string {
  const parts: string[] = [];
  if (ctx.html) parts.push(ctx.html);
  if (ctx.cssRules?.length) parts.push(ctx.cssRules.join('\n'));
  if (ctx.htmlElement) {
    try { parts.push((ctx.htmlElement as any).outerHTML || ''); } catch { /* no DOM */ }
  }
  return parts.join('\n');
}

/** Lowercased combined haystack for case-insensitive substring/regex checks. */
function lowerHaystack(ctx: DomainCheckContext): string {
  return rawHaystack(ctx).toLowerCase();
}

/** True when any markup/style channel carries content. */
function hasMarkup(ctx: DomainCheckContext): boolean {
  return rawHaystack(ctx).trim().length > 0;
}

/** CSS-only text (cssRules joined plus any inline <style> blocks in html). */
function cssText(ctx: DomainCheckContext): string {
  const parts: string[] = [];
  if (ctx.cssRules?.length) parts.push(ctx.cssRules.join('\n'));
  if (ctx.html) {
    const styles = ctx.html.match(/<style[\s\S]*?<\/style>/gi);
    if (styles) parts.push(styles.join('\n'));
  }
  return parts.join('\n');
}

/** Visible text content with <style>/<script> blocks and tags stripped. */
function visibleText(ctx: DomainCheckContext): string {
  let raw = '';
  if (ctx.html) raw += ctx.html + '\n';
  if (ctx.htmlElement) {
    try { raw += (ctx.htmlElement as any).textContent || ''; } catch { /* no DOM */ }
  }
  raw = raw
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return raw;
}

/** Build a uniform N/A pass result so absent markup never reports a violation. */
function notApplicable(ruleId: string, domain: string, what: string): DomainCheckResult {
  return {
    ruleId,
    domain,
    passed: true,
    message: `N/A - no ${what} present to evaluate`,
  };
}

// ===========================================================================
// Dark-mode device mechanics (domain: 'color')
// ===========================================================================

/** Signals that a build intends to support dark mode at all. */
function hasDarkModeIntent(lower: string): boolean {
  return /prefers-color-scheme\s*:\s*dark|data-theme|theme-color|class=["'][^"']*\bdark\b|color-scheme/.test(lower);
}

export const DARK_MODE_RULES: DomainValidationRule[] = [
  {
    id: 'DARKMODE_001',
    domain: 'color',
    name: 'color-scheme Declared for Dark Support',
    description: 'When dark mode is supported, set color-scheme: dark (or light dark) on the root so form controls, scrollbars, and UA widgets render with the correct dark palette.',
    severity: 'medium',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('DARKMODE_001', 'color', 'markup');
      const lower = lowerHaystack(ctx);
      if (!hasDarkModeIntent(lower)) return notApplicable('DARKMODE_001', 'color', 'dark-mode intent');
      // Match the color-scheme CSS property, NOT the prefers-color-scheme media feature.
      const passed = /(?<!prefers-)color-scheme\s*:\s*[^;}]*\bdark\b/.test(lower);
      return {
        ruleId: 'DARKMODE_001',
        domain: 'color',
        passed,
        message: passed ? 'color-scheme dark declared for dark-mode support' : 'Dark-mode intent detected but color-scheme is not set to dark',
        remediation: 'Add :root { color-scheme: light dark; } (or color-scheme: dark) so native widgets adopt the dark palette',
      };
    },
  },
  {
    id: 'DARKMODE_002',
    domain: 'color',
    name: 'theme-color Meta Matches Background',
    description: 'A <meta name="theme-color"> should be present (ideally one per scheme via media) so the browser chrome matches the page background in dark mode.',
    severity: 'medium',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('DARKMODE_002', 'color', 'markup');
      const lower = lowerHaystack(ctx);
      if (!hasDarkModeIntent(lower)) return notApplicable('DARKMODE_002', 'color', 'dark-mode intent');
      const passed = /<meta[^>]*name=["']theme-color["']/.test(lower);
      return {
        ruleId: 'DARKMODE_002',
        domain: 'color',
        passed,
        message: passed ? 'theme-color meta present' : 'Dark-mode build is missing a theme-color meta tag',
        remediation: 'Add <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b0b0b"> matching the dark background',
      };
    },
  },
  {
    id: 'DARKMODE_003',
    domain: 'color',
    name: 'Native select Sets Explicit Background and Color',
    description: 'Windows dark mode renders unstyled native <select> with a dark dropdown but light option contrast unless background-color AND color are set explicitly.',
    severity: 'high',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('DARKMODE_003', 'color', 'markup');
      const lower = lowerHaystack(ctx);
      if (!/<select\b/.test(lower)) return notApplicable('DARKMODE_003', 'color', '<select> element');
      const rules = ctx.cssRules ?? [cssText(ctx)];
      const passed = rules.some((r) => {
        const lr = r.toLowerCase();
        return lr.includes('select') && lr.includes('background') && /(^|[^-])color\s*:/.test(lr);
      });
      return {
        ruleId: 'DARKMODE_003',
        domain: 'color',
        passed,
        message: passed ? 'Native select sets explicit background and color' : 'Native <select> does not set explicit background-color and color (Windows dark-mode contrast risk)',
        remediation: 'Style select { background-color: var(--bg); color: var(--fg); } and also style option for Windows contrast',
      };
    },
  },
];

// ===========================================================================
// Chart-type SELECTION capability (domain: 'data-visualization')
// Advisory selection guidance plus a real text/table fallback gate.
// ===========================================================================

export interface ChartTypeGuidance {
  type: string;
  whenToUse: string[];
  whenNotToUse: string[];
  /** Rendering thresholds by data-point count. */
  dataVolume: { svgMax: number; canvasMax: number; aggregateAbove: number };
  /** Native accessibility grade of the chart type (A best, D worst). */
  a11yGrade: 'A' | 'B' | 'C' | 'D';
  /** The mandatory non-visual fallback for this type. */
  fallback: string;
  library: string;
}

// source: ui-ux-pro-max charts.csv - canonical when-to-use / when-NOT matrix.
// Thresholds: SVG stays crisp and inspectable to ~1k nodes; Canvas to ~100k;
// beyond that aggregate (bin/downsample/server-side rollup) before rendering.
export const CHART_SELECTION_MATRIX: Record<string, ChartTypeGuidance> = {
  bar: {
    type: 'bar',
    whenToUse: ['comparing values across discrete categories', 'ranking', 'part-to-whole when stacked'],
    whenNotToUse: ['continuous time trends (use line)', 'more than ~12 categories without scroll/sort'],
    dataVolume: { svgMax: 1000, canvasMax: 100000, aggregateAbove: 100000 },
    a11yGrade: 'A',
    fallback: 'data table with category and value columns',
    library: 'recharts (React) or Chart.js (vanilla)',
  },
  line: {
    type: 'line',
    whenToUse: ['trends over time', 'continuous series', 'multiple series comparison over a shared x'],
    whenNotToUse: ['unordered categories', 'few discrete points (use bar)'],
    dataVolume: { svgMax: 1000, canvasMax: 100000, aggregateAbove: 100000 },
    a11yGrade: 'B',
    fallback: 'data table or sonified/described trend summary',
    library: 'recharts or uPlot (high-volume Canvas)',
  },
  scatter: {
    type: 'scatter',
    whenToUse: ['correlation between two quantitative variables', 'distribution / clustering'],
    whenNotToUse: ['categorical comparison', 'time series with one y per x (use line)'],
    dataVolume: { svgMax: 800, canvasMax: 200000, aggregateAbove: 200000 },
    a11yGrade: 'C',
    fallback: 'data table; describe correlation direction and strength in text',
    library: 'uPlot or regl-scatterplot for large N',
  },
  pie: {
    type: 'pie',
    whenToUse: ['single part-to-whole with <=5 slices'],
    whenNotToUse: ['more than 5 slices', 'comparing across multiple wholes (use stacked bar)', 'precise value comparison'],
    dataVolume: { svgMax: 12, canvasMax: 12, aggregateAbove: 12 },
    a11yGrade: 'C',
    fallback: 'data table with percentage column',
    library: 'recharts or Chart.js',
  },
  area: {
    type: 'area',
    whenToUse: ['cumulative totals over time', 'stacked composition over time'],
    whenNotToUse: ['comparing many overlapping series (occlusion)'],
    dataVolume: { svgMax: 1000, canvasMax: 100000, aggregateAbove: 100000 },
    a11yGrade: 'B',
    fallback: 'data table of values per period',
    library: 'recharts or uPlot',
  },
  heatmap: {
    type: 'heatmap',
    whenToUse: ['density across two dimensions', 'matrix / correlation grids'],
    whenNotToUse: ['precise single-value reads', 'colorblind-only encoding'],
    dataVolume: { svgMax: 2500, canvasMax: 500000, aggregateAbove: 500000 },
    a11yGrade: 'D',
    fallback: 'data table; never encode by color alone, add value labels',
    library: 'visx or Canvas-based custom',
  },
};

// Distinctive intent keywords per chart type. Deliberately excludes generic
// connectors ("over", "time" alone) so shared words do not skew the ranking.
const CHART_KEYWORDS: Record<string, string[]> = {
  bar: ['category', 'categories', 'compare', 'comparison', 'rank', 'ranking', 'count'],
  line: ['trend', 'trends', 'over time', 'time series', 'series', 'line'],
  scatter: ['correlation', 'correlate', 'distribution', 'cluster', 'relationship', 'scatter'],
  pie: ['proportion', 'percentage', 'share', 'part-to-whole', 'slice'],
  area: ['cumulative', 'stacked', 'composition', 'volume over'],
  heatmap: ['density', 'matrix', 'grid', 'intensity', 'heatmap'],
};

/** Recommend chart types for a free-text intent. Returns matrix entries ranked by match. */
export function recommendChart(intent: string): ChartTypeGuidance[] {
  const q = (intent || '').toLowerCase();
  const scored = Object.values(CHART_SELECTION_MATRIX).map((g) => {
    let score = 0;
    for (const kw of CHART_KEYWORDS[g.type] ?? []) {
      if (q.includes(kw)) score += 2;
    }
    // Light secondary signal from the primary when-to-use phrase.
    for (const word of (g.whenToUse[0] ?? '').split(/\W+/)) {
      if (word.length > 4 && q.includes(word)) score += 1;
    }
    return { g, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).map((s) => s.g);
  // Fall back to the most accessible defaults when nothing matched.
  return top.length ? top : [CHART_SELECTION_MATRIX.bar, CHART_SELECTION_MATRIX.line];
}

/** Detect that the markup actually renders a chart. */
function hasChart(lower: string): boolean {
  return /<svg\b|<canvas\b|class=["'][^"']*\bchart\b|recharts|chart\.js|role=["']img["'][^>]*chart/.test(lower);
}

export const CHART_SELECTION_RULES: DomainValidationRule[] = [
  {
    id: 'CHART_001',
    domain: 'data-visualization',
    name: 'Chart Type Selection Matrix',
    description: 'Advisory: choose the chart type from the when-to-use / when-NOT matrix. Bar for categories, line for trends, scatter for correlation, pie only for <=5 part-to-whole slices, heatmap for 2D density.',
    severity: 'low',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('CHART_001', 'data-visualization', 'markup');
      const lower = lowerHaystack(ctx);
      if (!hasChart(lower)) return notApplicable('CHART_001', 'data-visualization', 'chart');
      const declared = ctx.visualization?.chartType;
      const detail = Object.values(CHART_SELECTION_MATRIX)
        .map((g) => `${g.type}: use for ${g.whenToUse[0]}; avoid for ${g.whenNotToUse[0]}`)
        .join(' | ');
      return {
        ruleId: 'CHART_001',
        domain: 'data-visualization',
        passed: true,
        message: declared ? `Chart type "${declared}" - confirm against selection matrix` : 'Chart present - confirm type against selection matrix',
        details: detail,
        remediation: 'Match chart type to data shape: categories->bar, trend->line, correlation->scatter, <=5 part-to-whole->pie, 2D density->heatmap',
      };
    },
  },
  {
    id: 'CHART_002',
    domain: 'data-visualization',
    name: 'Data-Volume Rendering Strategy',
    description: 'Advisory: SVG charts stay crisp/inspectable to ~1k data points; switch to Canvas to ~100k; aggregate (bin, downsample, server-side rollup) above that. Rendering thousands of SVG nodes janks the main thread.',
    severity: 'low',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('CHART_002', 'data-visualization', 'markup');
      const lower = lowerHaystack(ctx);
      if (!hasChart(lower)) return notApplicable('CHART_002', 'data-visualization', 'chart');
      const usesSvg = /<svg\b|recharts|visx/.test(lower);
      return {
        ruleId: 'CHART_002',
        domain: 'data-visualization',
        passed: true,
        message: usesSvg ? 'SVG-based chart detected - verify data-point count stays under ~1k' : 'Confirm rendering strategy matches data volume',
        details: 'SVG <= ~1000 points; Canvas <= ~100000; aggregate/downsample above',
        remediation: 'Above ~1k points move to Canvas (uPlot, regl); above ~100k aggregate or downsample before rendering',
      };
    },
  },
  {
    id: 'CHART_003',
    domain: 'data-visualization',
    name: 'Mandatory Text or Table Fallback',
    description: 'Every chart must ship a non-visual fallback: an adjacent data table, aria-label/figcaption, or visually-hidden summary. Charts encoded only by pixels are inaccessible to screen readers.',
    severity: 'high',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('CHART_003', 'data-visualization', 'markup');
      const lower = lowerHaystack(ctx);
      if (!hasChart(lower)) return notApplicable('CHART_003', 'data-visualization', 'chart');
      const passed = /<table\b|<figcaption\b|aria-label=|aria-describedby=|sr-only|visually-hidden|role=["']table["']/.test(lower);
      return {
        ruleId: 'CHART_003',
        domain: 'data-visualization',
        passed,
        message: passed ? 'Chart provides a text/table fallback' : 'Chart has no text or table fallback for assistive tech',
        remediation: 'Add an adjacent <table>, a <figcaption>, or aria-label/aria-describedby summarizing the data',
      };
    },
  },
  {
    id: 'CHART_004',
    domain: 'data-visualization',
    name: 'Charting Library Recommendation',
    description: 'Advisory: prefer a maintained, accessible charting library over hand-rolled SVG. recharts/Chart.js for typical volumes, uPlot/regl for high-volume Canvas, visx for custom composition.',
    severity: 'low',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('CHART_004', 'data-visualization', 'markup');
      const lower = lowerHaystack(ctx);
      if (!hasChart(lower)) return notApplicable('CHART_004', 'data-visualization', 'chart');
      const usesKnownLib = /recharts|chart\.js|uplot|visx|d3|regl|echarts/.test(lower);
      return {
        ruleId: 'CHART_004',
        domain: 'data-visualization',
        passed: true,
        message: usesKnownLib ? 'Maintained charting library detected' : 'Consider a maintained charting library instead of hand-rolled chart code',
        details: 'recharts/Chart.js (typical) | uPlot/regl (high-volume Canvas) | visx (custom)',
        remediation: 'Adopt recharts or Chart.js for standard charts; uPlot or regl-scatterplot above ~1k points',
      };
    },
  },
];

// ===========================================================================
// Motion rules (domain: 'motion')
// ===========================================================================

function hasEphemeralUi(lower: string): boolean {
  return /:hover|\.tooltip|\.popover|\[popover\]|tooltip|popover|hover-card|highlight/.test(lower);
}

/** Extract distinct easing function tokens from a css fragment. */
function easingTokens(css: string): string[] {
  const found = new Set<string>();
  const re = /(cubic-bezier\([^)]*\)|ease-in-out|ease-out|ease-in|linear|steps\([^)]*\)|ease)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) found.add(m[1].toLowerCase().replace(/\s+/g, ''));
  return Array.from(found);
}

const PAIRED_ELEMENTS: Array<[string, RegExp, RegExp]> = [
  ['modal + overlay', /modal|dialog/, /overlay|backdrop|scrim/],
  ['tooltip + arrow', /tooltip/, /arrow|caret|pointer/],
  ['FAB + label', /fab|floating-action/, /label|fab-label|extended/],
];

export const TIER2_MOTION_RULES: DomainValidationRule[] = [
  {
    id: 'MOTION_HF_001',
    domain: 'motion',
    name: 'High-Frequency Invert Timing',
    description: 'Ephemeral UI (hover highlights, quick popovers, tooltips) should enter near-instantly (~0ms) and exit slowly (100-150ms) - the inverse of the normal slow-enter / fast-exit curve - so rapid pointer movement does not flicker.',
    severity: 'medium',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('MOTION_HF_001', 'motion', 'markup');
      const lower = lowerHaystack(ctx);
      if (!hasEphemeralUi(lower)) return notApplicable('MOTION_HF_001', 'motion', 'ephemeral UI (hover/popover/tooltip)');
      const css = cssText(ctx).toLowerCase();
      const hasTransition = /transition|animation/.test(css);
      return {
        ruleId: 'MOTION_HF_001',
        domain: 'motion',
        passed: hasTransition,
        message: hasTransition
          ? 'Ephemeral UI defines transitions - verify enter ~0ms, exit 100-150ms (inverted timing)'
          : 'Ephemeral UI (hover/popover/tooltip) has no transition timing defined',
        remediation: 'Invert timing for ephemeral UI: enter transition ~0ms, exit transition 100-150ms (opposite of the default slow-enter pattern)',
      };
    },
  },
  {
    id: 'MOTION_PAIR_001',
    domain: 'motion',
    name: 'Paired Elements Share Easing and Duration',
    description: 'Elements that animate as a unit (modal + overlay, tooltip + arrow, FAB + label) must use identical easing AND duration so they move as one object rather than desyncing.',
    severity: 'medium',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('MOTION_PAIR_001', 'motion', 'markup');
      const lower = lowerHaystack(ctx);
      const rules = ctx.cssRules ?? cssText(ctx).split('}').map((r) => r + '}');
      const activePairs = PAIRED_ELEMENTS.filter(([, a, b]) => a.test(lower) && b.test(lower));
      if (!activePairs.length) return notApplicable('MOTION_PAIR_001', 'motion', 'paired animated elements');
      const mismatches: string[] = [];
      for (const [name, a, b] of activePairs) {
        const aCss = rules.filter((r) => a.test(r.toLowerCase())).join(' ');
        const bCss = rules.filter((r) => b.test(r.toLowerCase())).join(' ');
        const aEasing = easingTokens(aCss);
        const bEasing = easingTokens(bCss);
        if (aEasing.length && bEasing.length) {
          const shared = aEasing.some((e) => bEasing.includes(e));
          if (!shared) mismatches.push(name);
        }
      }
      const passed = mismatches.length === 0;
      return {
        ruleId: 'MOTION_PAIR_001',
        domain: 'motion',
        passed,
        message: passed
          ? 'Paired animated elements share easing'
          : `Paired elements use mismatched easing: ${mismatches.join(', ')}`,
        remediation: 'Give paired elements (modal+overlay, tooltip+arrow, FAB+label) the same transition-timing-function and duration, ideally via a shared CSS variable',
      };
    },
  },
];

// ===========================================================================
// Character-substitution lint (domain: 'typography')
// NOTE: no emdash ban here - that is content-guard's job.
// ===========================================================================

export const CHAR_SUBSTITUTION_RULES: DomainValidationRule[] = [
  {
    id: 'CHARSUB_001',
    domain: 'typography',
    name: 'Ellipsis Character Not Three Periods',
    description: 'Use the single ellipsis glyph (…) rather than three periods so it kerns correctly and is read as one token by screen readers.',
    severity: 'low',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('CHARSUB_001', 'typography', 'markup');
      const text = visibleText(ctx);
      if (!text.trim()) return notApplicable('CHARSUB_001', 'typography', 'visible text');
      const passed = !/\.\.\./.test(text);
      return {
        ruleId: 'CHARSUB_001',
        domain: 'typography',
        passed,
        message: passed ? 'No three-period sequences in visible text' : 'Visible text uses three periods instead of an ellipsis character',
        remediation: 'Replace "..." with the ellipsis character … (or &hellip;)',
      };
    },
  },
  {
    id: 'CHARSUB_002',
    domain: 'typography',
    name: 'Curly Quotes Not Straight Quotes',
    description: 'Prose should use curly typographic quotes (“ ”) rather than straight quotes (") which read as code/measurement marks.',
    severity: 'low',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('CHARSUB_002', 'typography', 'markup');
      const text = visibleText(ctx);
      if (!text.trim()) return notApplicable('CHARSUB_002', 'typography', 'visible text');
      const passed = !/"/.test(text);
      return {
        ruleId: 'CHARSUB_002',
        domain: 'typography',
        passed,
        message: passed ? 'No straight double quotes in visible text' : 'Visible text uses straight double quotes instead of curly quotes',
        remediation: 'Use curly quotes “ ” (and ‘ ’ for apostrophes) in display copy',
      };
    },
  },
  {
    id: 'CHARSUB_003',
    domain: 'typography',
    name: 'Non-Breaking Space for Glued Units and Brand',
    description: 'Glue a value to its unit and multi-word brand names with &nbsp; so they never wrap across lines (e.g. 10&nbsp;MB, 5&nbsp;km).',
    severity: 'low',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('CHARSUB_003', 'typography', 'markup');
      const raw = rawHaystack(ctx);
      // A digit followed by a regular space then a unit token, with no nbsp present.
      const gluedRisk = /\d\s(kb|mb|gb|tb|km|kg|mm|cm|ms|px|hz|am|pm)\b/i.test(raw);
      const usesNbsp = /&nbsp;| /.test(raw);
      const passed = !gluedRisk || usesNbsp;
      return {
        ruleId: 'CHARSUB_003',
        domain: 'typography',
        passed,
        message: passed ? 'No unglued value+unit pairs detected' : 'Value and unit pairs use a regular space and may wrap',
        remediation: 'Insert &nbsp; between a value and its unit (10&nbsp;MB) and within multi-word brand names',
      };
    },
  },
  {
    id: 'CHARSUB_004',
    domain: 'typography',
    name: 'scroll-margin-top on Heading Anchors',
    description: 'Headings used as anchor targets (with an id) need scroll-margin-top so a sticky header does not cover them after an in-page jump.',
    severity: 'medium',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('CHARSUB_004', 'typography', 'markup');
      const lower = lowerHaystack(ctx);
      const hasHeadingAnchor = /<h[1-6][^>]*\bid=/.test(lower);
      if (!hasHeadingAnchor) return notApplicable('CHARSUB_004', 'typography', 'heading anchors (h1-h6 with id)');
      const passed = /scroll-margin(-top)?\s*:/.test(cssText(ctx).toLowerCase());
      return {
        ruleId: 'CHARSUB_004',
        domain: 'typography',
        passed,
        message: passed ? 'Heading anchors define scroll-margin-top' : 'Heading anchors lack scroll-margin-top (sticky header will overlap them)',
        remediation: 'Add :where(h1,h2,h3,h4,h5,h6)[id] { scroll-margin-top: var(--header-height); }',
      };
    },
  },
];

// ===========================================================================
// UX copywriting defaults (domain: 'ux-writing')
// Opinionated Vercel-flavored defaults - encoded as advisory (severity 'low').
// ===========================================================================

/** Pull text of the named element tags from raw markup. */
function elementTexts(ctx: DomainCheckContext, tag: string): string[] {
  const raw = rawHaystack(ctx);
  const out: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const inner = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (inner) out.push(inner);
  }
  return out;
}

export const COPYWRITING_RULES: DomainValidationRule[] = [
  {
    id: 'COPY_001',
    domain: 'ux-writing',
    name: 'Active Voice',
    description: 'Advisory: prefer active voice ("We saved your changes") over passive ("Your changes were saved by us"). Active voice is shorter and clearer in UI copy.',
    severity: 'low',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('COPY_001', 'ux-writing', 'markup');
      const text = visibleText(ctx);
      if (!text.trim()) return notApplicable('COPY_001', 'ux-writing', 'visible text');
      const passive = /\b(was|were|been|is|are|be)\b\s+\w+ed\b(\s+by\b)?/i.test(text);
      return {
        ruleId: 'COPY_001',
        domain: 'ux-writing',
        passed: !passive,
        message: passive ? 'Copy appears to use passive voice' : 'No obvious passive-voice constructions',
        remediation: 'Rewrite passive constructions in active voice (subject performs the action)',
      };
    },
  },
  {
    id: 'COPY_002',
    domain: 'ux-writing',
    name: 'Title Case for Buttons and Headings',
    description: 'Advisory: buttons and headings read better in Title Case rather than all-lowercase, per Vercel-style UI copy defaults.',
    severity: 'low',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('COPY_002', 'ux-writing', 'markup');
      const labels = [...elementTexts(ctx, 'button'), ...elementTexts(ctx, 'h1'), ...elementTexts(ctx, 'h2'), ...elementTexts(ctx, 'h3')];
      if (!labels.length) return notApplicable('COPY_002', 'ux-writing', 'button/heading text');
      const allLower = labels.filter((l) => /[a-z]/.test(l) && l === l.toLowerCase());
      const passed = allLower.length === 0;
      return {
        ruleId: 'COPY_002',
        domain: 'ux-writing',
        passed,
        message: passed ? 'Buttons and headings use Title Case' : `All-lowercase label(s): ${allLower.slice(0, 3).join(', ')}`,
        remediation: 'Capitalize the major words in button and heading labels (Title Case)',
      };
    },
  },
  {
    id: 'COPY_003',
    domain: 'ux-writing',
    name: 'Specific Button Labels',
    description: 'Advisory: button labels should name the action ("Save Settings", "Create Account") rather than generic verbs like "Submit", "OK", or "Click Here".',
    severity: 'low',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('COPY_003', 'ux-writing', 'markup');
      const labels = elementTexts(ctx, 'button');
      if (!labels.length) return notApplicable('COPY_003', 'ux-writing', 'button text');
      const generic = labels.filter((l) => /^(submit|ok|okay|click here|button|go|next|done|yes|no)$/i.test(l.trim()));
      const passed = generic.length === 0;
      return {
        ruleId: 'COPY_003',
        domain: 'ux-writing',
        passed,
        message: passed ? 'Button labels are specific' : `Generic button label(s): ${generic.slice(0, 3).join(', ')}`,
        remediation: 'Replace generic labels with the specific action: "Save Settings", "Create Account", "Download PDF"',
      };
    },
  },
  {
    id: 'COPY_004',
    domain: 'ux-writing',
    name: 'Error Messages Include the Fix',
    description: 'Advisory: an error message should tell the user how to recover, not just that something failed ("Email is invalid. Use name@example.com." not "Invalid").',
    severity: 'low',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('COPY_004', 'ux-writing', 'markup');
      const lower = lowerHaystack(ctx);
      if (!/class=["'][^"']*\berror\b|role=["']alert["']|aria-invalid/.test(lower)) {
        return notApplicable('COPY_004', 'ux-writing', 'error message');
      }
      const raw = rawHaystack(ctx);
      const errorTexts: string[] = [];
      const re = /<[^>]*(class=["'][^"']*\berror\b[^"']*["']|role=["']alert["'])[^>]*>([\s\S]*?)<\//gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(raw)) !== null) {
        const t = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (t) errorTexts.push(t);
      }
      if (!errorTexts.length) return notApplicable('COPY_004', 'ux-writing', 'error message text');
      const actionable = /\b(use|try|enter|must|should|check|add|remove|format|choose|select|provide)\b/i;
      const lacking = errorTexts.filter((t) => !actionable.test(t));
      const passed = lacking.length === 0;
      return {
        ruleId: 'COPY_004',
        domain: 'ux-writing',
        passed,
        message: passed ? 'Error messages describe a fix' : `Error message(s) lack a recovery hint: ${lacking.slice(0, 2).join(' | ')}`,
        remediation: 'State the problem and the fix: "Email is invalid. Use the format name@example.com."',
      };
    },
  },
  {
    id: 'COPY_005',
    domain: 'ux-writing',
    name: 'Numerals for Counts',
    description: 'Advisory: use numerals for counts and data ("3 items", "5 results") rather than spelling them out, which scans faster in UI.',
    severity: 'low',
    checkFunction: (ctx) => {
      if (!hasMarkup(ctx)) return notApplicable('COPY_005', 'ux-writing', 'markup');
      const text = visibleText(ctx);
      if (!text.trim()) return notApplicable('COPY_005', 'ux-writing', 'visible text');
      const spelled = /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+\w+/i.test(text);
      return {
        ruleId: 'COPY_005',
        domain: 'ux-writing',
        passed: !spelled,
        message: spelled ? 'Counts appear spelled out instead of numerals' : 'Counts use numerals',
        remediation: 'Use numerals for counts and data: "3 items", "5 results", "2 errors"',
      };
    },
  },
];

// ===========================================================================
// Combined export - the lead wires this single array into the validator.
// ===========================================================================

export const TIER2_VISUAL_COPY_RULES: DomainValidationRule[] = [
  ...DARK_MODE_RULES,
  ...CHART_SELECTION_RULES,
  ...TIER2_MOTION_RULES,
  ...CHAR_SUBSTITUTION_RULES,
  ...COPYWRITING_RULES,
];
