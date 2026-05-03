# Pulsar Shader

Concentric radiating rings emanating from center with exponential decay and dual-color gradient.

## Visual Description

Bright rings pulse outward from the canvas center like a sonar or heartbeat monitor. A secondary harmonic ring (at the golden ratio frequency) adds organic complexity. Rings fade with distance via exponential decay.

## Uniforms

| Uniform | Type | Default | Description |
|---|---|---|---|
| `uFrequency` | float | 10.0 | Ring density - number of visible rings (3.0-30.0) |
| `uDecay` | float | 3.0 | Radial fade-out rate (1.0-10.0) |
| `uSpeed` | float | 2.0 | Outward propagation speed |
| `uColorStart` | vec3 | `(1.0, 0.8, 0.2)` | Color at ring peak (bright) |
| `uColorEnd` | vec3 | `(0.0, 0.0, 0.2)` | Color at ring trough (dark) |
| `uTime` | float | - | Elapsed time in seconds |
| `uResolution` | vec2 | - | Viewport dimensions in pixels |

## Usage Notes

- Output alpha equals the radial envelope - composite over a background color
- `uDecay` of 1.0 fills the full canvas with rings; 8.0+ concentrates them near center
- Negative `uSpeed` inverts direction (rings collapse inward)
- Secondary harmonic at 1.618x frequency is always on; lower its weight by editing `* 0.4` in-shader
- Use additive blending (`gl.blendFunc(ONE, ONE)`) for glow-over-dark-backgrounds look
