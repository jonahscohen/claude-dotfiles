// T-0013: scoring layer for the benchmark harness.
//
// Two responsibilities:
//   1. Build a DomainCheckContext from a fixture directory (reads PRODUCT.md +
//      DESIGN.md, parses tokens, collects CSS rule strings).
//   2. Run the three validators (Polish Standard, Extended Domain, Taste) on
//      that context and produce the row-level summary structures used by
//      types.ts / report.ts.
//
// The runner calls scoreFixtureFlow() once per (fixture, flow) pair. The actual
// flow handler is invoked separately by run-all.ts so we can capture tier,
// retry state, latency, etc.; the validators are called HERE so we have the
// granular per-rule numbers the schema requires (the handler's
// result.validationResults only exposes pass/fail booleans, not pass rates).

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

import { PolishStandardValidator } from '../../src/polish-standard-validator';
import {
  ExtendedDomainValidator,
  DomainCheckContext,
} from '../../src/extended-domain-validator';
import { validateTaste } from '../../src/taste-validator';
import type {
  PolishStandardSummary,
  ExtendedDomainSummary,
  TasteSummary,
} from './types';

// --------------------------------------------------------------------------
// Fixture loading
// --------------------------------------------------------------------------

export interface LoadedFixture {
  name: string;
  category: string;
  dir: string;
  productMd: string;
  designMd: string;
  designTokens: Record<string, any>;
  cssRules: string[];
  htmlContent: string;
  cssContent: string;
}

/**
 * Load a fixture directory. Required files:
 *   - PRODUCT.md
 *   - DESIGN.md
 * Optional files:
 *   - fixture.css (any CSS - extracted into cssRules + cssContent)
 *   - fixture.html (HTML - used for taste validation)
 *   - meta.json (optional; sets `category` taxonomy bucket)
 */
export function loadFixture(fixtureDir: string): LoadedFixture {
  const name = path.basename(fixtureDir);
  const productPath = path.join(fixtureDir, 'PRODUCT.md');
  const designPath = path.join(fixtureDir, 'DESIGN.md');
  if (!fs.existsSync(productPath)) {
    throw new Error(`fixture ${name}: missing PRODUCT.md`);
  }
  if (!fs.existsSync(designPath)) {
    throw new Error(`fixture ${name}: missing DESIGN.md`);
  }
  const productMd = fs.readFileSync(productPath, 'utf-8');
  const designMd = fs.readFileSync(designPath, 'utf-8');

  // Parse DESIGN.md YAML frontmatter (Google design.md spec).
  const designTokens = parseDesignTokens(designMd);

  // Read fixture.css if present; otherwise look for any .css file in the dir.
  let cssContent = '';
  const cssCandidates = [path.join(fixtureDir, 'fixture.css')];
  // Allow multiple .css files.
  for (const entry of fs.readdirSync(fixtureDir)) {
    if (entry.endsWith('.css') && !cssCandidates.includes(path.join(fixtureDir, entry))) {
      cssCandidates.push(path.join(fixtureDir, entry));
    }
  }
  for (const candidate of cssCandidates) {
    if (fs.existsSync(candidate)) {
      cssContent += '\n' + fs.readFileSync(candidate, 'utf-8');
    }
  }
  const cssRules = splitCssIntoRules(cssContent);

  // Optional HTML for taste validation.
  let htmlContent = '';
  const htmlPath = path.join(fixtureDir, 'fixture.html');
  if (fs.existsSync(htmlPath)) {
    htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  }

  // Taxonomy bucket - read meta.json or fall back to a name-based heuristic.
  let category = 'unknown';
  const metaPath = path.join(fixtureDir, 'meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      if (typeof meta.category === 'string') category = meta.category;
    } catch {
      /* ignore malformed meta */
    }
  }

  return {
    name,
    category,
    dir: fixtureDir,
    productMd,
    designMd,
    designTokens,
    cssRules,
    htmlContent,
    cssContent,
  };
}

/** Parse the YAML frontmatter from a DESIGN.md file. */
function parseDesignTokens(designMd: string): Record<string, any> {
  // Frontmatter: starts with '---' on first line, ends with another '---'.
  const lines = designMd.split('\n');
  if (lines[0]?.trim() !== '---') return {};
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIdx = i;
      break;
    }
  }
  if (endIdx < 0) return {};
  const yamlBody = lines.slice(1, endIdx).join('\n');
  try {
    const parsed = yaml.load(yamlBody);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, any>;
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Split CSS content into per-rule strings. Mirrors the approach in
 * flow-handler-tactical-polish.collectProjectCssRules() so the validators see
 * the same shape they would on a live project run.
 */
function splitCssIntoRules(css: string): string[] {
  if (!css.trim()) return [];
  return css
    .split('}')
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => b + ' }');
}

