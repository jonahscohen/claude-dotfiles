/**
 * buildScopeLevels - assemble the Target/scope rail levels for an element.
 *
 * Ported 1:1 from Retune's real implementation in overlay/Retune.tsx
 * (buildScopeLevels + humanizeScopeLabel/humanizeSegment + buildCompoundFingerprint
 * + buildParentScopeLevel + appendAncestorLevels), reconciled against that source
 * during the section-assembly task. The ONLY deviation is the manifest/token layer
 * (getManifestClassInfo + class_map labels) which is DEFERRED this phase, exactly
 * like the rest of the variable layer - manifest is treated as null, so the
 * `meaningful` filter is verdict==="semantic" only and labels are humanized class
 * names (never manifest prop values).
 *
 * Real algorithm (vs the earlier spec-reconstruction, which diverged):
 *  - only SEMANTIC-verdict candidates become class levels (utility/ambiguous are
 *    dropped); when there are none, fall back to a compound "All instances"
 *    fingerprint, then a parent-scoped ".parent tag" level, then ancestors only.
 *  - class levels ACCUMULATE into a compound selector (.a, .a.b, .a.b.c ...),
 *    narrowing scope each step - NOT standalone single-class selectors.
 *  - labels are HUMANIZED (humanizeScopeLabel: BEM modifier/element, contextual
 *    prefix stripping, abbreviation expansion) - NOT raw selector strings.
 *  - ancestor scopes are inserted (filtered) between class scopes and the
 *    instance level; the instance level label is "This instance".
 *
 * Pure logic except the CSSOM reads inside getSelectorCandidates/getAncestorScopes
 * + the querySelectorAll match counts (matches Retune).
 */

import {
  getSelectorCandidates,
  getAncestorScopes,
  isHashedClass,
  scoreNamePattern,
  type SelectorCandidate,
  type AncestorScope,
} from "../../../selector/identifier.js";
import type { ScopeLevel } from "./section-props.js";

/** Abbreviation lookup for common CSS class name stems (Retune verbatim). */
const CLASS_ABBREVIATIONS: Record<string, string> = {
  btn: "Button", nav: "Navigation", col: "Column", img: "Image",
  sm: "Small", md: "Medium", lg: "Large", xs: "Extra Small", xl: "Extra Large",
  hdr: "Header", ftr: "Footer", cta: "Call to Action", desc: "Description",
  msg: "Message", info: "Information", bg: "Background", txt: "Text",
  pg: "Page", sec: "Section", el: "Element", opt: "Option",
  val: "Value", err: "Error", warn: "Warning", num: "Number",
  prev: "Previous", curr: "Current", temp: "Temporary",
};

