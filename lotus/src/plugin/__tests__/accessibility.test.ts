import { describe, it, expect } from 'vitest';
import { calculateContrastRatio, relativeLuminance } from '../accessibility/color-math';

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });

  it('returns 1 for white', () => {
    expect(relativeLuminance({ r: 1, g: 1, b: 1 })).toBeCloseTo(1, 5);
  });

  it('returns correct value for pure red', () => {
    const lum = relativeLuminance({ r: 1, g: 0, b: 0 });
    expect(lum).toBeCloseTo(0.2126, 4);
  });

  it('returns correct value for pure green', () => {
    const lum = relativeLuminance({ r: 0, g: 1, b: 0 });
    expect(lum).toBeCloseTo(0.7152, 4);
  });

  it('returns correct value for pure blue', () => {
    const lum = relativeLuminance({ r: 0, g: 0, b: 1 });
    expect(lum).toBeCloseTo(0.0722, 4);
  });

  it('handles low sRGB values (linear range)', () => {
    // Values <= 0.03928 use linear formula: c / 12.92
    const lum = relativeLuminance({ r: 0.03, g: 0.03, b: 0.03 });
    const expected = 0.2126 * (0.03 / 12.92) + 0.7152 * (0.03 / 12.92) + 0.0722 * (0.03 / 12.92);
    expect(lum).toBeCloseTo(expected, 5);
  });
});

describe('calculateContrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    const ratio = calculateContrastRatio(
      { r: 0, g: 0, b: 0 },
      { r: 1, g: 1, b: 1 },
    );
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for same color', () => {
    const color = { r: 0.5, g: 0.5, b: 0.5 };
    expect(calculateContrastRatio(color, color)).toBeCloseTo(1, 5);
  });

  it('is symmetric (fg/bg order does not matter)', () => {
    const dark = { r: 0.2, g: 0.2, b: 0.2 };
    const light = { r: 0.8, g: 0.8, b: 0.8 };
    const ratio1 = calculateContrastRatio(dark, light);
    const ratio2 = calculateContrastRatio(light, dark);
    expect(ratio1).toBeCloseTo(ratio2, 5);
  });

  it('WCAG AA threshold: 4.5:1 for normal text', () => {
    // Dark gray (#595959 = ~0.349) on white should pass AA
    const darkGray = { r: 0.349, g: 0.349, b: 0.349 };
    const white = { r: 1, g: 1, b: 1 };
    const ratio = calculateContrastRatio(darkGray, white);
    expect(ratio).toBeGreaterThan(4.5);
  });

  it('WCAG AA large text threshold: 3:1', () => {
    // Medium gray on white should pass for large text
    const medGray = { r: 0.46, g: 0.46, b: 0.46 };
    const white = { r: 1, g: 1, b: 1 };
    const ratio = calculateContrastRatio(medGray, white);
    expect(ratio).toBeGreaterThan(3);
  });

  it('detects low contrast that fails WCAG AA', () => {
    // Light gray on white should fail
    const lightGray = { r: 0.75, g: 0.75, b: 0.75 };
    const white = { r: 1, g: 1, b: 1 };
    const ratio = calculateContrastRatio(lightGray, white);
    expect(ratio).toBeLessThan(4.5);
  });
});
