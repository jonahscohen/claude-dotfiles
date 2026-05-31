import { describe, it, expect } from 'vitest';
import {
  createBackgroundTexture,
  hexToLinearRGB,
  SIMPLEX_NOISE_GLSL,
  FLUID_SHARED_GLSL,
  FLUID_SD_SEGMENT_GLSL,
} from './fluid-solver';

// The GPU sim itself (createFluidSim/stepFluidSim) needs a real WebGL renderer
// and is exercised by the halftone + fractal-glass conformance tests via their
// headless dead-guard. Here we cover the pure, GL-free pieces of the module.

describe('fluid-solver shared module', () => {
  it('createBackgroundTexture builds a correctly sized RGBA DataTexture', () => {
    const tex = createBackgroundTexture(
      { baseColor1: '#000000', baseColor2: '#1040a0', baseColor3: '#78b0dc', baseColor4: '#a0c4e8' },
      8,
      8,
      { highlight: 1, midtone: 1, shadow: 1 },
      { x: 0.5, y: 0.5 },
    );
    expect(tex.image.width).toBe(8);
    expect(tex.image.height).toBe(8);
    expect((tex.image.data as Uint8Array).length).toBe(8 * 8 * 4);
  });

  it('hexToLinearRGB maps endpoints correctly', () => {
    const [r, g, b] = hexToLinearRGB('#ffffff');
    expect(r).toBeCloseTo(1, 5);
    expect(g).toBeCloseTo(1, 5);
    expect(b).toBeCloseTo(1, 5);
    expect(hexToLinearRGB('#000000')[0]).toBe(0);
  });

  it('embeds the verbatim simplex/curl + fluid GLSL', () => {
    expect(SIMPLEX_NOISE_GLSL).toContain('curlNoise');
    expect(SIMPLEX_NOISE_GLSL).toContain('snoiseVec3');
    expect(FLUID_SHARED_GLSL).toContain('clipToSimSpace');
    expect(FLUID_SD_SEGMENT_GLSL).toContain('sdSegment');
  });
});
