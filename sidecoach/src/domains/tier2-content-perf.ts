// source: vercel-labs/web-interface-guidelines (MIT)
//
// Sidecoach Tier-2 roll-in (T-0034): content-resilience, touch/mobile,
// image-perf, and perf-specifics rules.
//
// These are STATIC heuristic checks over the markup/style channels exposed on
// DomainCheckContext (ctx.html, ctx.cssRules, ctx.htmlElement, ctx.componentTree).
// Every rule degrades to N/A (passed: true) when the markup it inspects is
// absent, matching the graceful-degradation convention used by the existing
// forms and gesture rules in extended-domain-validator.ts. The lead wires these
// arrays into extended-domain-validator.ts - this module does not edit it.

import { DomainValidationRule, DomainCheckContext } from '../extended-domain-validator';

// Local haystack helper. The shared formsHaystack/gestureHaystack helpers in
// extended-domain-validator.ts are module-private (not exported), so we inline
// an equivalent here rather than edit that file. It assembles a single
// lowercase string from whatever channels are available - raw html, cssRules, a
// live htmlElement's outerHTML, and a serialized componentTree (which can carry
// inline-script / framework signals) - so each rule can scan one surface and
// tolerate any individual channel being missing.
function t2Haystack(ctx: DomainCheckContext): string {
  const parts: string[] = [];
  if (ctx.html) parts.push(ctx.html);
  if (ctx.cssRules?.length) parts.push(ctx.cssRules.join('\n'));
  if (ctx.htmlElement) {
    try { parts.push((ctx.htmlElement as any).outerHTML || ''); } catch { /* no DOM */ }
  }
  if (ctx.componentTree) {
    try { parts.push(JSON.stringify(ctx.componentTree)); } catch { /* circular */ }
  }
  return parts.join('\n').toLowerCase();
}

// ---------------------------------------------------------------------------
// content-resilience (domain: 'polish')
// ---------------------------------------------------------------------------

export const TIER2_CONTENT_RESILIENCE_RULES: DomainValidationRule[] = [
  {
    id: 'CONTENT_001',
    domain: 'polish',
    name: 'Flex Children Can Truncate (min-width:0)',
    description: 'Flex children that truncate text need min-width:0, or the ellipsis never appears',
    severity: 'high',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const hasFlex = /display:\s*flex|display:\s*inline-flex|\bflex\b/.test(h);
      const hasTruncation = /text-overflow:\s*ellipsis|\btruncate\b|line-clamp|-webkit-line-clamp/.test(h);
      const relevant = hasFlex && hasTruncation;
      if (!relevant) {
        return { ruleId: 'CONTENT_001', domain: 'polish', passed: true, message: 'N/A - no truncating flex child detected' };
      }
      const passed = /min-width:\s*0|min-w-0/.test(h);
      return {
        ruleId: 'CONTENT_001',
        domain: 'polish',
        passed,
        message: passed ? 'Truncating flex child sets min-width:0' : 'Truncating flex child is missing min-width:0',
        remediation: 'Add min-width: 0 (or min-w-0) to the flex child so text-overflow:ellipsis can take effect inside the flex row'
      };
    }
  },
  {
    id: 'CONTENT_002',
    domain: 'polish',
    name: 'Long Text Wraps or Clamps',
    description: 'Unbounded text uses line-clamp or break-words so long strings do not blow out the layout',
    severity: 'medium',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const relevant = /text-overflow:\s*ellipsis|\btruncate\b|line-clamp|\bdescription\b|\btitle\b|\busername\b|\bemail\b/.test(h);
      if (!relevant) {
        return { ruleId: 'CONTENT_002', domain: 'polish', passed: true, message: 'N/A - no overflow-prone text container detected' };
      }
      const passed = /overflow-wrap|word-break|break-words|line-clamp|-webkit-line-clamp|text-wrap/.test(h);
      return {
        ruleId: 'CONTENT_002',
        domain: 'polish',
        passed,
        message: passed ? 'Long text has a wrap/clamp strategy' : 'Long text has no wrap or clamp strategy',
        remediation: 'Apply overflow-wrap: break-word / word-break, or -webkit-line-clamp, so long unbroken strings cannot overflow their container'
      };
    }
  },
  {
    id: 'CONTENT_003',
    domain: 'polish',
    name: 'Designed Empty/Error States',
    description: 'Data-driven collections ship designed empty, sparse, and error states',
    severity: 'medium',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const relevant = /\.map\(|\bv-for\b|\*ngfor|role="list"|role="feed"|role="grid"|<ul\b|<ol\b|<table\b/.test(h);
      if (!relevant) {
        return { ruleId: 'CONTENT_003', domain: 'polish', passed: true, message: 'N/A - no data-driven collection detected' };
      }
      const passed = /empty-state|empty state|no results|no items|nothing here|isempty|is-empty|length\s*===?\s*0|\.length\b[^]*\?|error-state|error state|errorstate/.test(h);
      return {
        ruleId: 'CONTENT_003',
        domain: 'polish',
        passed,
        message: passed ? 'Collection has empty/error state handling' : 'Collection has no designed empty/error state',
        remediation: 'Design explicit empty, sparse, dense, and error states for every data-driven collection rather than rendering a bare blank region'
      };
    }
  },
  {
    id: 'CONTENT_004',
    domain: 'polish',
    name: 'Stable Skeletons Mirror Final Content',
    description: 'Loading skeletons carry explicit dimensions so they do not shift layout when content arrives',
    severity: 'low',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const relevant = /\bskeleton\b|\bshimmer\b|animate-pulse|aria-busy/.test(h);
      if (!relevant) {
        return { ruleId: 'CONTENT_004', domain: 'polish', passed: true, message: 'N/A - no loading skeleton detected' };
      }
      const passed = /aspect-ratio|width:|height:|min-h|min-height|\bh-\d|\bw-\d/.test(h);
      return {
        ruleId: 'CONTENT_004',
        domain: 'polish',
        passed,
        message: passed ? 'Skeleton declares explicit dimensions' : 'Skeleton lacks explicit dimensions and will shift layout',
        remediation: 'Give skeletons fixed width/height or aspect-ratio that mirror the final content so swapping in real data causes no layout shift'
      };
    }
  }
];