/** Humanize a single class name segment: split on hyphens, title-case, expand abbreviations. */
function humanizeSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) => CLASS_ABBREVIATIONS[word] || (word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

/** Humanize a scope level label.
 *  BEM modifiers (--): strip block prefix, show modifier only.
 *  BEM elements (__): strip block prefix, show element only.
 *  Contextual: strip previous level's class prefix if it matches.
 *  Default: humanize full class name. */
function humanizeScopeLabel(className: string, previousClassName?: string): string {
  // BEM modifier: "message-row--unread" -> "Unread"
  if (className.includes("--")) {
    const modifier = className.split("--").pop()!;
    return humanizeSegment(modifier);
  }
  // BEM element: "sidebar__item" -> "Sidebar Item"
  if (className.includes("__")) {
    const element = className.split("__").pop()!;
    return humanizeSegment(element);
  }
  // Contextual prefix stripping: "btn-primary" after "btn" -> "Primary"
  if (previousClassName && className.startsWith(previousClassName + "-")) {
    const suffix = className.slice(previousClassName.length + 1);
    return humanizeSegment(suffix);
  }
  // Default: humanize full name
  return humanizeSegment(className);
}

/** Strategy 1: Build a compound selector from ALL non-hashed classes on the element.
 *  If it matches > 1, these are "all instances" of this element type. */
function buildCompoundFingerprint(element: Element): ScopeLevel | null {
  const el = element as HTMLElement;
  if (!el.classList || el.classList.length === 0) return null;

  const classes: string[] = [];
  for (const cls of el.classList) {
    if (!isHashedClass(cls)) classes.push(cls);
  }
  if (classes.length === 0) return null;

  const selector = classes.sort().map((c) => `.${CSS.escape(c)}`).join("");
  let count: number;
  try { count = document.querySelectorAll(selector).length; } catch { count = 0; }
  if (count <= 1) return null; // same as "This instance", skip

  return { label: "All instances", selector, count, kind: "class" };
}

/** Strategy 2: Walk up the DOM tree for a semantic ancestor and build
 *  a parent-scoped selector like ".parent tag" for classless elements. */
function buildParentScopeLevel(element: Element): ScopeLevel | null {
  const tag = element.tagName.toLowerCase();
  let current = element.parentElement;

  while (current && current !== document.body) {
    for (const cls of current.classList) {
      if (isHashedClass(cls)) continue;
      const { score } = scoreNamePattern(cls);
      if (score >= 0.65) continue; // skip utility classes

      const selector = `.${CSS.escape(cls)} ${tag}`;
      let count: number;
      try { count = document.querySelectorAll(selector).length; } catch { count = 0; }
      if (count > 1 && count <= 20) {
        return { label: "All instances", selector, count, kind: "ancestor" };
      }
    }
    current = current.parentElement;
  }

  return null;
}

/** Append ancestor scope levels, filtering out those redundant with existing levels. */
function appendAncestorLevels(levels: ScopeLevel[], ancestorScopes: AncestorScope[]): void {
  // Narrowest class-level count for filtering.
  const narrowestClassCount = levels.length > 0 ? levels[levels.length - 1].count : Infinity;

  for (const scope of ancestorScopes) {
    // Skip if same/broader count than narrowest class scope (redundant).
    if (scope.count >= narrowestClassCount) continue;
    // Skip if count is 1 (same as "This instance").
    if (scope.count <= 1) continue;
    // Skip if a level with same count + selector already exists.
    if (levels.some((l) => l.count === scope.count && l.selector === scope.fullSelector)) continue;

    levels.push({
      label: scope.label,
      selector: scope.fullSelector,
      count: scope.count,
      kind: "ancestor",
    });
  }
}

/** Core algorithm - Retune.tsx buildScopeLevels, manifest layer dropped (deferred). */
function buildScopeLevelsFrom(
  candidates: SelectorCandidate[],
  element: Element,
  ancestorScopes: AncestorScope[],
): ScopeLevel[] {
  // Manifest deferred -> only semantic-verdict candidates are meaningful.
  const meaningful = candidates.filter((c) => c.verdict === "semantic");

  if (meaningful.length === 0) {
    // Strategy 1: compound class fingerprint (utility-class elements).
    const fingerprint = buildCompoundFingerprint(element);
    if (fingerprint) {
      const levels: ScopeLevel[] = [fingerprint];
      appendAncestorLevels(levels, ancestorScopes);
      levels.push({ label: "This instance", selector: null, count: 1, kind: "element" });
      return levels;
    }
    // Strategy 2: parent-scoped tag selector (classless elements).
    const parentLevel = buildParentScopeLevel(element);
    if (parentLevel) {
      const levels: ScopeLevel[] = [parentLevel];
      appendAncestorLevels(levels, ancestorScopes);
      levels.push({ label: "This instance", selector: null, count: 1, kind: "element" });
      return levels;
    }
    if (ancestorScopes.length > 0) {
      const levels: ScopeLevel[] = [];
      appendAncestorLevels(levels, ancestorScopes);
      levels.push({ label: "This instance", selector: null, count: 1, kind: "element" });
      return levels;
    }
    return [{ label: "This instance", selector: null, count: 1, kind: "element" }];
  }

  const levels: ScopeLevel[] = [];
  const parts: string[] = [];
  for (const candidate of meaningful) {
    const className = candidate.selector.replace(/^\./, "");
    const prevClassName = parts.length > 0 ? parts[parts.length - 1] : undefined;
    parts.push(className);
    const compound = parts.slice().sort().map((c) => `.${CSS.escape(c)}`).join("");
    let count: number;
    try { count = document.querySelectorAll(compound).length; } catch { count = 0; }
    const label = humanizeScopeLabel(className, prevClassName);
    levels.push({ label, selector: compound, count, kind: "class" });
  }
  appendAncestorLevels(levels, ancestorScopes);
  levels.push({ label: "This instance", selector: null, count: 1, kind: "element" });
  return levels;
}

/**
 * Build the scope rail levels for an element (parent entry point). Computes the
 * selector candidates + ancestor scopes from the ported selector engine, then
 * runs Retune's buildScopeLevels algorithm.
 */
export function buildScopeLevels(element: Element): ScopeLevel[] {
  const candidates = getSelectorCandidates(element);
  const ancestorScopes = getAncestorScopes(element);
  return buildScopeLevelsFrom(candidates, element, ancestorScopes);
}

/**
 * Default active level: `levels.length - 2` (narrowest class/ancestor level just
 * above "This instance"), clamped. With only the element level present, returns 0.
 * Matches Retune.tsx (defaultIndex = levels.length >= 2 ? levels.length - 2 : 0).
 */
export function defaultScopeIndex(levels: ScopeLevel[]): number {
  return Math.max(0, levels.length - 2);
}