/** Discover all fixture directories beneath the fixtures root. */
export function discoverFixtures(fixturesRoot: string): string[] {
  if (!fs.existsSync(fixturesRoot)) return [];
  const entries = fs.readdirSync(fixturesRoot, { withFileTypes: true });
  const dirs: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const productMd = path.join(fixturesRoot, entry.name, 'PRODUCT.md');
    if (fs.existsSync(productMd)) {
      dirs.push(path.join(fixturesRoot, entry.name));
    }
  }
  return dirs.sort();
}

// --------------------------------------------------------------------------
// Validator scoring
// --------------------------------------------------------------------------

/** Run Polish Standard validator on a fixture and produce the summary row. */
export function scorePolishStandard(fixture: LoadedFixture): PolishStandardSummary {
  const ctx = {
    designTokens: fixture.designTokens,
    cssRules: fixture.cssRules,
  };
  const report = PolishStandardValidator.validateAll(ctx as any);
  return {
    passed: report.passed,
    failed: report.violations,
    passRate: report.totalRules > 0 ? report.passed / report.totalRules : 0,
    criticalViolations: report.criticalViolations,
  };
}

/** Run Extended Domain validator on a fixture and produce the summary row. */
export function scoreExtendedDomain(fixture: LoadedFixture): ExtendedDomainSummary {
  const ctx: DomainCheckContext = {
    designTokens: fixture.designTokens,
    cssRules: fixture.cssRules,
  };
  const report = ExtendedDomainValidator.validateAll(ctx);
  if (report.status === 'skipped') {
    return { passed: 0, failed: 0, passRate: 0 };
  }
  const byDomain: Record<string, { passed: number; failed: number; passRate: number }> = {};
  for (const [domain, rateStr] of Object.entries(report.passRateByDomain || {})) {
    const rate = parseFloat(String(rateStr).replace('%', '')) / 100;
    const failed = (report.violationsByDomain || {})[domain] || 0;
    // We don't have per-domain passed count directly; derive from results.
    const domainResults = report.results.filter((r: any) => r.domain === domain);
    const passed = domainResults.filter((r: any) => r.passed).length;
    byDomain[domain] = {
      passed,
      failed,
      passRate: Number.isFinite(rate) ? rate : 0,
    };
  }
  return {
    passed: report.passed,
    failed: report.violations,
    passRate: report.totalRules > 0 ? report.passed / report.totalRules : 0,
    byDomain,
  };
}

/** Run taste validator on a fixture and produce the summary row. */
export function scoreTaste(fixture: LoadedFixture): TasteSummary {
  // If no HTML content, taste validator has nothing to check - return empty.
  if (!fixture.htmlContent && !fixture.cssContent) {
    return { violations: [] };
  }
  const violations = validateTaste(
    fixture.htmlContent || '<html><body></body></html>',
    fixture.cssContent,
  );
  return {
    violations: violations.map((v) => ({
      ruleId: v.ruleId,
      severity: v.severity,
      category: v.category,
      message: v.message,
    })),
  };
}

// --------------------------------------------------------------------------
// Synthetic token-count estimator (v1 - handlers don't call LLMs yet)
// --------------------------------------------------------------------------

/**
 * Estimate input/output tokens for a benchmark invocation. Used until the flow
 * handlers actually call the Anthropic SDK and produce real token counts.
 *
 * Formula:
 *   inputTokens  = ceil((PRODUCT.md + DESIGN.md + cssContent) bytes / 4)
 *   outputTokens = ceil(inputTokens / 3)   // empirical 3:1 in:out ratio
 *
 * This is intentionally deterministic so the same fixture always produces the
 * same token counts (no noise in compare-mode). When real LLM calls land, the
 * runner will sum the live ledger from trackCost() instead of synthesizing.
 */
export function estimateSyntheticTokens(fixture: LoadedFixture): {
  inputTokens: number;
  outputTokens: number;
} {
  const inputBytes =
    Buffer.byteLength(fixture.productMd, 'utf-8') +
    Buffer.byteLength(fixture.designMd, 'utf-8') +
    Buffer.byteLength(fixture.cssContent, 'utf-8');
  const inputTokens = Math.ceil(inputBytes / 4);
  const outputTokens = Math.ceil(inputTokens / 3);
  return { inputTokens, outputTokens };
}