// ---------------------------------------------------------------------------
// touch / mobile (domain: 'responsive')
// ---------------------------------------------------------------------------

function hasTappableControl(h: string): boolean {
  return /<button\b|role="button"|<a\b|onclick|cursor:\s*pointer/.test(h);
}

export const TIER2_TOUCH_RULES: DomainValidationRule[] = [
  {
    id: 'TOUCH_001',
    domain: 'responsive',
    name: 'touch-action: manipulation on Controls',
    description: 'Tappable controls set touch-action:manipulation to drop the 300ms mobile tap delay',
    severity: 'medium',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      if (!hasTappableControl(h)) {
        return { ruleId: 'TOUCH_001', domain: 'responsive', passed: true, message: 'N/A - no tappable control detected' };
      }
      const passed = /touch-action:\s*manipulation/.test(h);
      return {
        ruleId: 'TOUCH_001',
        domain: 'responsive',
        passed,
        message: passed ? 'Controls declare touch-action: manipulation' : 'Tappable controls do not declare touch-action: manipulation',
        remediation: 'Add touch-action: manipulation to tappable controls to remove the 300ms double-tap-zoom delay on touch devices'
      };
    }
  },
  {
    id: 'TOUCH_002',
    domain: 'responsive',
    name: '-webkit-tap-highlight-color Set',
    description: 'Tappable controls set -webkit-tap-highlight-color to avoid the default grey iOS flash',
    severity: 'low',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      if (!hasTappableControl(h)) {
        return { ruleId: 'TOUCH_002', domain: 'responsive', passed: true, message: 'N/A - no tappable control detected' };
      }
      const passed = /-webkit-tap-highlight-color/.test(h);
      return {
        ruleId: 'TOUCH_002',
        domain: 'responsive',
        passed,
        message: passed ? '-webkit-tap-highlight-color is set' : '-webkit-tap-highlight-color is not set on tappable controls',
        remediation: 'Set -webkit-tap-highlight-color (e.g. transparent) so iOS Safari does not paint its default grey tap flash'
      };
    }
  },
  {
    id: 'TOUCH_003',
    domain: 'responsive',
    name: 'overscroll-behavior: contain on Overlays',
    description: 'Modals and drawers set overscroll-behavior:contain so scrolling them does not scroll the page behind',
    severity: 'medium',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const relevant = /\bmodal\b|\bdrawer\b|\bdialog\b|role="dialog"|\bsheet\b|\boverlay\b/.test(h);
      if (!relevant) {
        return { ruleId: 'TOUCH_003', domain: 'responsive', passed: true, message: 'N/A - no modal/drawer/overlay detected' };
      }
      const passed = /overscroll-behavior/.test(h);
      return {
        ruleId: 'TOUCH_003',
        domain: 'responsive',
        passed,
        message: passed ? 'Overlay declares overscroll-behavior' : 'Modal/drawer does not declare overscroll-behavior: contain',
        remediation: 'Add overscroll-behavior: contain to scrollable modals/drawers so reaching their scroll boundary does not chain-scroll the page underneath'
      };
    }
  },
  {
    id: 'TOUCH_004',
    domain: 'responsive',
    name: 'Input Font Size >= 16px (no iOS auto-zoom)',
    description: 'Form inputs use font-size of at least 16px so iOS Safari does not auto-zoom on focus',
    severity: 'high',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const relevant = /<input\b|<textarea\b|<select\b/.test(h);
      if (!relevant) {
        return { ruleId: 'TOUCH_004', domain: 'responsive', passed: true, message: 'N/A - no form input detected' };
      }
      // Best-effort static signal: any font-size declared under 16px risks the
      // iOS focus-zoom when it lands on an input. Flag if such a value exists.
      const sizes = Array.from(h.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)).map(m => parseFloat(m[1]));
      const hasSubSixteen = sizes.some(px => px < 16);
      const passed = !hasSubSixteen;
      return {
        ruleId: 'TOUCH_004',
        domain: 'responsive',
        passed,
        message: passed
          ? 'No sub-16px font-size that would trigger iOS input auto-zoom'
          : 'A font-size below 16px is present and may trigger iOS auto-zoom on input focus',
        remediation: 'Ensure form inputs render at font-size >= 16px (iOS Safari auto-zooms when focusing any input smaller than 16px)'
      };
    }
  }
];

