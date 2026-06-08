/**
 * Inspector utilities (ported verbatim from Retune's overlay/src/utils.ts).
 * Kept local to core/inspector so the inspector layer is self-contained and
 * framework-free. Internal property keys stay camelCase; kebab conversion
 * happens only at boundaries (computed-style reads, CSS rule emission).
 */

/** Convert camelCase CSS property to kebab-case, preserving vendor prefixes */
export function camelToKebab(prop: string): string {
  // Handle vendor prefixes before converting: webkitFilter -> WebkitFilter -> -webkit-filter
  if (prop.startsWith("webkit") || prop.startsWith("moz") || prop.startsWith("ms")) {
    return "-" + prop.replace(/([A-Z])/g, "-$1").toLowerCase();
  }
  return prop.replace(/([A-Z])/g, "-$1").toLowerCase();
}

/** Truncate a string, collapsing whitespace (ported from Retune utils.ts) */
export function truncate(str: string, len: number): string {
  const cleaned = str.replace(/\s+/g, " ").trim();
  return cleaned.length > len ? cleaned.slice(0, len) + "…" : cleaned;
}
