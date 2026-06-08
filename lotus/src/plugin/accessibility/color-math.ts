// ── Color math utilities for accessibility checks ────────────────────────────
// Extracted for testability. These functions calculate contrast ratios and
// relative luminance per the WCAG 2.0 specification.

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function calculateContrastRatio(fg: RGB, bg: RGB): number {
  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

export function relativeLuminance(color: RGB): number {
  const [r, g, b] = [color.r, color.g, color.b].map(c => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