// ---------------------------------------------------------------------------
// image perf (domain: 'performance')
// ---------------------------------------------------------------------------

export const TIER2_IMAGE_PERF_RULES: DomainValidationRule[] = [
  {
    id: 'IMGPERF_001',
    domain: 'performance',
    name: 'Images Have Explicit Dimensions',
    description: 'Every <img> declares width and height (or aspect-ratio) to reserve space and avoid CLS',
    severity: 'high',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const imgs = h.match(/<img\b[^>]*>/g);
      if (!imgs || imgs.length === 0) {
        return { ruleId: 'IMGPERF_001', domain: 'performance', passed: true, message: 'N/A - no <img> elements detected' };
      }
      const missing = imgs.filter(tag => {
        const hasW = /\bwidth\s*=/.test(tag);
        const hasH = /\bheight\s*=/.test(tag);
        const hasAspect = /aspect-ratio/.test(tag);
        return !((hasW && hasH) || hasAspect);
      });
      const passed = missing.length === 0;
      return {
        ruleId: 'IMGPERF_001',
        domain: 'performance',
        passed,
        message: passed
          ? `All ${imgs.length} <img> elements declare dimensions`
          : `${missing.length}/${imgs.length} <img> elements lack explicit width+height`,
        remediation: 'Add explicit width and height attributes (or an aspect-ratio) to every <img> so the browser can reserve layout space and avoid cumulative layout shift'
      };
    }
  },
  {
    id: 'IMGPERF_002',
    domain: 'performance',
    name: 'Below-the-Fold Images Lazy Load',
    description: 'At least one image uses loading="lazy" to defer offscreen image fetches',
    severity: 'medium',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const imgs = h.match(/<img\b[^>]*>/g);
      if (!imgs || imgs.length === 0) {
        return { ruleId: 'IMGPERF_002', domain: 'performance', passed: true, message: 'N/A - no <img> elements detected' };
      }
      const passed = /loading\s*=\s*["']?lazy/.test(h);
      return {
        ruleId: 'IMGPERF_002',
        domain: 'performance',
        passed,
        message: passed ? 'loading="lazy" is used on at least one image' : 'No image uses loading="lazy"',
        remediation: 'Add loading="lazy" to below-the-fold images so the browser defers their fetch until they approach the viewport'
      };
    }
  },
  {
    id: 'IMGPERF_003',
    domain: 'performance',
    name: 'LCP Image Gets fetchpriority="high"',
    description: 'The above-the-fold/LCP image is hinted with fetchpriority="high"',
    severity: 'medium',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const imgs = h.match(/<img\b[^>]*>/g);
      if (!imgs || imgs.length === 0) {
        return { ruleId: 'IMGPERF_003', domain: 'performance', passed: true, message: 'N/A - no <img> elements detected' };
      }
      const passed = /fetchpriority\s*=\s*["']?high/.test(h);
      return {
        ruleId: 'IMGPERF_003',
        domain: 'performance',
        passed,
        message: passed ? 'An image declares fetchpriority="high"' : 'No image declares fetchpriority="high" for the LCP candidate',
        remediation: 'Add fetchpriority="high" to the LCP / above-the-fold hero image so the browser prioritizes its download'
      };
    }
  }
];

// ---------------------------------------------------------------------------
// perf specifics (domain: 'performance')
// ---------------------------------------------------------------------------

export const TIER2_PERF_SPECIFICS_RULES: DomainValidationRule[] = [
  {
    id: 'PERFX_001',
    domain: 'performance',
    name: 'Idempotency Key on Mutating Requests',
    description: 'POST/PUT/PATCH requests send an idempotency key so retries do not double-apply',
    severity: 'medium',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const relevant = /method:\s*["']?(post|put|patch)|\.post\(|\.put\(|\.patch\(/.test(h);
      if (!relevant) {
        return { ruleId: 'PERFX_001', domain: 'performance', passed: true, message: 'N/A - no mutating request detected' };
      }
      const passed = /idempotency-key|idempotencykey/.test(h);
      return {
        ruleId: 'PERFX_001',
        domain: 'performance',
        passed,
        message: passed ? 'Mutating requests carry an idempotency key' : 'Mutating request has no idempotency key',
        remediation: 'Send an Idempotency-Key header on POST/PUT/PATCH requests so a retried mutation cannot be applied twice'
      };
    }
  },
  {
    id: 'PERFX_002',
    domain: 'performance',
    name: 'Latency Budget Noted',
    description: 'Data-fetching code documents a latency budget so slow paths are caught in review',
    severity: 'low',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const relevant = /\bfetch\(|\baxios\b|usequery|xmlhttprequest|\.get\(|\.post\(/.test(h);
      if (!relevant) {
        return { ruleId: 'PERFX_002', domain: 'performance', passed: true, message: 'N/A - no data-fetching code detected' };
      }
      const passed = /latency-budget|latency budget/.test(h);
      return {
        ruleId: 'PERFX_002',
        domain: 'performance',
        passed,
        message: passed ? 'A latency budget is noted near fetching code' : 'No latency budget noted for data-fetching code',
        remediation: 'Document a latency budget (e.g. // latency-budget: 200ms) next to data-fetching code so regressions are visible in review'
      };
    }
  },
  {
    id: 'PERFX_003',
    domain: 'performance',
    name: 'content-visibility:auto on Long Sections',
    description: 'Long offscreen sections use content-visibility:auto to skip rendering work until needed',
    severity: 'low',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const relevant = /<section\b|<article\b|role="feed"/.test(h);
      if (!relevant) {
        return { ruleId: 'PERFX_003', domain: 'performance', passed: true, message: 'N/A - no long section/article detected' };
      }
      const passed = /content-visibility:\s*auto/.test(h);
      return {
        ruleId: 'PERFX_003',
        domain: 'performance',
        passed,
        message: passed ? 'Long sections use content-visibility: auto' : 'Long offscreen sections do not use content-visibility: auto',
        remediation: 'Apply content-visibility: auto (with contain-intrinsic-size) to long offscreen sections so the browser can skip their layout/paint until they scroll near the viewport'
      };
    }
  },
  {
    id: 'PERFX_004',
    domain: 'performance',
    name: 'No Layout Reads in Render Path',
    description: 'Render paths avoid synchronous layout reads (getBoundingClientRect/offsetHeight) that force reflow',
    severity: 'medium',
    checkFunction: (ctx) => {
      const h = t2Haystack(ctx);
      const layoutRead = /getboundingclientrect|offsetheight|offsetwidth|offsettop|offsetleft|scrollheight|scrollwidth|clientheight|clientwidth/.test(h);
      // Absent markup => N/A pass; layout reads present => fail (forced reflow risk).
      if (!layoutRead) {
        return { ruleId: 'PERFX_004', domain: 'performance', passed: true, message: 'N/A - no synchronous layout read detected' };
      }
      return {
        ruleId: 'PERFX_004',
        domain: 'performance',
        passed: false,
        message: 'A synchronous layout read (getBoundingClientRect/offset*/scroll*) is present and may force reflow in a render path',
        remediation: 'Move layout reads (getBoundingClientRect, offsetHeight, etc.) out of render/effect paths or batch them with requestAnimationFrame to avoid layout thrash'
      };
    }
  }
];

// Convenience aggregate of every Tier-2 content/perf rule in this module.
export const TIER2_CONTENT_PERF_RULES: DomainValidationRule[] = [
  ...TIER2_CONTENT_RESILIENCE_RULES,
  ...TIER2_TOUCH_RULES,
  ...TIER2_IMAGE_PERF_RULES,
  ...TIER2_PERF_SPECIFICS_RULES
];
